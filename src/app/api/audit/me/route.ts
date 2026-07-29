import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { auditService } from "@/lib/services/audit/audit.service";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { applyRateLimit } from "@/lib/middleware/rate-limiter";
import { handleError } from "@/lib/middleware/error-handler";

export async function GET(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const rateLimitError = applyRateLimit(req, "general");
    if (rateLimitError) return applySecurityHeaders(rateLimitError, correlationId);

    const auth = await getAuthContext(req);
    requireAuth(auth);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await auditService.getUserAuditLogs(auth.userId, limit, offset);

    const response = NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}

