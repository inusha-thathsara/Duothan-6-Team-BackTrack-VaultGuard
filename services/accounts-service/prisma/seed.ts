import { PrismaClient, AccountType, AccountStatus, TransactionType, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Accounts Service database seeding...');

  // Clean existing tables in reverse dependency order
  console.log('🧹 Cleaning existing accounts data...');
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();

  // Known demo user ID (from auth seed or static test user)
  const DEMO_USER_ID = 'demo-user-kamal-perera-uuid';
  const NIMALI_USER_ID = 'demo-user-nimali-fernando-uuid';

  console.log('🏦 Seeding Bank Accounts...');

  const savingsAccount = await prisma.account.create({
    data: {
      userId: DEMO_USER_ID,
      accountNumber: 'VG-SAV-001234',
      type: AccountType.SAVINGS,
      balance: 250000.00,
      currency: 'LKR',
      status: AccountStatus.ACTIVE,
      dailyLimit: 500000.00,
      singleLimit: 250000.00,
    },
  });

  const checkingAccount = await prisma.account.create({
    data: {
      userId: DEMO_USER_ID,
      accountNumber: 'VG-CHK-001235',
      type: AccountType.CHECKING,
      balance: 75000.50,
      currency: 'LKR',
      status: AccountStatus.ACTIVE,
      dailyLimit: 1000000.00,
      singleLimit: 500000.00,
    },
  });

  await prisma.account.create({
    data: {
      userId: DEMO_USER_ID,
      accountNumber: 'VG-FD-001236',
      type: AccountType.FIXED_DEPOSIT,
      balance: 500000.00,
      currency: 'LKR',
      status: AccountStatus.ACTIVE,
      dailyLimit: 0.00,
      singleLimit: 0.00,
    },
  });

  const nimaliSavings = await prisma.account.create({
    data: {
      userId: NIMALI_USER_ID,
      accountNumber: 'VG-SAV-009876',
      type: AccountType.SAVINGS,
      balance: 150000.00,
      currency: 'LKR',
      status: AccountStatus.ACTIVE,
    },
  });

  console.log('📜 Seeding Statement Transactions...');

  await prisma.transaction.createMany({
    data: [
      {
        requestId: 'req-seed-001',
        fromAccountId: savingsAccount.id,
        toAccountId: nimaliSavings.id,
        amount: 15000.00,
        currency: 'LKR',
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        description: 'Transfer to Nimali Fernando',
        reference: 'TXN-2026072514300001',
        createdAt: new Date('2026-07-25T14:30:00.000Z'),
      },
      {
        requestId: 'req-seed-002',
        fromAccountId: checkingAccount.id,
        amount: 4500.00,
        currency: 'LKR',
        type: TransactionType.BILL_PAY,
        status: TransactionStatus.COMPLETED,
        description: 'Utility Bill Payment - CEB',
        reference: 'TXN-2026072610150002',
        createdAt: new Date('2026-07-26T10:15:00.000Z'),
      },
      {
        requestId: 'req-seed-003',
        fromAccountId: savingsAccount.id,
        amount: 25000.00,
        currency: 'LKR',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'Salary Deposit',
        reference: 'TXN-2026072709000003',
        createdAt: new Date('2026-07-27T09:00:00.000Z'),
      },
    ],
  });

  console.log('🎉 Accounts Service seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during accounts seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
