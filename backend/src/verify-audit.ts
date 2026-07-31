import prisma from './prisma';
import * as crypto from 'crypto';

async function verifyLedger() {
  console.log('Initiating GroupTrust ledger verification...');

  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) {
      console.log('Verification status: OK (No transactions found in ledger).');
      return;
    }

    let runningHash = 'GENESIS';
    let failures = 0;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      
      // Calculate what the hash should be using the previous running hash
      const content = `${tx.groupId}-${tx.memberId}-${tx.type}-${tx.amount}-${tx.recorderId}-${runningHash}`;
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

      if (tx.transactionHash !== expectedHash) {
        console.error(`\x1b[31m[MALFUNCTION] Block #${i} compromised! Receipt Number: ${tx.receiptNumber}\x1b[0m`);
        console.error(`  Expected: ${expectedHash}`);
        console.error(`  Found:    ${tx.transactionHash}`);
        failures++;
      } else {
        console.log(`[VERIFIED] Block #${i} (${tx.receiptNumber}) is valid.`);
      }

      runningHash = tx.transactionHash;
    }

    if (failures === 0) {
      console.log('\n\x1b[32m[AUDIT SUCCESS] Hashing link sequence is 100% unbroken. Transaction history is immutable.\x1b[0m\n');
    } else {
      console.error(`\n\x1b[31m[AUDIT FAIL] Found ${failures} compromised blocks! Ledger integrity compromised.\x1b[0m\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Audit verification execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLedger();
