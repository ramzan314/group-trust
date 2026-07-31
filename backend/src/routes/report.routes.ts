import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Financial Summary Report
router.get('/summary', authenticateJWT, async (req: Request, res: Response) => {
  const { groupId } = req.query;

  try {
    const filter: any = {};
    if (groupId) {
      filter.groupId = String(groupId);
    }

    const savingsAgg = await prisma.transaction.aggregate({
      where: {
        ...filter,
        type: 'SAVINGS',
        isReversed: false,
      },
      _sum: { amount: true },
    });
    const totalSavings = savingsAgg._sum.amount || 0;

    const activeLoans = await prisma.loan.findMany({
      where: {
        ...filter,
        status: { in: ['ACTIVE', 'DEFAULTED'] },
      },
      include: { repayments: true },
    });

    const totalPrincipal = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalRepaid = activeLoans.reduce((sum, loan) => {
      const repaid = loan.repayments.reduce((s, r) => s + r.principalPaid, 0);
      return sum + repaid;
    }, 0);
    const totalActiveCredit = totalPrincipal - totalRepaid;

    const totalLoansCount = await prisma.loan.count({ where: filter });
    const defaultedLoansCount = await prisma.loan.count({
      where: {
        ...filter,
        status: 'DEFAULTED',
      },
    });

    const defaultRate = totalLoansCount > 0 ? Math.round((defaultedLoansCount / totalLoansCount) * 100) : 0;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...filter,
        isReversed: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyCashflow: { [key: string]: { savings: number; loans: number; repayments: number } } = {};
    transactions.forEach((tx) => {
      const date = new Date(tx.createdAt);
      const monthKey = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear().toString().slice(-2);
      
      if (!monthlyCashflow[monthKey]) {
        monthlyCashflow[monthKey] = { savings: 0, loans: 0, repayments: 0 };
      }

      if (tx.type === 'SAVINGS') {
        monthlyCashflow[monthKey].savings += tx.amount;
      } else if (tx.type === 'LOAN_DISBURSEMENT') {
        monthlyCashflow[monthKey].loans += tx.amount;
      } else if (tx.type === 'LOAN_REPAYMENT') {
        monthlyCashflow[monthKey].repayments += tx.amount;
      }
    });

    const cashflowChart = Object.keys(monthlyCashflow).map((key) => ({
      month: key,
      savings: monthlyCashflow[key].savings,
      loans: monthlyCashflow[key].loans,
      repayments: monthlyCashflow[key].repayments,
    }));

    return res.json({
      totalSavings,
      totalActiveCredit,
      defaultRate,
      cashflowChart,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate financial summary' });
  }
});

// Defaulters List
router.get('/defaulters', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { groupId } = req.query;

  try {
    const filter: any = {
      status: { in: ['ACTIVE', 'DEFAULTED'] },
    };
    if (groupId) {
      filter.groupId = String(groupId);
    }

    const loans = await prisma.loan.findMany({
      where: filter,
      include: {
        borrower: { select: { id: true, name: true, phone: true } },
        repayments: true,
      },
    });

    const defaulters = loans.map((loan) => {
      const principalPaid = loan.repayments.reduce((sum, r) => sum + r.principalPaid, 0);
      const interestPaid = loan.repayments.reduce((sum, r) => sum + r.interestPaid, 0);
      const totalPaid = principalPaid + interestPaid;
      const balance = loan.principal - principalPaid;

      const missedEMIs = Math.max(0, Math.floor((Date.now() - new Date(loan.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)) - loan.repayments.length);

      return {
        loanId: loan.id,
        borrower: loan.borrower,
        principal: loan.principal,
        emiAmount: loan.emiAmount,
        totalPaid,
        balance,
        status: loan.status,
        missedEMIs: loan.status === 'DEFAULTED' ? Math.max(1, missedEMIs) : missedEMIs,
      };
    }).filter((d) => d.status === 'DEFAULTED' || d.missedEMIs > 0);

    return res.json(defaulters);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch defaulters' });
  }
});

export default router;
