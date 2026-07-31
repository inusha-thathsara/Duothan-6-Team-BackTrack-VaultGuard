import { PrismaClient, UserRole, AccountType, AccountStatus, TransactionType, TransactionStatus, SagaStatus, PayeeType, LoanStatus, ScheduleStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VaultGuard database scenario seeding...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.deadLetterEntry.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.repaymentSchedule.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payee.deleteMany();
  await prisma.account.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.trustedDevice.deleteMany();
  await prisma.mfaFactor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.backupIdentity.deleteMany();

  // 2. Seed Surviving Backup Identities (§2.4 & §5.2)
  console.log('📋 Seeding Backup Identities...');
  const backupIdentities = [
    { nationalId: '200012345678', fullName: 'Kamal Perera' },
    { nationalId: '199887654321', fullName: 'Nimali Fernando' },
    { nationalId: '198512341234', fullName: 'Ruwan Silva' },
    { nationalId: '199512345678', fullName: 'Alex Mercer' },
  ];

  for (const identity of backupIdentities) {
    await prisma.backupIdentity.create({
      data: identity,
    });
  }
  console.log(`✅ Seeded ${backupIdentities.length} backup identity records.`);

  // 3. Password Hashes
  const defaultPasswordHash = crypto.createHash('sha256').update('VaultGuard@2065').digest('hex');
  const operatorPasswordHash = crypto.createHash('sha256').update('Operator@2065').digest('hex');

  // 4. Seed Demo Users & Accounts
  console.log('👤 Seeding Demo Users and Accounts...');

  // Demo Customer 1: Kamal Perera (Main Demo Account)
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '200012345678',
      fullName: 'Kamal Perera',
      phoneNumber: '+94771234567',
      role: UserRole.CUSTOMER,
      mfaEnabled: true,
      accounts: {
        create: [
          {
            accountNumber: 'VG-SAV-001234',
            type: AccountType.SAVINGS,
            balance: 250000.00,
            currency: 'LKR',
            status: AccountStatus.ACTIVE,
            dailyLimit: 500000.00,
            singleLimit: 250000.00,
          },
          {
            accountNumber: 'VG-CHK-001235',
            type: AccountType.CHECKING,
            balance: 75000.50,
            currency: 'LKR',
            status: AccountStatus.ACTIVE,
            dailyLimit: 1000000.00,
            singleLimit: 500000.00,
          },
        ],
      },
      mfaFactors: {
        create: {
          secret: 'JBSWY3DPEHPK3PXP', // Demo TOTP secret
          backupCodes: ['1234-5678', '8765-4321', '9988-7766'],
          verifiedAt: new Date(),
        },
      },
      trustedDevices: {
        create: {
          fingerprint: 'fp_demo_device_chrome_win',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          ipHash: crypto.createHash('sha256').update('127.0.0.1').digest('hex'),
          label: 'Primary Workstation',
        },
      },
    },
    include: { accounts: true },
  });

  // Support Operator: Support Admin
  const operatorUser = await prisma.user.create({
    data: {
      email: 'operator@vaultguard.com',
      passwordHash: operatorPasswordHash,
      nationalId: '199556781234',
      fullName: 'Support Admin',
      phoneNumber: '+94779876543',
      role: UserRole.SUPPORT_OPERATOR,
      mfaEnabled: false,
    },
  });

  // Demo Customer 2: Nimali Fernando (Payee target)
  const payeeUser = await prisma.user.create({
    data: {
      email: 'nimali@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '199887654321',
      fullName: 'Nimali Fernando',
      role: UserRole.CUSTOMER,
      mfaEnabled: false,
      accounts: {
        create: [
          {
            accountNumber: 'VG-SAV-009876',
            type: AccountType.SAVINGS,
            balance: 150000.00,
            currency: 'LKR',
            status: AccountStatus.ACTIVE,
          },
        ],
      },
    },
    include: { accounts: true },
  });

  // Demo Customer 3: Ruwan Silva (Frozen Account Scenario)
  const frozenUser = await prisma.user.create({
    data: {
      email: 'ruwan@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '198512341234',
      fullName: 'Ruwan Silva',
      role: UserRole.CUSTOMER,
      mfaEnabled: false,
      accounts: {
        create: [
          {
            accountNumber: 'VG-SAV-003344',
            type: AccountType.SAVINGS,
            balance: 50000.00,
            currency: 'LKR',
            status: AccountStatus.FROZEN, // Test frozen account restrictions
          },
        ],
      },
    },
    include: { accounts: true },
  });

  // 5. Seed Payees & Billers
  console.log('💳 Seeding Payees & Billers...');
  await prisma.payee.createMany({
    data: [
      {
        userId: demoUser.id,
        name: 'Nimali Fernando',
        accountNumber: 'VG-SAV-009876',
        bankCode: 'VG-BANK',
        type: PayeeType.PERSON,
      },
      {
        userId: demoUser.id,
        name: 'City Power & Electric (CEB)',
        accountNumber: 'UTIL-CEB-001',
        type: PayeeType.BILLER,
      },
      {
        userId: demoUser.id,
        name: 'National Water Board (NWSDB)',
        accountNumber: 'UTIL-WATER-002',
        type: PayeeType.BILLER,
      },
    ],
  });

  // 6. Active Loans with Repayment Schedules
  console.log('🏦 Seeding Loans & Repayment Schedules...');
  const savingsAccount = demoUser.accounts[0];
  const checkingAccount = demoUser.accounts[1];

  // Loan 1: Active personal loan with paid & upcoming schedules
  const loan1 = await prisma.loan.create({
    data: {
      userId: demoUser.id,
      accountId: savingsAccount.id,
      principalAmount: 250000.00,
      outstandingBalance: 185000.00,
      interestRate: 6.50,
      termMonths: 36,
      nextDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: LoanStatus.ACTIVE,
    },
  });

  await prisma.repaymentSchedule.createMany({
    data: [
      {
        loanId: loan1.id,
        dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        amount: 7500.00,
        status: ScheduleStatus.PAID,
        paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        loanId: loan1.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        amount: 7500.00,
        status: ScheduleStatus.UPCOMING,
      },
    ],
  });

  // Loan 2: Loan with an Overdue schedule (to test overdue notifications & repayments)
  const loan2 = await prisma.loan.create({
    data: {
      userId: demoUser.id,
      accountId: checkingAccount.id,
      principalAmount: 100000.00,
      outstandingBalance: 60000.00,
      interestRate: 8.00,
      termMonths: 12,
      nextDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: LoanStatus.ACTIVE,
    },
  });

  await prisma.repaymentSchedule.createMany({
    data: [
      {
        loanId: loan2.id,
        dueDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        amount: 5000.00,
        status: ScheduleStatus.PAID,
        paidAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
      {
        loanId: loan2.id,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amount: 5000.00,
        status: ScheduleStatus.OVERDUE,
      },
      {
        loanId: loan2.id,
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        amount: 5000.00,
        status: ScheduleStatus.UPCOMING,
      },
    ],
  });

  // 7. Seed Transactions & Outbox Events
  console.log('💸 Seeding Transactions & Outbox Events...');
  await prisma.transaction.create({
    data: {
      requestId: 'req_seed_transfer_01',
      fromAccountId: savingsAccount.id,
      toAccountId: payeeUser.accounts[0].id,
      amount: 15000.00,
      currency: 'LKR',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      sagaStatus: SagaStatus.COMPLETED,
      description: 'Transfer to Nimali Fernando',
    },
  });

  await prisma.transaction.create({
    data: {
      requestId: 'req_seed_billpay_01',
      fromAccountId: checkingAccount.id,
      amount: 4500.00,
      currency: 'LKR',
      type: TransactionType.BILL_PAY,
      status: TransactionStatus.COMPLETED,
      sagaStatus: SagaStatus.COMPLETED,
      description: 'CEB Electricity Bill Payment',
      metadata: { payeeName: 'City Power & Electric (CEB)', billNumber: 'CEB-998811' },
    },
  });

  await prisma.outboxEvent.create({
    data: {
      eventType: 'payment.completed',
      payload: {
        transactionId: 'req_seed_transfer_01',
        fromUserId: demoUser.id,
        toAccount: 'VG-SAV-009876',
        amount: 15000.00,
      },
      processed: true,
      processedAt: new Date(),
    },
  });

  // 8. Seed Audit Events
  console.log('📊 Seeding Audit Trail Events...');
  await prisma.auditEvent.createMany({
    data: [
      {
        eventId: 'audit_seed_01',
        actor: demoUser.id,
        actorRole: 'CUSTOMER',
        action: 'auth.login',
        resource: 'user',
        resourceId: demoUser.id,
        ipAddress: '127.0.0.1',
        metadata: { loginType: 'PASSWORD_MFA' },
      },
      {
        eventId: 'audit_seed_02',
        actor: demoUser.id,
        actorRole: 'CUSTOMER',
        action: 'payment.transfer',
        resource: 'transaction',
        resourceId: 'req_seed_transfer_01',
        ipAddress: '127.0.0.1',
        metadata: { amount: 15000, recipient: 'VG-SAV-009876' },
      },
      {
        eventId: 'audit_seed_03',
        actor: operatorUser.id,
        actorRole: 'SUPPORT_OPERATOR',
        action: 'admin.customer_lookup',
        resource: 'user',
        resourceId: demoUser.id,
        ipAddress: '192.168.1.50',
        metadata: { lookupReason: 'Customer inquiry call' },
      },
    ],
  });

  // 9. Seed Dead Letter Queue (DLQ) Entries
  console.log('⚠️ Seeding Dead Letter Queue (DLQ) Entries...');
  await prisma.deadLetterEntry.create({
    data: {
      originalEventId: 'evt_failed_saga_999',
      eventType: 'payment.processed',
      payload: {
        requestId: 'req_failed_999',
        fromAccountId: savingsAccount.id,
        amount: 500000.00,
        reason: 'Ledger isolation lock timeout during step 2',
      },
      failureReason: 'Transaction saga timed out after 3 retries. Manual operator replay required.',
      retryCount: 3,
    },
  });

  console.log('🎉 Scenario seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

