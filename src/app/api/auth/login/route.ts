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

    // --- Try real database authentication first ---
    let dbOffline = false;
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailLower },
            { nationalId: email },
          ],
        },
      });

      if (dbUser) {
        // Found a real user — verify password strictly, no fallback
        const isValid = await verifyPassword(password, dbUser.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { success: false, error: "Invalid email or password" },
            { status: 401 }
          );
        }

        // Password correct — issue session
        const userPayload = {
          userId: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          nationalId: dbUser.nationalId || "941820491V",
          role: dbUser.role as "CUSTOMER" | "SUPPORT_OPERATOR",
        };

        const token = await signSessionToken(userPayload);
        const response = NextResponse.json({
          success: true,
          data: {
            user: {
              id: dbUser.id,
              email: dbUser.email,
              fullName: dbUser.fullName,
              nationalId: dbUser.nationalId,
              role: dbUser.role,
              mfaEnabled: dbUser.mfaEnabled,
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
      }

      // No user found in DB — reject
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    } catch (dbErr) {
      console.warn("[Auth Login API] Database connection offline. Using demo fallback mode.");
      dbOffline = true;
    }

    // --- Demo fallback ONLY when database is unreachable ---
    if (dbOffline) {
      // Only accept the known demo credential
      const isDemoUser = emailLower === "alex.perera@vaultguard.bank" && password === "securepass";
      if (!isDemoUser) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const userPayload = {
        userId: "usr_alex_2065",
        email: "alex.perera@vaultguard.bank",
        fullName: "Alex Perera",
        nationalId: "941820491V",
        role: "CUSTOMER" as const,
      };

      const token = await signSessionToken(userPayload);
      const response = NextResponse.json({
        success: true,
        data: {
          user: {
            id: "usr_alex_2065",
            email: "alex.perera@vaultguard.bank",
            fullName: "Alex Perera",
            nationalId: "941820491V",
            role: "CUSTOMER",
            mfaEnabled: true,
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
    }

    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid login credentials" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Authentication server error" },
      { status: 500 }
    );
  }
}
