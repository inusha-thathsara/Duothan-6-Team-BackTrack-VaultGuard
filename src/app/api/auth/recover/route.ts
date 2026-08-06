import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/services/auth/password";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";
import { auditService } from "@/lib/services/audit/audit.service";
import { z } from "zod";

const executeRecoverSchema = z.object({
  token: z.string().min(1, "Recovery token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

/**
 * POST /api/auth/recover
 * Customer recovers their account using an operator-issued token (resets password & disables MFA).
 */
export async function POST(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const body = await req.json();
    const { token, newPassword } = executeRecoverSchema.parse(body);

    // Look up token in DB
    const recoveryRecord = await prisma.accountRecoveryToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!recoveryRecord) {
      const response = NextResponse.json(
        { success: false, error: "Invalid account recovery token." },
        { status: 400 }
      );
      return applySecurityHeaders(response, correlationId);
    }

    if (recoveryRecord.usedAt) {
      const response = NextResponse.json(
        { success: false, error: "This recovery token has already been used." },
        { status: 400 }
      );
      return applySecurityHeaders(response, correlationId);
    }

    if (new Date() > recoveryRecord.expiresAt) {
      const response = NextResponse.json(
        { success: false, error: "This recovery token has expired." },
        { status: 400 }
      );
      return applySecurityHeaders(response, correlationId);
    }

    const passwordHash = await hashPassword(newPassword);

    // Update password, reset MFA status, and clear MFA factors in database transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: recoveryRecord.userId },
        data: {
          passwordHash,
          mfaEnabled: false, // Turn off MFA so they can login and enroll a new device
        },
      }),
      prisma.mfaFactor.deleteMany({
        where: { userId: recoveryRecord.userId },
      }),
      prisma.accountRecoveryToken.update({
        where: { id: recoveryRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Record recovery success in audit log
    await auditService.recordAuditEvent({
      actor: recoveryRecord.userId,
      actorRole: "CUSTOMER",
      action: "auth.account_recovered",
      resource: "user",
      resourceId: recoveryRecord.userId,
      metadata: {
        email: recoveryRecord.user.email,
        mfaReset: true,
      },
      correlationId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account recovered successfully. Password updated and MFA reset. Please sign in to enroll your new security factors.",
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
