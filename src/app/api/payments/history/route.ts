import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/middleware/with-auth";
import { handleApiError } from "@/lib/middleware/error-handler";
import { historyQuerySchema } from "@/lib/validation/payment.schema";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/payments/history
 *
 * Paginated transaction history with filters (FR-14).
 *
 * Query params:
 *   page      — Page number (default: 1)
 *   limit     — Items per page (default: 20, max: 100)
 *   type      — TRANSFER | BILL_PAY | LOAN_REPAYMENT
 *   status    — PENDING | COMPLETED | FAILED | COMPENSATED
 *   from      — Start date (ISO string)
 *   to        — End date (ISO string)
 *   search    — Search in description
 *   accountId — Filter by specific account
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireAuth(auth);

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = historyQuerySchema.parse(searchParams);

    const isOperator = auth.role === "SUPPORT_OPERATOR";
    let where: Prisma.TransactionWhereInput = {};

    if (isOperator) {
      if (query.search) {
        // Find users matching name, email, or national ID
        const matchingUsers = await prisma.user.findMany({
          where: {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { nationalId: { contains: query.search, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        const matchingUserIds = matchingUsers.map((u) => u.id);

        const targetAccounts = await prisma.account.findMany({
          where: { userId: { in: matchingUserIds } },
          select: { id: true },
        });
        const targetAccountIds = targetAccounts.map((a) => a.id);

        where = {
          OR: [
            { fromAccountId: { in: targetAccountIds } },
            { toAccountId: { in: targetAccountIds } },
            { description: { contains: query.search, mode: "insensitive" } },
            { requestId: { contains: query.search, mode: "insensitive" } },
          ],
        };
      } else {
        where = {};
      }
    } else {
      // Get user's accounts to scope the query
      const userAccounts = await prisma.account.findMany({
        where: { userId: auth.userId },
        select: { id: true },
      });
      const accountIds = userAccounts.map((a) => a.id);

      if (accountIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { items: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 },
        });
      }

      where = {
        OR: query.accountId
          ? [{ fromAccountId: query.accountId }, { toAccountId: query.accountId }]
          : [{ fromAccountId: { in: accountIds } }, { toAccountId: { in: accountIds } }],
      };

      if (query.search) {
        where.description = { contains: query.search, mode: "insensitive" };
      }
    }

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }

    // Execute with pagination
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          fromAccount: {
            select: {
              accountNumber: true,
              user: {
                select: {
                  fullName: true,
                }
              }
            }
          },
          toAccount: {
            select: {
              accountNumber: true,
              user: {
                select: {
                  fullName: true,
                }
              }
            }
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

