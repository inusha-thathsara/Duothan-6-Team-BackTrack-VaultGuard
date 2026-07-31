import { NextRequest, NextResponse } from "next/server";
import { signSessionToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/services/auth/password";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Email or Customer ID required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const emailLower = email.toLowerCase().trim();

    // Query Prisma PostgreSQL database
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailLower },
          { nationalId: email },
        ],
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify bcrypt password hash strictly
    const isValid = await verifyPassword(password, dbUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user has MFA enabled
    if (dbUser.mfaEnabled) {
      const mfaPayload = {
        userId: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        nationalId: dbUser.nationalId || "",
        role: dbUser.role as "CUSTOMER" | "SUPPORT_OPERATOR",
      };

      const mfaPendingToken = await signSessionToken(mfaPayload);
      const response = NextResponse.json({
        success: true,
        requiresMfa: true,
        data: {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.fullName,
            nationalId: dbUser.nationalId,
            role: dbUser.role,
            mfaEnabled: true,
          },
        },
      });

      response.cookies.set("vaultguard_mfa_pending", mfaPendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      });

      return response;
    }

    // Issue full JWT session token for non-MFA users
    const userPayload = {
      userId: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      nationalId: dbUser.nationalId || "",
      role: dbUser.role as "CUSTOMER" | "SUPPORT_OPERATOR",
    };

    const token = await signSessionToken(userPayload);
    const response = NextResponse.json({
      success: true,
      requiresMfa: false,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          nationalId: dbUser.nationalId,
          role: dbUser.role,
          mfaEnabled: false,
          trustedDevice: true,
        },
        token,
      },
    });

    response.cookies.set("vaultguard_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid login credentials format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Authentication database connection failed" },
      { status: 500 }
    );
  }
}
