import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { logSystemActivity } from '../utils/audit';

const router = Router();

const CreateGroupSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['ROSCA', 'JLG', 'SHG']),
  secretaryId: z.string().optional(),
  secretaryEmail: z.string().email().optional(),
  secretaryName: z.string().optional(),
  secretaryPhone: z.string().optional(),
  secretaryPassword: z.string().optional(),
  savingsAmount: z.number().positive(),
  savingsFrequency: z.enum(['WEEKLY', 'MONTHLY']),
  interestRate: z.number().nonnegative(),
  ngoId: z.string().optional(),
});

// Create Group
router.post('/', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const validated = CreateGroupSchema.parse(req.body);
    
    // Resolve or create secretary
    let secretaryUser = null;

    // 1. If explicitly choosing an existing secretary by ID
    if (validated.secretaryId) {
      secretaryUser = await prisma.user.findUnique({ where: { id: validated.secretaryId } });
    }

    // 2. If creating a new secretary or looking up by email
    if (!secretaryUser && validated.secretaryEmail) {
      secretaryUser = await prisma.user.findUnique({ where: { email: validated.secretaryEmail } });

      // If user does not exist and name/password are provided, create new secretary account
      if (!secretaryUser && (validated.secretaryName || validated.secretaryPassword)) {
        const passwordHash = await bcrypt.hash(validated.secretaryPassword || 'password123', 10);
        secretaryUser = await prisma.user.create({
          data: {
            name: validated.secretaryName || 'Group Secretary',
            email: validated.secretaryEmail,
            phone: validated.secretaryPhone || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            passwordHash,
            role: 'SECRETARY',
            isVerified: true,
            kycStatus: 'APPROVED',
          },
        });
      }
    }

    // 3. Fallbacks
    if (!secretaryUser && authReq.user!.role === 'SECRETARY') {
      secretaryUser = await prisma.user.findUnique({ where: { id: authReq.user!.id } });
    }
    if (!secretaryUser) {
      secretaryUser = await prisma.user.findFirst({ where: { role: 'SECRETARY' } });
    }

    if (!secretaryUser) {
      return res.status(400).json({ error: 'Secretary not found. Please provide a valid secretary or specify details to create one.' });
    }

    // Automatically link to the NGO administered by the logged-in NGO Admin
    let assignedNgoId = validated.ngoId || null;
    if (!assignedNgoId && authReq.user!.role === 'NGO_ADMIN') {
      const ngo = await prisma.ngo.findFirst({ where: { adminId: authReq.user!.id } });
      if (ngo) {
        assignedNgoId = ngo.id;
      }
    }

    const group = await prisma.group.create({
      data: {
        name: validated.name,
        type: validated.type,
        ngoId: assignedNgoId,
        secretaryId: secretaryUser.id,
        savingsAmount: validated.savingsAmount,
        savingsFrequency: validated.savingsFrequency,
        interestRate: validated.interestRate,
      },
      include: {
        secretary: { select: { id: true, name: true, email: true } },
        ngo: true,
        _count: { select: { members: true } },
      },
    });

    // Automatically make the secretary a group member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        memberId: secretaryUser.id,
        status: 'ACTIVE',
      },
    });

    await logSystemActivity(authReq.user!.id, 'GROUP_CREATE', `Created group ${group.name} (${group.type})`);
    return res.status(201).json(group);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create group' });
  }
});

// List Groups (based on role)
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id: userId, role } = authReq.user!;

  try {
    let groups;
    if (role === 'NGO_ADMIN') {
      const ngos = await prisma.ngo.findMany({ where: { adminId: userId } });
      const ngoIds = ngos.map((n) => n.id);
      
      groups = await prisma.group.findMany({
        where: {
          OR: [
            { ngoId: { in: ngoIds } },
            { ngoId: null },
            { secretaryId: userId }
          ],
        },
        include: {
          secretary: { select: { id: true, name: true, email: true } },
          ngo: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'SECRETARY') {
      groups = await prisma.group.findMany({
        where: { secretaryId: userId },
        include: {
          secretary: { select: { id: true, name: true, email: true } },
          ngo: true,
          _count: { select: { members: true } },
        },
      });
    } else {
      const memberships = await prisma.groupMember.findMany({
        where: { memberId: userId },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);

      groups = await prisma.group.findMany({
        where: { id: { in: groupIds } },
        include: {
          secretary: { select: { id: true, name: true, email: true } },
          ngo: true,
          _count: { select: { members: true } },
        },
      });
    }
    return res.json(groups);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// List available secretaries for appointment
router.get('/secretaries', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const secretaries = await prisma.user.findMany({
      where: { role: 'SECRETARY' },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    });
    return res.json(secretaries);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch secretaries' });
  }
});

// Member joins a group using Group ID
router.post('/join', authenticateJWT, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;
  const { groupId } = req.body;

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is required to join' });
  }

  try {
    const cleanId = String(groupId).trim();
    const group = await prisma.group.findUnique({
      where: { id: cleanId },
      include: { secretary: { select: { name: true, phone: true } } },
    });

    if (!group) {
      return res.status(404).json({ error: 'No group found with this Group ID. Please check with your Secretary.' });
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId: group.id, memberId: userId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: `You are already a member of "${group.name}".` });
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        memberId: userId,
        status: 'ACTIVE',
      },
      include: {
        group: true,
      },
    });

    await logSystemActivity(userId, 'MEMBER_JOIN_GROUP', `Member joined group ${group.name} (${group.id})`);
    return res.status(201).json({ message: `Successfully joined ${group.name}!`, membership, group });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to join group' });
  }
});

// Get Group Detail
router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        secretary: { select: { id: true, name: true, phone: true, email: true } },
        ngo: true,
        members: {
          include: {
            member: { select: { id: true, name: true, email: true, phone: true, kycStatus: true, createdAt: true } },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    return res.json(group);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Add or create member in group (Secretary or NGO Admin)
router.post('/:id/members', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id: groupId } = req.params;
  const { memberId, email, phone, name, password } = req.body;

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    let targetUser = null;

    // 1. By memberId
    if (memberId) {
      targetUser = await prisma.user.findUnique({ where: { id: memberId } });
    }

    // 2. By email or phone
    if (!targetUser && email) {
      targetUser = await prisma.user.findFirst({ where: { email: String(email).trim().toLowerCase() } });
    }
    if (!targetUser && phone) {
      targetUser = await prisma.user.findFirst({ where: { phone: String(phone).trim() } });
    }

    // 3. Create brand new member account if not found
    if (!targetUser && (name || email || phone)) {
      const memberEmail = email ? String(email).trim().toLowerCase() : `member_${Date.now()}@grouptrust.com`;
      const memberPhone = phone ? String(phone).trim() : `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const passwordHash = await bcrypt.hash(password || 'password123', 10);

      targetUser = await prisma.user.create({
        data: {
          name: name || 'Group Member',
          email: memberEmail,
          phone: memberPhone,
          passwordHash,
          role: 'MEMBER',
          isVerified: true,
          kycStatus: 'APPROVED',
        },
      });
    }

    if (!targetUser) {
      return res.status(400).json({ error: 'Member not found. Please provide valid member details.' });
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId, memberId: targetUser.id },
      },
    });

    if (existing) {
      return res.status(400).json({ error: `${targetUser.name} is already a member of this group` });
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId,
        memberId: targetUser.id,
        status: 'ACTIVE',
      },
      include: {
        member: { select: { id: true, name: true, email: true, phone: true, kycStatus: true, createdAt: true } },
      },
    });

    const authReq = req as AuthenticatedRequest;
    await logSystemActivity(authReq.user!.id, 'GROUP_ADD_MEMBER', `Added user ${targetUser.name} (${targetUser.id}) to group ${groupId}`);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to add member' });
  }
});

// Remove member from group
router.delete('/:id/members/:memberId', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id: groupId, memberId } = req.params;
  try {
    await prisma.groupMember.delete({
      where: {
        groupId_memberId: { groupId, memberId },
      },
    });
    const authReq = req as AuthenticatedRequest;
    await logSystemActivity(authReq.user!.id, 'GROUP_REMOVE_MEMBER', `Removed user ${memberId} from group ${groupId}`);
    return res.json({ success: true, message: 'Member removed from group' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

// NGO Admin verify/approve KYC
router.post('/members/:memberId/kyc', authenticateJWT, requireRole(['NGO_ADMIN']), async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { status, remarks } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: memberId },
      data: { kycStatus: status },
    });

    const authReq = req as AuthenticatedRequest;
    await logSystemActivity(authReq.user!.id, 'MEMBER_KYC_VERIFICATION', `Set KYC status for ${user.name} (${memberId}) to ${status}. Remarks: ${remarks || 'none'}`);
    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to verify KYC' });
  }
});

export default router;
