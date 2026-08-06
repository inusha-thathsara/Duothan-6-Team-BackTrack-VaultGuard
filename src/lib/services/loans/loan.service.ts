import { prisma } from "@/lib/db/prisma";
import type { Loan, RepaymentSchedule, Transaction } from "@prisma/client";
import type { RepaymentInput } from "@/lib/validation/loan.schema";
import { TransferError } from "../payments/transfer.service";

export type LoanWithSchedule = Loan & {
  repaymentSchedule: RepaymentSchedule[];
  account: { accountNumber: string };
};

/**
 * Get all loans for a user (FR-15).
 *
 * Returns active loans with outstanding principal, interest rate,
 * next due date, and full repayment schedule.
 */
export async function getUserLoans(
  userId: string,
  status?: "ACTIVE" | "PAID_OFF" | "DEFAULTED"
): Promise<LoanWithSchedule[]> {
  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;

  return prisma.loan.findMany({
    where,
    include: {
      repaymentSchedule: { orderBy: { dueDate: "asc" } },
      account: { select: { accountNumber: true } },
    },
    orderBy: { nextDueDate: "asc" },
  });
}

/**
 * Get a single loan with full details.
 */
export async function getLoanById(
  loanId: string,
  userId: string
): Promise<LoanWithSchedule | null> {
  return prisma.loan.findFirst({
    where: { id: loanId, userId },
    include: {
      repaymentSchedule: { orderBy: { dueDate: "asc" } },
      account: { select: { accountNumber: true } },
    },
  });
}

/**
 * Process loan repayment (FR-16).
 *
 * Steps:
 *   1. Validate loan exists, belongs to user, is ACTIVE
 *   2. Validate repayment doesn't exceed outstanding
 *   3. Validate source account has sufficient funds
 *   4. Atomic transaction: debit account → update loan → update schedule → outbox event
 */
export async function processLoanRepayment(
  input: RepaymentInput,
  requestId: string,
  userId: string
): Promise<{ transaction: Transaction; loan: Loan }> {
  // Validate loan
  const loan = await prisma.loan.findFirst({
    where: { id: input.loanId, userId },
  });

  if (!loan) {
    throw new TransferError("Loan not found", "LOAN_NOT_FOUND", 404);
  }

  if (loan.status !== "ACTIVE") {
    throw new TransferError("Loan is not active", "LOAN_NOT_ACTIVE");
  }

  const outstanding = loan.outstandingBalance.toNumber();
  if (input.amount > outstanding) {
    throw new TransferError(
      `Repayment $${input.amount.toFixed(2)} exceeds outstanding balance $${outstanding.toFixed(2)}`,
      "AMOUNT_EXCEEDS_OUTSTANDING"
    );
  }

  // Validate source account
  const fromAccount = await prisma.account.findFirst({
    where: { id: input.fromAccountId, userId },
  });

  if (!fromAccount) {
    throw new TransferError("Source account not found", "ACCOUNT_NOT_FOUND", 404);
  }

  if (fromAccount.status !== "ACTIVE") {
    throw new TransferError("Source account is not active", "ACCOUNT_INACTIVE");
  }

  if (fromAccount.balance.toNumber() < input.amount) {
    throw new TransferError("Insufficient funds", "INSUFFICIENT_FUNDS");
  }

  // Execute repayment in a single atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create LOAN_REPAYMENT transaction record
    const txRecord = await tx.transaction.create({
      data: {
        requestId,
        fromAccountId: input.fromAccountId,
        toAccountId: null,
        amount: input.amount,
        currency: "USD",
        type: "LOAN_REPAYMENT",
        status: "PENDING",
        sagaStatus: "INITIATED",
        description: `Loan repayment for loan ${loan.id.slice(0, 8)}...`,
        fee: 0,
        metadata: { loanId: loan.id },
      },
    });

    // 2. Debit source account
    await tx.account.update({
      where: { id: input.fromAccountId },
      data: { balance: { decrement: input.amount } },
    });

    // 3. Update loan outstanding balance
    const newOutstanding = outstanding - input.amount;
    const isFullyPaid = newOutstanding <= 0.005; // floating point tolerance

    const updatedLoan = await tx.loan.update({
      where: { id: loan.id },
      data: {
        outstandingBalance: Math.max(0, newOutstanding),
        status: isFullyPaid ? "PAID_OFF" : "ACTIVE",
      },
    });

    // 4. Mark next due repayment schedule entry as PAID
    const nextSchedule = await tx.repaymentSchedule.findFirst({
      where: {
        loanId: loan.id,
        status: { in: ["UPCOMING", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
    });

    if (nextSchedule) {
      await tx.repaymentSchedule.update({
        where: { id: nextSchedule.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    // 5. Complete transaction
    const completedTx = await tx.transaction.update({
      where: { id: txRecord.id },
      data: {
        status: "COMPLETED",
        sagaStatus: "COMPLETED",
        metadata: {
          loanId: loan.id,
          remainingBalance: Math.max(0, newOutstanding),
          targetMonth: nextSchedule ? nextSchedule.dueDate.toISOString().substring(0, 7) : new Date().toISOString().substring(0, 7)
        }
      },
    });

    // 6. Write outbox event for audit/notification
    await tx.outboxEvent.create({
      data: {
        eventType: "loan.repayment.completed",
        payload: {
          transactionId: completedTx.id,
          loanId: loan.id,
          amount: input.amount.toString(),
          remainingBalance: Math.max(0, newOutstanding).toFixed(2),
          isFullyPaid,
          userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { transaction: completedTx, loan: updatedLoan };
  });

  return result;
}

