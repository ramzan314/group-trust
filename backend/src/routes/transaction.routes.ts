import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { calculateTransactionHash, logSystemActivity } from '../utils/audit';

const router = Router();

const CreateTransactionSchema = z.object({
  groupId: z.string(),
  memberId: z.string(),
  type: z.enum(['SAVINGS', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE', 'ROSCA_CONTRIBUTION', 'ROSCA_PAYOUT']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  remarks: z.string().optional(),
});

// Record a new transaction
router.post('/', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const validated = CreateTransactionSchema.parse(req.body);

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId: validated.groupId,
          memberId: validated.memberId,
        },
      },
    });

    if (!membership) {
      return res.status(400).json({ error: 'User is not a member of this group' });
    }

    const receiptNumber = 'GT-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString().slice(-4);

    const transactionHash = await calculateTransactionHash({
      groupId: validated.groupId,
      memberId: validated.memberId,
      type: validated.type,
      amount: validated.amount,
      recorderId: authReq.user!.id,
    });

    const transaction = await prisma.transaction.create({
      data: {
        groupId: validated.groupId,
        memberId: validated.memberId,
        type: validated.type,
        amount: validated.amount,
        recorderId: authReq.user!.id,
        paymentMethod: validated.paymentMethod,
        remarks: validated.remarks || null,
        receiptNumber,
        transactionHash,
        approvalStatus: 'APPROVED',
      },
    });

    await logSystemActivity(
      authReq.user!.id,
      'TRANSACTION_RECORD',
      `Recorded ${validated.type} of amount ${validated.amount} for member ${validated.memberId} in group ${validated.groupId}`
    );

    return res.status(201).json(transaction);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Transaction record failed' });
  }
});

// Get transactions (filterable)
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  const { groupId, memberId } = req.query;

  try {
    const whereClause: any = {};
    if (groupId) whereClause.groupId = String(groupId);
    if (memberId) whereClause.memberId = String(memberId);

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        member: { select: { id: true, name: true, phone: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(transactions);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Reverse a transaction (marks it as reversed in the ledger, does not delete)
router.post('/:id/reverse', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const authReq = req as AuthenticatedRequest;

  try {
    const originalTx = await prisma.transaction.findUnique({ where: { id } });
    if (!originalTx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (originalTx.isReversed) {
      return res.status(400).json({ error: 'Transaction is already reversed' });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        isReversed: true,
        reversedById: authReq.user!.id,
      },
    });

    const reversalReceiptNumber = 'REV-' + originalTx.receiptNumber;
    const reversalHash = await calculateTransactionHash({
      groupId: originalTx.groupId,
      memberId: originalTx.memberId,
      type: originalTx.type,
      amount: -originalTx.amount,
      recorderId: authReq.user!.id,
    });

    await prisma.transaction.create({
      data: {
        groupId: originalTx.groupId,
        memberId: originalTx.memberId,
        type: originalTx.type,
        amount: -originalTx.amount,
        recorderId: authReq.user!.id,
        paymentMethod: originalTx.paymentMethod,
        remarks: `Reversal of receipt ${originalTx.receiptNumber}`,
        receiptNumber: reversalReceiptNumber,
        transactionHash: reversalHash,
        approvalStatus: 'APPROVED',
      },
    });

    await logSystemActivity(
      authReq.user!.id,
      'TRANSACTION_REVERSAL',
      `Reversed transaction ${id} (receipt ${originalTx.receiptNumber})`
    );

    return res.json(updatedTx);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reverse transaction' });
  }
});

export default router;
