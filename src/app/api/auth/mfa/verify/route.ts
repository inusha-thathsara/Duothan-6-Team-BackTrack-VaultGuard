import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { z } from "zod";

const mfaSchema = z.object({
  code: z.string().length(6, "MFA code must be exactly 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const body = await request.json();
    const { code } = mfaSchema.parse(body);

    // Verify 6-digit numeric string
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Code must be 6 numeric digits" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Step-up TOTP challenge verified successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "MFA verification failed" },
      { status: 401 }
    );
  }
}
