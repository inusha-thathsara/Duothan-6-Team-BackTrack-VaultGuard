import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";
import { auditService } from "@/lib/services/audit/audit.service";

/**
 * GET /api/admin/customers
 * Support Operator search for customer records (FR-22, NFR-O3).
 */
export async function GET(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const query = req.nextUrl.searchParams.get("query")?.trim() || "";

    const customers = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { nationalId: { contains: query, mode: "insensitive" } },
              { fullName: { contains: query, mode: "insensitive" } },
              { accounts: { some: { accountNumber: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {},
      select: {
        id: true,
        email: true,
        fullName: true,
        nationalId: true,
        phoneNumber: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            type: true,
            balance: true,
            currency: true,
            status: true,
            dailyLimit: true,
            singleLimit: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    if (query) {
      await auditService.recordAuditEvent({
        actor: auth.userId,
        actorRole: auth.role,
        action: "admin.customer_search",
        resource: "user",
        resourceId: query,
        metadata: { searchMatchCount: customers.length },
        correlationId,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
    }

    const response = NextResponse.json({
      success: true,
      data: { customers },
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
