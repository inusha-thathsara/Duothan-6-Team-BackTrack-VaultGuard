import { PrismaClient, UserRole, AccountType, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

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
  ];

  for (const identity of backupIdentities) {
    await prisma.backupIdentity.create({
      data: identity,
    });
  }
  console.log(`✅ Seeded ${backupIdentities.length} backup identity records.`);

  // 3. Password Hashes (bcrypt cost factor 12)
  const defaultPasswordHash = await bcrypt.hash('VaultGuard@2065', 12);
  const operatorPasswordHash = await bcrypt.hash('Operator@2065', 12);

  // 4. Seed Demo Users & Accounts
  console.log('👤 Seeding Demo Users and Accounts...');

  // Demo Customer 1: Kamal Perera (Main Demo Account)
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '200012345678',
      fullName: 'Kamal Perera',
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
          {
            accountNumber: 'VG-FD-001236',
            type: AccountType.FIXED_DEPOSIT,
            balance: 500000.00,
            currency: 'LKR',
            status: AccountStatus.ACTIVE,
            dailyLimit: 0.00,
            singleLimit: 0.00,
          },
        ],
      },
    },
  });

  // Support Operator: Support Admin
  const operatorUser = await prisma.user.create({
    data: {
      email: 'operator@vaultguard.com',
      passwordHash: operatorPasswordHash,
      nationalId: '199556781234',
      fullName: 'Support Admin',
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
  });

  console.log(`✅ Seeded 3 users (1 Customer w/ MFA, 1 Operator, 1 Customer target).`);

  // 5. Seed Payees for Demo User
  console.log('💳 Seeding Payees...');
  await prisma.payee.create({
    data: {
      userId: demoUser.id,
      name: 'Nimali Fernando',
      accountNumber: 'VG-SAV-009876',
      bankCode: 'VG-BANK',
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
