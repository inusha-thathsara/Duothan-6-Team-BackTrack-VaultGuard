import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";

export async function GET(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const entries = await prisma.deadLetterEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const response = NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}

