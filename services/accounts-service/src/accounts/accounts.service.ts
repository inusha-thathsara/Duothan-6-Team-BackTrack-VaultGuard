import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatementsQueryDto } from './dto/statements-query.dto';
import { CreateDefaultAccountDto } from './dto/create-default-account.dto';
import { AccountType, AccountStatus } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      accountNumber: acc.accountNumber,
      type: acc.type,
      balance: acc.balance.toFixed(2),
      currency: acc.currency,
      status: acc.status,
      dailyLimit: acc.dailyLimit.toFixed(2),
      singleLimit: acc.singleLimit.toFixed(2),
    }));
  }

  async getAccountById(accountId: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found or access denied.',
          details: null,
        },
      });
    }

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      type: account.type,
      balance: account.balance.toFixed(2),
      currency: account.currency,
      status: account.status,
      dailyLimit: account.dailyLimit.toFixed(2),
      singleLimit: account.singleLimit.toFixed(2),
      createdAt: account.createdAt,
    };
  }

  async getStatements(accountId: string, userId: string, query: StatementsQueryDto) {
    // 1. Verify account ownership
    await this.getAccountById(accountId, userId);

    const { from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // 2. Build date filters
    const dateFilter: any = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      dateFilter.lte = new Date(to);
    }

    const whereCondition: any = {
      OR: [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ],
    };

    if (from || to) {
      whereCondition.createdAt = dateFilter;
    }

    // 3. Query transactions & total count
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: whereCondition,
      }),
    ]);

    const formattedData = transactions.map((txn) => {
      const isDebit = txn.fromAccountId === accountId;
      const amountFormatted = isDebit ? `-${txn.amount.toFixed(2)}` : `+${txn.amount.toFixed(2)}`;

      return {
        id: txn.id,
        date: txn.createdAt.toISOString(),
        description: txn.description || (isDebit ? 'Debit Transaction' : 'Credit Deposit'),
        type: txn.type,
        amount: amountFormatted,
        currency: txn.currency,
        status: txn.status,
        reference: txn.reference || `TXN-${txn.id.substring(0, 8)}`,
      };
    });

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createDefaultAccounts(dto: CreateDefaultAccountDto) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);

    const accounts = await this.prisma.$transaction([
      this.prisma.account.create({
        data: {
          userId: dto.userId,
          accountNumber: `VG-SAV-${randomSuffix}`,
          type: AccountType.SAVINGS,
          balance: 0.00,
          currency: 'LKR',
          status: AccountStatus.ACTIVE,
        },
      }),
      this.prisma.account.create({
        data: {
          userId: dto.userId,
          accountNumber: `VG-CHK-${randomSuffix + 1}`,
          type: AccountType.CHECKING,
          balance: 0.00,
          currency: 'LKR',
          status: AccountStatus.ACTIVE,
        },
      }),
    ]);

    return accounts;
  }
}
