import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/middleware/with-auth";
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
    const userId = auth?.userId || "usr_alex_2065";

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (user) {
      return NextResponse.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          nationalId: user.nationalId,
          phoneNumber: user.phoneNumber || "+94 77 123 4567",
          role: user.role,
          mfaEnabled: user.mfaEnabled,
          accounts: user.accounts,
          mfaFactorsCount: user.mfaFactors.length,
          createdAt: user.createdAt,
        },
      });
    }

    // Demo fallback user profile
    return NextResponse.json({
      success: true,
      data: {
        id: "usr_alex_2065",
        email: "alex.perera@vaultguard.bank",
        fullName: "Alex Perera",
        nationalId: "941820491V",
        phoneNumber: "+94 77 123 4567",
        role: "CUSTOMER",
        mfaEnabled: true,
        accounts: [
          {
            id: "acc_sav_9901",
            accountNumber: "1008920192",
            type: "SAVINGS",
            balance: 142500.5,
            currency: "USD",
            status: "ACTIVE",
          },
        ],
        mfaFactorsCount: 1,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    const userId = auth?.userId || "usr_alex_2065";
    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const updateData: any = {};
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
        where: { id: userId },
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
    }

    // Demo mode response
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully (demo mode)",
      data: {
        id: userId,
        email: parsed.email || "alex.perera@vaultguard.bank",
        fullName: parsed.fullName || "Alex Perera",
        phoneNumber: parsed.phoneNumber || "+94 77 123 4567",
        nationalId: "941820491V",
        mfaEnabled: true,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
