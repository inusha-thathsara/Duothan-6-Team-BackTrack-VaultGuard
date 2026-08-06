import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError, AppError } from "@/lib/middleware/error-handler";
import { auditService } from "@/lib/services/audit/audit.service";
import { z } from "zod";

const issueLoanSchema = z.object({
  userId: z.string().optional(),
  accountId: z.string().min(1, "Destination account ID or account number required"),
  title: z.string().min(1, "Loan title required"),
  principalAmount: z.number().positive("Principal amount must be positive"),
  interestRate: z.number().min(0).max(100, "Interest rate invalid"),
  termMonths: z.number().int().min(1).max(360, "Term months invalid"),
});

/**
 * POST /api/admin/loans/issue
 * Support Operator issue and disburse loan to customer.
 */
export async function POST(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const body = await req.json();
    const input = issueLoanSchema.parse(body);

    // Find account by ID or accountNumber
    let account = await prisma.account.findUnique({
      where: { id: input.accountId },
      include: { user: true },
    });

    if (!account) {
      account = await prisma.account.findUnique({
        where: { accountNumber: input.accountId },
        include: { user: true },
      });
    }

    if (!account) {
      throw new AppError("Target bank account not found", "ACCOUNT_NOT_FOUND", 404);
    }

    const user = account.user;

    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const requestId = `REQ-LOAN-DISB-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Loan facility
      const loan = await tx.loan.create({
        data: {
          userId: user.id,
          accountId: account.id,
          principalAmount: input.principalAmount,
          outstandingBalance: input.principalAmount,
          interestRate: input.interestRate,
          termMonths: input.termMonths,
          nextDueDate,
          status: "ACTIVE",
        },
      });

      // 2. Generate initial monthly repayment schedules
      const monthlyPayment = (input.principalAmount * (1 + input.interestRate / 100)) / input.termMonths;
      const schedulesData = [];
      for (let i = 1; i <= Math.min(input.termMonths, 12); i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        schedulesData.push({
          loanId: loan.id,
          dueDate,
          amount: monthlyPayment,
          status: "UPCOMING" as const,
        });
      }

      await tx.repaymentSchedule.createMany({
        data: schedulesData,
      });

      // 3. Disburse funds — credit principal amount into customer's bank account
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: input.principalAmount },
        },
      });

      // 4. Record loan disbursement transaction
      const txRecord = await tx.transaction.create({
        data: {
          requestId,
          fromAccountId: account.id,
          toAccountId: account.id,
          amount: input.principalAmount,
          currency: account.currency,
          type: "TRANSFER",
          status: "COMPLETED",
          sagaStatus: "COMPLETED",
          description: `Loan Facility Disbursed — ${input.title}`,
          fee: 0,
        },
      });

      // 5. Outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: "loan.disbursed",
          payload: {
            loanId: loan.id,
            userId: user.id,
            accountId: account.id,
            amount: input.principalAmount,
            operatorId: auth.userId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { loan, account: updatedAccount, transaction: txRecord };
    });

    // Audit log
    await auditService.recordAuditEvent({
      actor: auth.userId,
      actorRole: auth.role,
      action: "admin.loan_issued",
      resource: "loan",
      resourceId: result.loan.id,
      metadata: {
        customerEmail: user.email,
        principalAmount: input.principalAmount,
        accountNumber: account.accountNumber,
      },
      correlationId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        loanId: result.loan.id,
        principalAmount: input.principalAmount,
        customerEmail: user.email,
        accountNumber: account.accountNumber,
        newBalance: Number(result.account.balance),
        message: `Loan of ${account.currency} ${input.principalAmount.toLocaleString()} disbursed into ${account.accountNumber}.`,
      },
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
