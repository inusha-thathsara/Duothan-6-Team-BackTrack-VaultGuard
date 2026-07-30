import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("vaultguard_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Session expired or invalid" }, { status: 401 });
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
        mfaEnabled: true,
        trustedDevice: true,
      },
    },
  });
}
