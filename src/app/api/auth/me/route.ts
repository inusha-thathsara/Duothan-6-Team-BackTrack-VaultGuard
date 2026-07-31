import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("vaultguard_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Session expired or invalid" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        nationalId: true,
        phoneNumber: true,
        role: true,
        mfaEnabled: true,
      },
    });

    if (dbUser) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.fullName,
            nationalId: dbUser.nationalId || payload.nationalId,
            phoneNumber: dbUser.phoneNumber,
            role: dbUser.role,
            mfaEnabled: dbUser.mfaEnabled,
            trustedDevice: true,
          },
        },
      });
    }
  } catch (error) {
    // Return JWT payload if DB query is temporarily unreachable
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        nationalId: payload.nationalId,
        role: payload.role,
        mfaEnabled: false,
        trustedDevice: true,
      },
    },
  });
}
