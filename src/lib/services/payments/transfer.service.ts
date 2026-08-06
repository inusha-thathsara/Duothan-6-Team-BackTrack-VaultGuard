import { prisma } from "@/lib/db/prisma";
import type { Transaction } from "@prisma/client";
import type { TransferInput } from "@/lib/validation/payment.schema";
import { checkIdempotency } from "./idempotency";
import { checkTransferRisk } from "./risk-check";

export type TransferResult = {
  transaction?: Transaction;
  idempotent?: boolean;
  requiresStepUpMfa?: boolean;
  riskReason?: string;
};

/**
 * Transfer Saga Engine (FR-09, FR-13, FR-14a, §3.3).
 *
 * Implements the exact saga flow from Phase 1 §3.3:
 *
 *   1. Client presents JWT → API Gateway validates (auth middleware)
 *   2. Gateway forwards to Payments with client request_id (idempotent submit)
 *   3. Payments Saga step: checks Accounts, applies limits/risk,
 *      writes ledger + outbox row in ONE local transaction
 *   4. Outbox publisher emits payment.completed to EventBus
 *   5. Notify and Audit subscribe; each stores processed event_id for dedup
 *   6. Failed deliveries after retries → Dead Letter Queue
 *   7. Compensating Saga events handle later-step failures — never 2PC
 *
 * Saga States: INITIATED → DEBITED → CREDITED → COMPLETED (or COMPENSATED)
 */
export async function executeTransfer(
  input: TransferInput,
  requestId: string,
  userId: string
): Promise<TransferResult> {
  // ── Step 1: Idempotency check (FR-13) ──
  const { isDuplicate, existingTransaction } = await checkIdempotency(requestId);
  if (isDuplicate && existingTransaction) {
    return { transaction: existingTransaction, idempotent: true };
  }

  // ── Step 2: Resolve destination account ──
  let toAccountId = input.toAccountId || null;

  if (!toAccountId && input.payeeId) {
    const payee = await prisma.payee.findUnique({
      where: { id: input.payeeId },
    });
    if (payee) {
      // Look up internal account by payee's account number
      const destAccount = await prisma.account.findUnique({
        where: { accountNumber: payee.accountNumber },
      });
      if (destAccount) {
        toAccountId = destAccount.id;
      }
    }
    // If no match → external transfer (simulated: debit only)
  }

  // ── Step 3: Risk and limits check (FR-11) ──
  const riskResult = await checkTransferRisk({
    fromAccountId: input.fromAccountId,
    amount: input.amount,
    userId,
  });

  if (!riskResult.approved) {
    throw new TransferError(
      riskResult.reason || "Transfer not approved",
      "RISK_CHECK_FAILED"
    );
  }

  if (riskResult.requiresStepUpMfa) {
    return { requiresStepUpMfa: true, riskReason: riskResult.reason };
  }

  // ── Step 4: Execute Saga in a single Prisma $transaction (§3.3) ──
  // "writes ledger + outbox row in one local transaction"
  const transaction = await prisma.$transaction(async (tx) => {
    // 4b. DEBITED — Resolve and debit sender account
    let fromAccount = await tx.account.findUnique({
      where: { id: input.fromAccountId },
    });
    if (!fromAccount) {
      fromAccount = await tx.account.findUnique({
        where: { accountNumber: input.fromAccountId },
      });
    }

    if (!fromAccount || fromAccount.status !== "ACTIVE") {
      throw new TransferError("Source account not found or inactive", "ACCOUNT_INACTIVE");
    }

    // 4a. INITIATED — Create transaction record using resolved account ID
    const txRecord = await tx.transaction.create({
      data: {
        requestId,
        fromAccountId: fromAccount.id,
        toAccountId,
        amount: input.amount,
        currency: input.currency,
        type: "TRANSFER",
        status: "PENDING",
        sagaStatus: "INITIATED",
        description: input.description || null,
        fee: 0,
      },
    });

    if (fromAccount.balance.toNumber() < input.amount) {
      await tx.transaction.update({
        where: { id: txRecord.id },
        data: { status: "FAILED", sagaStatus: "COMPENSATED" },
      });
      throw new TransferError("Insufficient funds", "INSUFFICIENT_FUNDS");
    }

    await tx.account.update({
      where: { id: fromAccount.id },
      data: { balance: { decrement: input.amount } },
    });

    await tx.transaction.update({
      where: { id: txRecord.id },
      data: { sagaStatus: "DEBITED" },
    });

    // 4c. CREDITED — Credit receiver account (internal transfers only)
    if (toAccountId) {
      const toAccount = await tx.account.findUnique({
        where: { id: toAccountId },
      });

      if (!toAccount || toAccount.status !== "ACTIVE") {
        // Compensate: reverse debit
        await tx.account.update({
          where: { id: input.fromAccountId },
          data: { balance: { increment: input.amount } },
        });
        await tx.transaction.update({
          where: { id: txRecord.id },
          data: { status: "FAILED", sagaStatus: "COMPENSATED" },
        });
        throw new TransferError(
          "Destination account not found or inactive",
          "DEST_ACCOUNT_INACTIVE"
        );
      }

      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: input.amount } },
      });

      await tx.transaction.update({
        where: { id: txRecord.id },
        data: { sagaStatus: "CREDITED" },
      });
    }

    // 4d. COMPLETED — Finalize transaction
    const completedTx = await tx.transaction.update({
      where: { id: txRecord.id },
      data: { status: "COMPLETED", sagaStatus: "COMPLETED" },
    });

    // 4e. Write Outbox Event — atomic with ledger commit (FR-14a)
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.completed",
        payload: {
          transactionId: completedTx.id,
          requestId: completedTx.requestId,
          fromAccountId: completedTx.fromAccountId,
          toAccountId: completedTx.toAccountId,
          amount: completedTx.amount.toString(),
          currency: completedTx.currency,
          type: completedTx.type,
          description: completedTx.description,
          userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return completedTx;
  });

  return { transaction };
}

import { AppError } from "@/lib/middleware/error-handler";

/**
 * Custom error for transfer operations with structured error code.
 */
export class TransferError extends AppError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400
  ) {
    super(message, code, statusCode);
    this.name = "TransferError";
  }
}

