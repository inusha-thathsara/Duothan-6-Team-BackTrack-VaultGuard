import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { repaymentSchema } from "@/lib/validation/loan.schema";
import { processLoanRepayment } from "@/lib/services/loans/loan.service";
import { getRequestId } from "@/lib/services/payments/idempotency";

/**
 * POST /api/loans/repay
 *
 * Process loan repayment from an eligible account (FR-16).
 *
 * Required headers:
 *   Authorization: Bearer <token>
 *   x-request-id: <unique-uuid>  (idempotency)
 *
 * Request body: { loanId, amount, fromAccountId }
 *
 * Atomically:
 *   1. Debits source account
 *   2. Reduces loan outstanding balance
 *   3. Updates repayment schedule
 *   4. Creates outbox event for audit/notification
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const requestId = getRequestId(request.headers);

    const body = await request.json();
    const input = repaymentSchema.parse(body);

    const result = await processLoanRepayment(input, requestId, auth.userId);

    return NextResponse.json(
      {
        success: true,
        data: {
          transaction: result.transaction,
          loan: {
            id: result.loan.id,
            outstandingBalance: result.loan.outstandingBalance.toString(),
            status: result.loan.status,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

