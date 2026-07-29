import { prisma } from "@/lib/db/prisma";
import type { Transaction } from "@prisma/client";
import type { BillPayInput } from "@/lib/validation/payment.schema";
import { checkIdempotency } from "./idempotency";
import { checkTransferRisk } from "./risk-check";
import { TransferError } from "./transfer.service";

export type BillPayResult = {
  transaction?: Transaction;
  idempotent?: boolean;
  requiresStepUpMfa?: boolean;
  riskReason?: string;
};

/**
 * Bill Payment Service (FR-12).
 *
 * Processes bill payments to registered billers.
 * Reuses the same payment engine pattern as transfers —
 * biller is a special payee type (PayeeType.BILLER).
 *
 * Bill payments are debit-only (no internal credit) since
 * billers are external entities.
 */
export async function executeBillPayment(
  input: BillPayInput,
  requestId: string,
  userId: string
): Promise<BillPayResult> {
  // Idempotency check (FR-13)
  const { isDuplicate, existingTransaction } = await checkIdempotency(requestId);
  if (isDuplicate && existingTransaction) {
    return { transaction: existingTransaction, idempotent: true };
  }

  // Validate biller exists and is of type BILLER
  const biller = await prisma.payee.findUnique({
    where: { id: input.billerId },
  });

  if (!biller || biller.type !== "BILLER") {
    throw new TransferError("Biller not found", "BILLER_NOT_FOUND", 404);
  }

  // Risk check (FR-11)
  const riskResult = await checkTransferRisk({
    fromAccountId: input.fromAccountId,
    amount: input.amount,
    userId,
  });

  if (!riskResult.approved) {
    throw new TransferError(
      riskResult.reason || "Payment not approved",
      "RISK_CHECK_FAILED"
    );
  }

  if (riskResult.requiresStepUpMfa) {
    return { requiresStepUpMfa: true, riskReason: riskResult.reason };
  }

  // Execute bill payment in a single atomic transaction (saga pattern)
  const transaction = await prisma.$transaction(async (tx) => {
    // Create transaction record (INITIATED)
    const txRecord = await tx.transaction.create({
      data: {
        requestId,
        fromAccountId: input.fromAccountId,
        toAccountId: null, // External biller — no internal credit
        amount: input.amount,
        currency: input.currency,
        type: "BILL_PAY",
        status: "PENDING",
        sagaStatus: "INITIATED",
        description: input.description || `Bill payment to ${biller.name}`,
        fee: 0,
        metadata: { billerId: biller.id, billerName: biller.name },
      },
    });

    // Debit sender account
    const fromAccount = await tx.account.findUnique({
      where: { id: input.fromAccountId },
    });

    if (!fromAccount || fromAccount.status !== "ACTIVE") {
      await tx.transaction.update({
        where: { id: txRecord.id },
        data: { status: "FAILED", sagaStatus: "COMPENSATED" },
      });
      throw new TransferError("Source account not found or inactive", "ACCOUNT_INACTIVE");
    }

    if (fromAccount.balance.toNumber() < input.amount) {
      await tx.transaction.update({
        where: { id: txRecord.id },
        data: { status: "FAILED", sagaStatus: "COMPENSATED" },
      });
      throw new TransferError("Insufficient funds", "INSUFFICIENT_FUNDS");
    }

    await tx.account.update({
      where: { id: input.fromAccountId },
      data: { balance: { decrement: input.amount } },
    });

    // Complete (bill payments: debit only, no receiver credit)
    const completedTx = await tx.transaction.update({
      where: { id: txRecord.id },
      data: { status: "COMPLETED", sagaStatus: "COMPLETED" },
    });

    // Write outbox event (FR-14a)
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.completed",
        payload: {
          transactionId: completedTx.id,
          requestId: completedTx.requestId,
          fromAccountId: completedTx.fromAccountId,
          amount: completedTx.amount.toString(),
          currency: completedTx.currency,
          type: "BILL_PAY",
          billerName: biller.name,
          userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return completedTx;
  });

  return { transaction };
}

