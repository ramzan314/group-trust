import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { calculateTransactionHash, logSystemActivity } from '../utils/audit';

const router = Router();

const ApplyLoanSchema = z.object({
  groupId: z.string(),
  principal: z.number().positive(),
  durationMonths: z.number().int().positive(),
  purpose: z.string().min(3),
  guarantorIds: z.array(z.string()).min(1),
});

// Apply for a loan
router.post('/', authenticateJWT, requireRole(['MEMBER']), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const borrowerId = authReq.user!.id;

  try {
    const validated = ApplyLoanSchema.parse(req.body);

    const group = await prisma.group.findUnique({ where: { id: validated.groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const annualRate = group.interestRate;
    const monthlyRate = (annualRate / 12) / 100;
    const duration = validated.durationMonths;
    let emi = validated.principal / duration;
    if (monthlyRate > 0) {
      emi = (validated.principal * monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
    }
    
    const emiAmount = Math.round(emi * 100) / 100;

    const loan = await prisma.loan.create({
      data: {
        groupId: validated.groupId,
        borrowerId,
        principal: validated.principal,
        interestRate: annualRate,
        durationMonths: duration,
        emiAmount,
        purpose: validated.purpose,
        status: 'PENDING_APPROVAL',
      },
    });

    const guarantorsData = validated.guarantorIds.map((gId) => ({
      loanId: loan.id,
      guarantorId: gId,
      status: 'ACTIVE',
    }));
    await prisma.loanGuarantor.createMany({ data: guarantorsData });

    await logSystemActivity(borrowerId, 'LOAN_APPLY', `Applied for loan ${loan.id} of principal ${validated.principal}`);
    return res.status(201).json(loan);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Loan application failed' });
  }
});

// Vote on a loan
router.post('/:id/vote', authenticateJWT, requireRole(['MEMBER']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { vote } = req.body;
  const authReq = req as AuthenticatedRequest;
  const memberId = authReq.user!.id;

  if (!['APPROVE', 'REJECT'].includes(vote)) {
    return res.status(400).json({ error: 'Vote must be APPROVE or REJECT' });
  }

  try {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: loan.groupId, memberId } },
    });
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const existingVote = await prisma.loanVote.findFirst({
      where: { loanId: id, memberId },
    });

    let loanVote;
    if (existingVote) {
      loanVote = await prisma.loanVote.update({
        where: { id: existingVote.id },
        data: { vote },
      });
    } else {
      loanVote = await prisma.loanVote.create({
        data: { loanId: id, memberId, vote },
      });
    }

    await logSystemActivity(memberId, 'LOAN_VOTE', `Voted ${vote} on loan ${id}`);
    return res.json(loanVote);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Approve a loan (disburse)
router.post('/:id/approve', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const authReq = req as AuthenticatedRequest;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Loan is not in pending approval state' });
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById: authReq.user!.id,
      },
    });

    const receiptNumber = 'LD-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString().slice(-4);
    const transactionHash = await calculateTransactionHash({
      groupId: loan.groupId,
      memberId: loan.borrowerId,
      type: 'LOAN_DISBURSEMENT',
      amount: loan.principal,
      recorderId: authReq.user!.id,
    });

    await prisma.transaction.create({
      data: {
        groupId: loan.groupId,
        memberId: loan.borrowerId,
        type: 'LOAN_DISBURSEMENT',
        amount: loan.principal,
        recorderId: authReq.user!.id,
        paymentMethod: 'CASH',
        remarks: `Disbursed loan ${loan.id}`,
        receiptNumber,
        transactionHash,
      },
    });

    await logSystemActivity(authReq.user!.id, 'LOAN_APPROVE', `Approved loan ${id} & recorded disbursement`);
    return res.json(updatedLoan);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// Repay loan EMI
router.post('/:id/repay', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;
  const authReq = req as AuthenticatedRequest;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Repayment amount must be greater than zero' });
  }

  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { repayments: true },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
      return res.status(400).json({ error: 'Loan is not in active or defaulted state' });
    }

    const totalRepaid = loan.repayments.reduce((acc, r) => acc + r.principalPaid, 0);
    const remainingPrincipal = loan.principal - totalRepaid;

    const monthlyRate = (loan.interestRate / 12) / 100;
    const interestPaid = Math.min(amount, Math.round((remainingPrincipal * monthlyRate) * 100) / 100);
    const principalPaid = Math.min(amount - interestPaid, remainingPrincipal);

    const repayment = await prisma.loanRepayment.create({
      data: {
        loanId: id,
        amount,
        principalPaid,
        interestPaid,
      },
    });

    const receiptNumber = 'LR-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString().slice(-4);
    const transactionHash = await calculateTransactionHash({
      groupId: loan.groupId,
      memberId: loan.borrowerId,
      type: 'LOAN_REPAYMENT',
      amount,
      recorderId: authReq.user!.id,
    });

    await prisma.transaction.create({
      data: {
        groupId: loan.groupId,
        memberId: loan.borrowerId,
        type: 'LOAN_REPAYMENT',
        amount,
        recorderId: authReq.user!.id,
        paymentMethod: 'CASH',
        remarks: `Repayment for loan ${loan.id}`,
        receiptNumber,
        transactionHash,
      },
    });

    if (totalRepaid + principalPaid >= loan.principal) {
      await prisma.loan.update({
        where: { id },
        data: { status: 'REPAID' },
      });
    }

    await logSystemActivity(authReq.user!.id, 'LOAN_REPAY', `Recorded repayment of ${amount} for loan ${id}`);
    return res.json(repayment);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record repayment' });
  }
});

// List all loans (filterable)
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  const { groupId, borrowerId } = req.query;
  try {
    const whereClause: any = {};
    if (groupId) whereClause.groupId = String(groupId);
    if (borrowerId) whereClause.borrowerId = String(borrowerId);

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        borrower: { select: { id: true, name: true, phone: true } },
        guarantors: { include: { loan: true } },
        votes: { include: { user: { select: { name: true } } } },
        repayments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(loans);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

export default router;
