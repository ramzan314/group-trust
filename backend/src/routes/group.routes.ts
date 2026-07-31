import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { logSystemActivity } from '../utils/audit';

const router = Router();

const CreateGroupSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['ROSCA', 'JLG', 'SHG']),
  secretaryId: z.string(),
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
    
    const secretary = await prisma.user.findUnique({ where: { id: validated.secretaryId } });
    if (!secretary || secretary.role !== 'SECRETARY') {
      return res.status(400).json({ error: 'Invalid secretary selected' });
    }

    const group = await prisma.group.create({
      data: {
        name: validated.name,
        type: validated.type,
        ngoId: validated.ngoId || null,
        secretaryId: validated.secretaryId,
        savingsAmount: validated.savingsAmount,
        savingsFrequency: validated.savingsFrequency,
        interestRate: validated.interestRate,
      },
    });

    // Automatically make the secretary a group member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        memberId: validated.secretaryId,
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
            { secretaryId: userId }
          ],
        },
        include: {
          secretary: { select: { id: true, name: true, email: true } },
          ngo: true,
          _count: { select: { members: true } },
        },
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
            member: { select: { id: true, name: true, email: true, phone: true, kycStatus: true } },
          },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    return res.json(group);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Add member to group
router.post('/:id/members', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id: groupId } = req.params;
  const { memberId } = req.body;

  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: memberId } });
    if (!user) return res.status(400).json({ error: 'User does not exist' });

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId, memberId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId,
        memberId,
        status: 'ACTIVE',
      },
    });

    const authReq = req as AuthenticatedRequest;
    await logSystemActivity(authReq.user!.id, 'GROUP_ADD_MEMBER', `Added user ${memberId} to group ${groupId}`);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to add member' });
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
