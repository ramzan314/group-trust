import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { calculateTransactionHash, logSystemActivity } from '../utils/audit';

const router = Router();

const StartRoscaSchema = z.object({
  groupId: z.string(),
  contributionAmount: z.number().positive(),
  cycleDurationDays: z.number().int().positive(),
});

// Initialize a ROSCA cycle
router.post('/cycles', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const validated = StartRoscaSchema.parse(req.body);

    const group = await prisma.group.findUnique({
      where: { id: validated.groupId },
      include: { members: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.type !== 'ROSCA') {
      return res.status(400).json({ error: 'This group is not of type ROSCA' });
    }

    if (group.members.length < 2) {
      return res.status(400).json({ error: 'ROSCA group must have at least 2 members' });
    }

    const cycle = await prisma.roscaCycle.create({
      data: {
        groupId: validated.groupId,
        contributionAmount: validated.contributionAmount,
        cycleDurationDays: validated.cycleDurationDays,
        currentRound: 1,
        status: 'ACTIVE',
      },
    });

    await logSystemActivity(authReq.user!.id, 'ROSCA_CYCLE_START', `Started ROSCA cycle ${cycle.id} for group ${group.name}`);
    return res.status(201).json(cycle);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'ROSCA start failed' });
  }
});

// Draw ROSCA Round Winner
router.post('/cycles/:id/draw', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { drawMethod, recipientId } = req.body;
  const authReq = req as AuthenticatedRequest;

  if (!['LOTTERY', 'MANUAL'].includes(drawMethod)) {
    return res.status(400).json({ error: 'drawMethod must be LOTTERY or MANUAL' });
  }

  try {
    const cycle = await prisma.roscaCycle.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            members: {
              include: { member: true },
            },
          },
        },
        rounds: true,
      },
    });

    if (!cycle) return res.status(404).json({ error: 'ROSCA cycle not found' });
    if (cycle.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'ROSCA cycle is not active' });
    }

    const allMembers = cycle.group.members.map((m) => m.member);
    const pastWinners = cycle.rounds.map((r) => r.recipientId);
    const nonWinners = allMembers.filter((m) => !pastWinners.includes(m.id));

    if (nonWinners.length === 0) {
      await prisma.roscaCycle.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      return res.status(400).json({ error: 'All members have already won in this cycle. Cycle completed.' });
    }

    let winnerId = '';
    if (drawMethod === 'LOTTERY') {
      const randIdx = Math.floor(Math.random() * nonWinners.length);
      winnerId = nonWinners[randIdx].id;
    } else {
      if (!recipientId) return res.status(400).json({ error: 'recipientId is required for manual draw' });
      if (!nonWinners.some((w) => w.id === recipientId)) {
        return res.status(400).json({ error: 'Selected recipient is invalid or has already won' });
      }
      winnerId = recipientId;
    }

    const roundNumber = cycle.rounds.length + 1;
    const payoutAmount = allMembers.length * cycle.contributionAmount;

    const round = await prisma.roscaRound.create({
      data: {
        roscaCycleId: id,
        roundNumber,
        recipientId: winnerId,
        drawMethod,
        payoutAmount,
        payoutStatus: 'PAID',
      },
      include: { recipient: { select: { id: true, name: true } } },
    });

    const receiptNumber = 'RP-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString().slice(-4);
    const transactionHash = await calculateTransactionHash({
      groupId: cycle.groupId,
      memberId: winnerId,
      type: 'ROSCA_PAYOUT',
      amount: payoutAmount,
      recorderId: authReq.user!.id,
    });

    await prisma.transaction.create({
      data: {
        groupId: cycle.groupId,
        memberId: winnerId,
        type: 'ROSCA_PAYOUT',
        amount: payoutAmount,
        recorderId: authReq.user!.id,
        paymentMethod: 'CASH',
        remarks: `ROSCA Payout for Cycle ${id} Round ${roundNumber}`,
        receiptNumber,
        transactionHash,
      },
    });

    const remainingCount = nonWinners.length - 1;
    const nextRound = roundNumber + 1;
    await prisma.roscaCycle.update({
      where: { id },
      data: {
        currentRound: nextRound,
        status: remainingCount === 0 ? 'COMPLETED' : 'ACTIVE',
      },
    });

    await logSystemActivity(authReq.user!.id, 'ROSCA_DRAW', `Drew winner ${winnerId} for round ${roundNumber} in cycle ${id}`);
    return res.json({ round, isCycleCompleted: remainingCount === 0 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'ROSCA draw failed' });
  }
});

// Get rounds history for a cycle
router.get('/cycles/:id/rounds', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const rounds = await prisma.roscaRound.findMany({
      where: { roscaCycleId: id },
      include: { recipient: { select: { id: true, name: true, phone: true } } },
      orderBy: { roundNumber: 'asc' },
    });
    return res.json(rounds);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// List all ROSCA cycles for a group
router.get('/cycles', authenticateJWT, async (req: Request, res: Response) => {
  const { groupId } = req.query;
  try {
    const cycles = await prisma.roscaCycle.findMany({
      where: groupId ? { groupId: String(groupId) } : {},
      include: {
        group: { select: { name: true } },
        rounds: { include: { recipient: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(cycles);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch ROSCA cycles' });
  }
});

export default router;
