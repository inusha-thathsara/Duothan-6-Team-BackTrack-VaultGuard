import { prisma } from "@/lib/db/prisma";

export type RiskCheckResult = {
  approved: boolean;
  requiresStepUpMfa: boolean;
  reason?: string;
};

const STEP_UP_MFA_THRESHOLD = Number(process.env.STEP_UP_MFA_THRESHOLD) || 5000;

let paymentsDegradedFlag = false;

export function isPaymentsDegraded(): boolean {
  return paymentsDegradedFlag || process.env.DEGRADED_MODE === "true";
}

export function setPaymentsDegraded(degraded: boolean): void {
  paymentsDegradedFlag = degraded;
}

/**
 * Risk and limits check for payment operations (FR-11).
 *
 * From Phase 1 §3.3:
 *   "Payments Saga step: checks Accounts, applies limits/risk..."
 *
 * Checks:
 *   1. Account ownership and status
 *   2. Single transaction limit (per account)
 *   3. Daily aggregate limit
 *   4. Sufficient balance
 *   5. Step-up MFA threshold for high-risk actions
 */
export async function checkTransferRisk(params: {
  fromAccountId: string;
  amount: number;
  userId: string;
}): Promise<RiskCheckResult> {
  const { fromAccountId, amount, userId } = params;

  // 1. Get account with limits
  let account = await prisma.account.findUnique({
    where: { id: fromAccountId },
  });

  if (!account) {
    account = await prisma.account.findUnique({
      where: { accountNumber: fromAccountId },
    });
  }

  if (!account) {
    return { approved: false, requiresStepUpMfa: false, reason: "Account not found" };
  }

  // Verify account belongs to authenticated user
  if (account.userId !== userId) {
    return {
      approved: false,
      requiresStepUpMfa: false,
      reason: "Account does not belong to user",
    };
  }

  // Check account status
  if (account.status !== "ACTIVE") {
    return {
      approved: false,
      requiresStepUpMfa: false,
      reason: `Account is ${account.status.toLowerCase()}`,
    };
  }

  const curr = account.currency || "LKR";

  // 2. Single transaction limit
  const singleLimit = account.singleLimit.toNumber();
  if (amount > singleLimit) {
    return {
      approved: false,
      requiresStepUpMfa: false,
      reason: `Amount ${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} exceeds single transaction limit of ${curr} ${singleLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    };
  }

  // 3. Daily aggregate limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyTotal = await prisma.transaction.aggregate({
    where: {
      fromAccountId,
      status: { in: ["COMPLETED", "PENDING"] },
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  const dailySpent = dailyTotal._sum.amount?.toNumber() || 0;
  const dailyLimit = account.dailyLimit.toNumber();

  if (dailySpent + amount > dailyLimit) {
    return {
      approved: false,
      requiresStepUpMfa: false,
      reason: `Daily limit exceeded. Spent today: ${curr} ${dailySpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}, limit: ${curr} ${dailyLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    };
  }

  // 4. Sufficient balance
  const balance = account.balance.toNumber();
  if (balance < amount) {
    return {
      approved: false,
      requiresStepUpMfa: false,
      reason: "Insufficient funds",
    };
  }

  // 5. Step-up MFA for high-risk transactions (FR-11)
  if (amount > STEP_UP_MFA_THRESHOLD) {
    return {
      approved: true,
      requiresStepUpMfa: true,
      reason: `Transfer of ${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} exceeds ${curr} ${STEP_UP_MFA_THRESHOLD.toLocaleString()} threshold — step-up MFA required`,
    };
  }

  return { approved: true, requiresStepUpMfa: false };
}

