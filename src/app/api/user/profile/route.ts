import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/services/auth/password";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            type: true,
            balance: true,
            currency: true,
            status: true,
          },
        },
        mfaFactors: {
          select: {
            id: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        nationalId: user.nationalId,
        phoneNumber: user.phoneNumber || "",
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        accounts: user.accounts,
        mfaFactorsCount: user.mfaFactors.length,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AuthError") {
      const authErr = error as unknown as { message: string; statusCode: number };
      return NextResponse.json({ success: false, error: authErr.message }, { status: authErr.statusCode });
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, string> = {};
    if (parsed.fullName) updateData.fullName = parsed.fullName;
    if (parsed.phoneNumber) updateData.phoneNumber = parsed.phoneNumber;
    if (parsed.email) updateData.email = parsed.email.toLowerCase();

    if (parsed.newPassword) {
      if (parsed.currentPassword) {
        const isCurrentValid = await verifyPassword(parsed.currentPassword, user.passwordHash);
        if (!isCurrentValid) {
          return NextResponse.json(
            { success: false, error: "Current password is incorrect" },
            { status: 400 }
          );
        }
      }
      updateData.passwordHash = await hashPassword(parsed.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        nationalId: updated.nationalId,
        mfaEnabled: updated.mfaEnabled,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AuthError") {
      const authErr = error as unknown as { message: string; statusCode: number };
      return NextResponse.json({ success: false, error: authErr.message }, { status: authErr.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
