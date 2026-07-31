import prisma from './prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding GroupTrust database...');

  // Clean old data in dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.loanRepayment.deleteMany({});
  await prisma.loanVote.deleteMany({});
  await prisma.loanGuarantor.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.roscaRound.deleteMany({});
  await prisma.roscaCycle.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.ngo.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const ngoAdmin = await prisma.user.create({
    data: {
      name: 'Anjali Sharma',
      email: 'admin@grouptrust.com',
      phone: '+919876543210',
      passwordHash,
      role: 'NGO_ADMIN',
      isVerified: true,
      kycStatus: 'APPROVED',
    },
  });

  const secretary = await prisma.user.create({
    data: {
      name: 'Ramesh Kumar',
      email: 'secretary@grouptrust.com',
      phone: '+919876543211',
      passwordHash,
      role: 'SECRETARY',
      isVerified: true,
      kycStatus: 'APPROVED',
    },
  });

  const member1 = await prisma.user.create({
    data: {
      name: 'Sunita Devi',
      email: 'member1@grouptrust.com',
      phone: '+919876543212',
      passwordHash,
      role: 'MEMBER',
      isVerified: true,
      kycStatus: 'APPROVED',
    },
  });

  const member2 = await prisma.user.create({
    data: {
      name: 'Rajesh Patil',
      email: 'member2@grouptrust.com',
      phone: '+919876543213',
      passwordHash,
      role: 'MEMBER',
      isVerified: true,
      kycStatus: 'APPROVED',
    },
  });

  const member3 = await prisma.user.create({
    data: {
      name: 'Karan Singh',
      email: 'member3@grouptrust.com',
      phone: '+919876543214',
      passwordHash,
      role: 'MEMBER',
      isVerified: true,
      kycStatus: 'PENDING',
    },
  });

  console.log('Created Users.');

  // 2. Create NGO
  const ngo = await prisma.ngo.create({
    data: {
      name: 'TrustCare Foundation',
      description: 'Supporting financial inclusion in local communities.',
      address: '42, MG Road, Pune, Maharashtra',
      adminId: ngoAdmin.id,
    },
  });

  // 3. Create Groups
  const jlgGroup = await prisma.group.create({
    data: {
      name: 'Ekta Joint Liability Group',
      type: 'JLG',
      ngoId: ngo.id,
      secretaryId: secretary.id,
      savingsAmount: 200,
      savingsFrequency: 'WEEKLY',
      interestRate: 12.0,
    },
  });

  const roscaGroup = await prisma.group.create({
    data: {
      name: 'Kalyan ROSCA Group',
      type: 'ROSCA',
      ngoId: ngo.id,
      secretaryId: secretary.id,
      savingsAmount: 1000,
      savingsFrequency: 'MONTHLY',
      interestRate: 0,
    },
  });

  console.log('Created Groups.');

  // 4. Enroll Members
  const members = [secretary, member1, member2, member3];
  for (const m of members) {
    await prisma.groupMember.create({
      data: {
        groupId: jlgGroup.id,
        memberId: m.id,
        status: 'ACTIVE',
      },
    });

    await prisma.groupMember.create({
      data: {
        groupId: roscaGroup.id,
        memberId: m.id,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Create Meetings & Attendance
  const meeting = await prisma.meeting.create({
    data: {
      groupId: jlgGroup.id,
      title: 'Weekly Savings & Credit Meeting',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      location: 'Community Hall, Ward 4',
      gpsLat: 18.5204,
      gpsLng: 73.8567,
      minutes: 'Discussed weekly contributions. Sunita requested loan approval.',
    },
  });

  for (const m of members) {
    await prisma.attendance.create({
      data: {
        meetingId: meeting.id,
        memberId: m.id,
        status: m.id === member3.id ? 'ABSENT' : 'PRESENT',
      },
    });
  }

  // 6. Seed Transactions in strict chronological order
  let lastHash = 'GENESIS';
  const crypto = require('crypto');

  // Transaction 1: Loan Disbursement (45 days ago)
  const disburseDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const disburseContent = `${jlgGroup.id}-${member1.id}-LOAN_DISBURSEMENT-10000-${secretary.id}-${lastHash}`;
  const disburseHash = crypto.createHash('sha256').update(disburseContent).digest('hex');
  await prisma.transaction.create({
    data: {
      groupId: jlgGroup.id,
      memberId: member1.id,
      type: 'LOAN_DISBURSEMENT',
      amount: 10000,
      recorderId: secretary.id,
      paymentMethod: 'CASH',
      remarks: 'Disbursed sewing machine loan',
      receiptNumber: 'LD-' + Math.floor(100000 + Math.random() * 900000),
      transactionHash: disburseHash,
      createdAt: disburseDate,
    },
  });
  lastHash = disburseHash;

  // Transaction 2: Loan Repayment (15 days ago)
  const repayDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const repayContent = `${jlgGroup.id}-${member1.id}-LOAN_REPAYMENT-1725.48-${secretary.id}-${lastHash}`;
  const repayHash = crypto.createHash('sha256').update(repayContent).digest('hex');
  await prisma.transaction.create({
    data: {
      groupId: jlgGroup.id,
      memberId: member1.id,
      type: 'LOAN_REPAYMENT',
      amount: 1725.48,
      recorderId: secretary.id,
      paymentMethod: 'CASH',
      remarks: 'EMI 1 payment',
      receiptNumber: 'LR-' + Math.floor(100000 + Math.random() * 900000),
      transactionHash: repayHash,
      createdAt: repayDate,
    },
  });
  lastHash = repayHash;

  // Transactions 3-6: Savings (10 to 7 days ago)
  const txsData = [
    { memberId: member1.id, amount: 200, remarks: 'Week 1 Savings', daysAgo: 10 },
    { memberId: member2.id, amount: 200, remarks: 'Week 1 Savings', daysAgo: 9 },
    { memberId: member1.id, amount: 200, remarks: 'Week 2 Savings', daysAgo: 8 },
    { memberId: member2.id, amount: 200, remarks: 'Week 2 Savings', daysAgo: 7 },
  ];

  for (const tx of txsData) {
    const txDate = new Date(Date.now() - tx.daysAgo * 24 * 60 * 60 * 1000);
    const content = `${jlgGroup.id}-${tx.memberId}-SAVINGS-${tx.amount}-${secretary.id}-${lastHash}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    await prisma.transaction.create({
      data: {
        groupId: jlgGroup.id,
        memberId: tx.memberId,
        type: 'SAVINGS',
        amount: tx.amount,
        recorderId: secretary.id,
        paymentMethod: 'CASH',
        remarks: tx.remarks,
        receiptNumber: 'GT-' + Math.floor(100000 + Math.random() * 900000),
        transactionHash: hash,
        createdAt: txDate,
      },
    });
    lastHash = hash;
  }

  console.log('Seeded Savings & Loan Transactions.');

  // 7. Seed Loans
  const sunitaLoan = await prisma.loan.create({
    data: {
      groupId: jlgGroup.id,
      borrowerId: member1.id,
      principal: 10000,
      interestRate: 12.0,
      durationMonths: 6,
      emiAmount: 1725.48,
      status: 'ACTIVE',
      purpose: 'Purchase sewing machine for home business',
      approvedById: secretary.id,
      createdAt: disburseDate,
    },
  });

  await prisma.loanGuarantor.create({
    data: {
      loanId: sunitaLoan.id,
      guarantorId: member2.id,
      status: 'ACTIVE',
    },
  });

  const repaymentInterest = Math.round((10000 * (12.0 / 12) / 100) * 100) / 100;
  const repaymentPrincipal = 1725.48 - repaymentInterest;

  await prisma.loanRepayment.create({
    data: {
      loanId: sunitaLoan.id,
      amount: 1725.48,
      principalPaid: repaymentPrincipal,
      interestPaid: repaymentInterest,
      date: repayDate,
    },
  });

  const pendingLoan = await prisma.loan.create({
    data: {
      groupId: jlgGroup.id,
      borrowerId: member2.id,
      principal: 5000,
      interestRate: 12.0,
      durationMonths: 4,
      emiAmount: 1281.33,
      status: 'PENDING_APPROVAL',
      purpose: 'Buy seeds and fertilizers for farm',
    },
  });

  await prisma.loanGuarantor.create({
    data: {
      loanId: pendingLoan.id,
      guarantorId: member1.id,
      status: 'ACTIVE',
    },
  });

  await prisma.loanVote.create({
    data: {
      loanId: pendingLoan.id,
      memberId: member1.id,
      vote: 'APPROVE',
    },
  });

  console.log('Seeded Loan Applications.');

  // 8. Seed ROSCA Cycles
  const roscaCycle = await prisma.roscaCycle.create({
    data: {
      groupId: roscaGroup.id,
      contributionAmount: 1000,
      cycleDurationDays: 30,
      currentRound: 2,
      status: 'ACTIVE',
    },
  });

  await prisma.roscaRound.create({
    data: {
      roscaCycleId: roscaCycle.id,
      roundNumber: 1,
      recipientId: member1.id,
      drawMethod: 'LOTTERY',
      payoutAmount: 4000,
      payoutStatus: 'PAID',
    },
  });

  // Transaction 7: ROSCA Payout (today)
  const roscaPayoutDate = new Date();
  const roscaPayoutContent = `${roscaGroup.id}-${member1.id}-ROSCA_PAYOUT-4000-${secretary.id}-${lastHash}`;
  const roscaPayoutHash = crypto.createHash('sha256').update(roscaPayoutContent).digest('hex');
  await prisma.transaction.create({
    data: {
      groupId: roscaGroup.id,
      memberId: member1.id,
      type: 'ROSCA_PAYOUT',
      amount: 4000,
      recorderId: secretary.id,
      paymentMethod: 'CASH',
      remarks: 'ROSCA Round 1 Winner payout',
      receiptNumber: 'RP-' + Math.floor(100000 + Math.random() * 900000),
      transactionHash: roscaPayoutHash,
      createdAt: roscaPayoutDate,
    },
  });
  lastHash = roscaPayoutHash;

  // 9. Write System Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: ngoAdmin.id,
      action: 'SYSTEM_SEED',
      details: 'GroupTrust mock database seeded successfully',
    },
  });

  console.log('GroupTrust database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
