import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { auditService } from "@/lib/services/audit/audit.service";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const { id: customerId } = await params;

    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        fullName: true,
        nationalId: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            type: true,
            balance: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!customer) {
      const response = NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
      return applySecurityHeaders(response, correlationId);
    }

    // Mandatory Audit Event for Support Operator Lookup (FR-22)
    await auditService.recordAuditEvent({
      actor: auth.userId,
      actorRole: auth.role,
      action: "admin.customer_lookup",
      resource: "user",
      resourceId: customerId,
      metadata: { lookupCustomerEmail: customer.email },
      correlationId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: customer,
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
