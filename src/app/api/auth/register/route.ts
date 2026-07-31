import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/services/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  nationalId: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const emailLower = parsed.email.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailLower },
          ...(parsed.nationalId ? [{ nationalId: parsed.nationalId }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email or National ID already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.password);

    // Create user & initial account atomically in Prisma
    const accNum = `1008${Math.floor(100000 + Math.random() * 900000)}`;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: emailLower,
          passwordHash,
          fullName: parsed.fullName,
          nationalId: parsed.nationalId || `NIC-${Date.now()}`,
          phoneNumber: parsed.phoneNumber || "",
          role: "CUSTOMER",
          mfaEnabled: false,
        },
      });

      await tx.account.create({
        data: {
          userId: newUser.id,
          accountNumber: accNum,
          type: "SAVINGS",
          balance: 25000.0,
          currency: "USD",
          status: "ACTIVE",
        },
      });

      return newUser;
    });

    const userPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      nationalId: user.nationalId || "",
      role: user.role as "CUSTOMER" | "SUPPORT_OPERATOR",
    };

    const token = await signSessionToken(userPayload);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          nationalId: user.nationalId,
          phoneNumber: user.phoneNumber,
          role: user.role,
          mfaEnabled: false,
          accountNumber: accNum,
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account in database" },
      { status: 500 }
    );
  }
}
