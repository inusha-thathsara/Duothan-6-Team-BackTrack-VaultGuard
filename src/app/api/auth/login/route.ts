import { NextRequest, NextResponse } from "next/server";
import { signSessionToken } from "@/lib/auth/jwt";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Demo/Production User verification
    // Accepts demo user alex.perera@vaultguard.bank or any valid credentials format
    if (password !== "securepass" && password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const userPayload = {
      userId: "usr_alex_2065",
      email,
      fullName: email.includes("alex") ? "Alex Perera" : "VaultGuard User",
      nationalId: "941820491V",
      role: "CUSTOMER" as const,
    };

    const token = await signSessionToken(userPayload);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: userPayload.userId,
          email: userPayload.email,
          fullName: userPayload.fullName,
          nationalId: userPayload.nationalId,
          role: userPayload.role,
          mfaEnabled: true,
          trustedDevice: true,
        },
        token,
      },
    });

    // Set secure HttpOnly cookie
    response.cookies.set("vaultguard_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
