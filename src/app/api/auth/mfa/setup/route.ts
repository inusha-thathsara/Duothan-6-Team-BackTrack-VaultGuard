import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { generateTotpSecret, generateTotpUri } from "@/lib/services/auth/totp";
import { generateQrCodeDataUrl, generateQrCodeSvg } from "@/lib/utils/qrcode";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const dbUser = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    const secret = generateTotpSecret(16);
    const otpauthUrl = generateTotpUri(dbUser.email, secret, "VaultGuard");
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl, { size: 220, margin: 2 });
    const qrCodeSvg = await generateQrCodeSvg(otpauthUrl, { size: 220, margin: 2 });

    // Save factor in PostgreSQL database
    await prisma.mfaFactor.create({
      data: {
        userId: dbUser.id,
        secret,
        backupCodes: [
          Math.floor(10000000 + Math.random() * 90000000).toString(),
          Math.floor(10000000 + Math.random() * 90000000).toString(),
          Math.floor(10000000 + Math.random() * 90000000).toString(),
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl,
        qrCodeDataUrl,
        qrCodeSvg,
        issuer: "VaultGuard",
        account: dbUser.email,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AuthError") {
      const authErr = error as unknown as { message: string; statusCode: number };
      return NextResponse.json({ success: false, error: authErr.message }, { status: authErr.statusCode });
    }
    return NextResponse.json(
      { success: false, error: "Failed to initialize 2FA setup" },
      { status: 500 }
    );
  }
}
