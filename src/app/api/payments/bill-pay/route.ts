import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { billPaySchema } from "@/lib/validation/payment.schema";
import { executeBillPayment } from "@/lib/services/payments/bill-pay.service";
import { getRequestId } from "@/lib/services/payments/idempotency";

/**
 * POST /api/payments/bill-pay
 *
 * Bill payment to registered billers (FR-12).
 * Uses the same idempotency and risk-check patterns as transfers.
 *
 * Required headers:
 *   Authorization: Bearer <token>
 *   x-request-id: <unique-uuid>
 *
 * Request body: { fromAccountId, billerId, amount, currency?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const requestId = getRequestId(request.headers);

    const body = await request.json();
    const input = billPaySchema.parse(body);

    const result = await executeBillPayment(input, requestId, auth.userId);

    if (result.requiresStepUpMfa) {
      return NextResponse.json(
        {
          success: false,
          data: { requiresStepUpMfa: true, reason: result.riskReason },
        },
        { status: 403 }
      );
    }

    if (result.idempotent) {
      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
          idempotent: true,
          message: "Bill payment already processed (idempotent)",
        },
      });
    }

    return NextResponse.json(
      { success: true, data: { transaction: result.transaction } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

