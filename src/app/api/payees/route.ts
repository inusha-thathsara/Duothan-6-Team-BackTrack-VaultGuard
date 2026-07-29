import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { createPayeeSchema } from "@/lib/validation/payment.schema";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/payees
 *
 * List user's saved payees and billers (FR-09).
 * Query params: ?type=PERSON|BILLER
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const typeParam = request.nextUrl.searchParams.get("type");
    const where: Record<string, unknown> = { userId: auth.userId };
    if (typeParam === "PERSON" || typeParam === "BILLER") {
      where.type = typeParam;
    }

    const payees = await prisma.payee.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { payees },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/payees
 *
 * Add a new saved payee or biller (FR-09).
 *
 * Request body: { name, accountNumber, bankCode?, type? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    const body = await request.json();
    const input = createPayeeSchema.parse(body);

    const payee = await prisma.payee.create({
      data: {
        userId: auth.userId,
        name: input.name,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode || null,
        type: input.type,
      },
    });

    return NextResponse.json(
      { success: true, data: { payee } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

