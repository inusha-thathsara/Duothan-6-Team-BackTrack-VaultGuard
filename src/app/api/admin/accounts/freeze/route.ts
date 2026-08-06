import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { AccountStatus } from "@prisma/client";
import { z } from "zod";

const freezeSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
  status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    requireRole(auth, "SUPPORT_OPERATOR");

    const body = await request.json();
    const { accountNumber, status, reason } = freezeSchema.parse(body);

    const account = await prisma.account.findFirst({
      where: {
        OR: [
          { accountNumber },
          { id: accountNumber },
        ],
      },
      include: { user: true },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const updatedAccount = await prisma.account.update({
      where: { id: account.id },
      data: {
        status: status as AccountStatus,
      },
    });

    // Create immutable Audit Event entry (NFR-O3)
    await prisma.auditEvent.create({
      data: {
        eventId: `evt_freeze_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        actor: auth.userId,
        actorRole: auth.role,
        action: status === "FROZEN" ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
        resource: "account",
        resourceId: account.id,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        metadata: {
          accountNumber: account.accountNumber,
          previousStatus: account.status,
          newStatus: status,
          reason: reason || "Support Operator administrative action",
          affectedUserId: account.userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: updatedAccount.id,
          accountNumber: updatedAccount.accountNumber,
          type: updatedAccount.type,
          status: updatedAccount.status,
          balance: updatedAccount.balance,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid status parameters" },
        { status: 400 }
      );
    }
    const msg = error instanceof Error ? error.message : "Failed to update account status";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
