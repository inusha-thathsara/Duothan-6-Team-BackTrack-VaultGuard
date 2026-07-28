import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { loanQuerySchema } from "@/lib/validation/loan.schema";
import { getUserLoans } from "@/lib/services/loans/loan.service";

/**
 * GET /api/loans
 *
 * List user's loans with repayment schedules (FR-15).
 * Query params: ?status=ACTIVE|PAID_OFF|DEFAULTED
 *
 * Returns: active loans with principal, outstanding balance,
 * interest rate, next due date, and full repayment schedule.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const statusParam = request.nextUrl.searchParams.get("status");
    const query = loanQuerySchema.parse({ status: statusParam || undefined });

    const loans = await getUserLoans(auth.userId, query.status);

    return NextResponse.json({
      success: true,
      data: { loans },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
