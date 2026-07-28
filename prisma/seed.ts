import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VaultGuard database...");

  // Clean existing data
  await prisma.deadLetterEntry.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.repaymentSchedule.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payee.deleteMany();
  await prisma.account.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.trustedDevice.deleteMany();
  await prisma.mfaFactor.deleteMany();
  await prisma.user.deleteMany();

  // 1. Demo Customer
  const customer = await prisma.user.create({
    data: {
      id: "usr_customer_01",
      email: "demo@vaultguard.com",
      passwordHash: "$2b$12$KIXeJ3OQ8e...stubHash", // bcrypt hash placeholder
      nationalId: "199512345678",
      fullName: "Alex Mercer",
      role: "CUSTOMER",
      mfaEnabled: true,
    },
  });

  // 2. Demo Support Operator
  await prisma.user.create({
    data: {
      id: "usr_operator_01",
      email: "operator@vaultguard.com",
      passwordHash: "$2b$12$KIXeJ3OQ8e...stubHash",
      nationalId: "198887654321",
      fullName: "Sarah Connor",
      role: "SUPPORT_OPERATOR",
      mfaEnabled: false,
    },
  });

  // 3. Accounts for Customer
  const savingsAccount = await prisma.account.create({
    data: {
      id: "acc_savings_01",
      userId: customer.id,
      accountNumber: "VG-100200300",
      type: "SAVINGS",
      balance: 15450.75,
      currency: "USD",
      status: "ACTIVE",
      dailyLimit: 10000,
      singleLimit: 5000,
    },
  });

  const checkingAccount = await prisma.account.create({
    data: {
      id: "acc_checking_01",
      userId: customer.id,
      accountNumber: "VG-100200301",
      type: "CHECKING",
      balance: 3200.00,
      currency: "USD",
      status: "ACTIVE",
      dailyLimit: 5000,
      singleLimit: 2500,
    },
  });

  // 4. Payees & Billers
  const payeePerson = await prisma.payee.create({
    data: {
      id: "payee_john_01",
      userId: customer.id,
      name: "John Doe",
      accountNumber: "VG-999888777",
      bankCode: "VGUS",
      type: "PERSON",
    },
  });

  const billerCEB = await prisma.payee.create({
    data: {
      id: "biller_utility_01",
      userId: customer.id,
      name: "City Power & Electric",
      accountNumber: "UTIL-554433",
      type: "BILLER",
    },
  });

  // 5. Active Loan with Schedule
  const loan = await prisma.loan.create({
    data: {
      id: "loan_home_01",
      userId: customer.id,
      accountId: savingsAccount.id,
      principalAmount: 25000.00,
      outstandingBalance: 18500.00,
      interestRate: 6.50,
      termMonths: 36,
      nextDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: "ACTIVE",
    },
  });

  await prisma.repaymentSchedule.createMany({
    data: [
      {
        loanId: loan.id,
        dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        amount: 750.00,
        status: "PAID",
        paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        loanId: loan.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        amount: 750.00,
        status: "UPCOMING",
      },
      {
        loanId: loan.id,
        dueDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000),
        amount: 750.00,
        status: "UPCOMING",
      },
    ],
  });

  // 6. Sample Initial Transactions
  await prisma.transaction.create({
    data: {
      id: "tx_init_01",
      requestId: "req_init_sample_01",
      fromAccountId: savingsAccount.id,
      toAccountId: checkingAccount.id,
      amount: 500.00,
      currency: "USD",
      type: "TRANSFER",
      status: "COMPLETED",
      sagaStatus: "COMPLETED",
      description: "Monthly savings transfer",
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`   Customer ID: ${customer.id}`);
  console.log(`   Savings Acc: ${savingsAccount.id} (VG-100200300, Balance: $15,450.75)`);
  console.log(`   Checking Acc: ${checkingAccount.id} (VG-100200301, Balance: $3,200.00)`);
  console.log(`   Payee ID: ${payeePerson.id}`);
  console.log(`   Biller ID: ${billerCEB.id}`);
  console.log(`   Loan ID: ${loan.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
