import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { transferSchema } from "@/lib/validation/payment.schema";
import { executeTransfer } from "@/lib/services/payments/transfer.service";
import { getRequestId } from "@/lib/services/payments/idempotency";

/**
 * POST /api/payments/transfer
 *
 * Idempotent fund transfer with full saga coordination.
 * Implements FR-09, FR-10, FR-11, FR-13, FR-14a (§3.3).
 *
 * Required headers:
 *   Authorization: Bearer <token>
 *   x-request-id: <unique-uuid>   (FR-13 idempotency key)
 *
 * Request body: { fromAccountId, toAccountId?, payeeId?, amount, currency?, description? }
 *
 * Responses:
 *   201 — Transfer completed successfully
 *   200 — Idempotent duplicate (already processed)
 *   403 — Step-up MFA required (FR-11)
 *   400 — Validation or risk check failure
 *   401 — Not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const requestId = getRequestId(request.headers);

    const body = await request.json();
    const input = transferSchema.parse(body);

    const isMfaVerified =
      request.headers.get("x-mfa-verified") === "true" ||
      request.cookies.get("vaultguard_mfa_verified")?.value === "true" ||
      input.mfaVerified === true;

    const result = await executeTransfer(input, requestId, auth.userId, isMfaVerified);

    // Step-up MFA required (FR-11)
    if (result.requiresStepUpMfa) {
      return NextResponse.json(
        {
          success: false,
          data: { requiresStepUpMfa: true, reason: result.riskReason },
        },
        { status: 403 }
      );
    }

    // Idempotent duplicate (FR-13)
    if (result.idempotent) {
      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
          idempotent: true,
          message: "Transaction already processed (idempotent)",
        },
      });
    }

    // Success
    return NextResponse.json(
      { success: true, data: { transaction: result.transaction } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

