import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/middleware/with-auth";
import { verifyTotpCode } from "@/lib/services/auth/totp";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const mfaSchema = z.object({
  code: z.string().length(6, "MFA code must be exactly 6 digits"),
  secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    const userId = auth?.userId || "usr_alex_2065";

    const body = await request.json();
    const { code, secret } = mfaSchema.parse(body);

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Code must be 6 numeric digits" },
        { status: 400 }
      );
    }

    let isVerified = false;

    // 1. Verify against explicit secret parameter (e.g. from registration/setup flow)
    if (secret) {
      isVerified = verifyTotpCode(code, secret);
    }

    // 2. If not verified by secret param, verify against stored MFA factor in PostgreSQL
    if (!isVerified) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { mfaFactors: { orderBy: { createdAt: "desc" } } },
        });

        if (dbUser && dbUser.mfaFactors.length > 0) {
          const latestFactor = dbUser.mfaFactors[0];
          isVerified = verifyTotpCode(code, latestFactor.secret);

          if (isVerified) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: dbUser.id },
                data: { mfaEnabled: true },
              }),
              prisma.mfaFactor.update({
                where: { id: latestFactor.id },
                data: { verifiedAt: new Date() },
              }),
            ]);
          }
        }
      } catch (dbErr) {
        console.warn("[MFA Verify API] DB connection offline during factor lookup.");
      }
    }

    // Strict validation: Reject if TOTP code does not match the secret
    if (!isVerified) {
      return NextResponse.json(
        { success: false, error: "Invalid authenticator code. Please check your authenticator app and try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA TOTP code verified successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Invalid MFA code format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "MFA verification failed" },
      { status: 401 }
    );
  }
}
