import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";
import { auditService } from "@/lib/services/audit/audit.service";
import crypto from "crypto";
import { z } from "zod";

const recoverRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  nationalId: z.string().min(1, "National ID is required"),
  fullName: z.string().min(1, "Full name is required"),
});

/**
 * POST /api/admin/recover
 * Support Operator initiates account recovery for a customer (clearing MFA & resetting password).
 */
export async function POST(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const body = await req.json();
    const { email, nationalId, fullName } = recoverRequestSchema.parse(body);

    const emailClean = email.trim().toLowerCase();
    const nationalIdClean = nationalId.trim();
    const fullNameClean = fullName.trim();

    // Verify user exists and details match
    const targetUser = await prisma.user.findFirst({
      where: {
        email: { equals: emailClean, mode: "insensitive" },
        nationalId: { equals: nationalIdClean, mode: "insensitive" },
        fullName: { equals: fullNameClean, mode: "insensitive" },
      },
    });

    if (!targetUser) {
      const response = NextResponse.json(
        { success: false, error: "No customer account matches the provided details." },
        { status: 404 }
      );
      return applySecurityHeaders(response, correlationId);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 mins expiry

    // Invalidate prior recovery tokens for this user in database transaction
    await prisma.$transaction([
      prisma.accountRecoveryToken.updateMany({
        where: { userId: targetUser.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.accountRecoveryToken.create({
        data: {
          userId: targetUser.id,
          token,
          expiresAt,
        },
      }),
    ]);

    // Log the operator action to immutable audit trail
    await auditService.recordAuditEvent({
      actor: auth.userId,
      actorRole: auth.role,
      action: "admin.account_recovery_initiated",
      resource: "user",
      resourceId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        initiatedBy: auth.userId,
      },
      correlationId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const recoveryLink = `${appUrl}/recovery?token=${token}`;

    const response = NextResponse.json({
      success: true,
      message: "Customer account recovery initiated. Link generated.",
      data: {
        recoveryToken: token,
        recoveryLink,
        expiresInMinutes: 30,
      },
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
