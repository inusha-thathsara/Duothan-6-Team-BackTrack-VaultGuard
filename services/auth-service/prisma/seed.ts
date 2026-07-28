import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Auth Service database seeding...');

  // Clean existing tables in reverse dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.refreshToken.deleteMany();
  await prisma.trustedDevice.deleteMany();
  await prisma.mfaFactor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.backupIdentity.deleteMany();

  // 1. Seed Backup Identities
  console.log('📋 Seeding Backup Identities...');
  const backupIdentities = [
    { nationalId: '200012345678', fullName: 'Kamal Perera' },
    { nationalId: '199887654321', fullName: 'Nimali Fernando' },
    { nationalId: '198512341234', fullName: 'Ruwan Silva' },
  ];

  for (const identity of backupIdentities) {
    await prisma.backupIdentity.create({ data: identity });
  }
  console.log(`✅ Seeded ${backupIdentities.length} backup identity records.`);

  // 2. Password Hashes (bcrypt cost factor 12)
  const defaultPasswordHash = await bcrypt.hash('VaultGuard@2065', 12);
  const operatorPasswordHash = await bcrypt.hash('Operator@2065', 12);

  // 3. Seed Demo Users
  console.log('👤 Seeding Auth Demo Users...');

  await prisma.user.create({
    data: {
      email: 'demo@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '200012345678',
      fullName: 'Kamal Perera',
      role: UserRole.CUSTOMER,
      mfaEnabled: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'operator@vaultguard.com',
      passwordHash: operatorPasswordHash,
      nationalId: '199556781234',
      fullName: 'Support Admin',
      role: UserRole.SUPPORT_OPERATOR,
      mfaEnabled: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'nimali@vaultguard.com',
      passwordHash: defaultPasswordHash,
      nationalId: '199887654321',
      fullName: 'Nimali Fernando',
      role: UserRole.CUSTOMER,
      mfaEnabled: false,
    },
  });

  console.log('🎉 Auth Service seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during auth seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
