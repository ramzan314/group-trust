import prisma from '../prisma';
import * as crypto from 'crypto';

export async function calculateTransactionHash(details: {
  groupId: string;
  memberId: string;
  type: string;
  amount: number;
  recorderId: string;
}): Promise<string> {
  const lastTx = await prisma.transaction.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  const prevHash = lastTx ? lastTx.transactionHash : 'GENESIS';
  
  const content = `${details.groupId}-${details.memberId}-${details.type}-${details.amount}-${details.recorderId}-${prevHash}`;
  
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function logSystemActivity(userId: string | null, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
