import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError, AppError } from "@/lib/middleware/error-handler";
import { auditService } from "@/lib/services/audit/audit.service";
import { z } from "zod";

const depositSchema = z.object({
  accountNumber: z.string().min(1, "Account number or ID required"),
  amount: z.number().positive("Deposit amount must be positive"),
  description: z.string().optional(),
});

/**
 * POST /api/admin/deposit
 * Support Operator cash/fund deposit into customer bank account.
 */
export async function POST(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const body = await req.json();
    const input = depositSchema.parse(body);

    // Find account by ID or accountNumber
    let account = await prisma.account.findUnique({
      where: { id: input.accountNumber },
      include: { user: true },
    });

    if (!account) {
      account = await prisma.account.findUnique({
        where: { accountNumber: input.accountNumber },
        include: { user: true },
      });
    }

    if (!account) {
      throw new AppError("Account not found", "ACCOUNT_NOT_FOUND", 404);
    }

    const requestId = `REQ-DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Credit account balance
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: input.amount },
        },
      });

      // 2. Record ledger transaction
      const txRecord = await tx.transaction.create({
        data: {
          requestId,
          fromAccountId: account.id,
          toAccountId: account.id,
          amount: input.amount,
          currency: account.currency,
          type: "TRANSFER",
          status: "COMPLETED",
          sagaStatus: "COMPLETED",
          description: input.description || `Over-the-counter Cash Deposit by Operator`,
          fee: 0,
        },
      });

      // 3. Outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: "deposit.completed",
          payload: {
            transactionId: txRecord.id,
            accountId: account.id,
            accountNumber: account.accountNumber,
            amount: input.amount,
            currency: account.currency,
            description: input.description || `Over-the-counter Cash Deposit by Operator`,
            operatorId: auth.userId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { account: updatedAccount, transaction: txRecord };
    });

    // Audit log
    await auditService.recordAuditEvent({
      actor: auth.userId,
      actorRole: auth.role,
      action: "admin.cash_deposit",
      resource: "account",
      resourceId: account.id,
      metadata: {
        accountNumber: account.accountNumber,
        customerEmail: account.user.email,
        amount: input.amount,
      },
      correlationId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        newBalance: Number(transaction.account.balance),
        amountDeposited: input.amount,
        transactionId: transaction.transaction.id,
        message: `Successfully deposited ${account.currency} ${input.amount.toLocaleString()} into account ${account.accountNumber}.`,
      },
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
