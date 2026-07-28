import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../src/accounts/accounts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AccountType, AccountStatus, TransactionType, TransactionStatus } from '@prisma/client';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccounts', () => {
    it('should return user accounts with formatted balances', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          userId: 'user-1',
          accountNumber: 'VG-SAV-001234',
          type: AccountType.SAVINGS,
          balance: { toFixed: () => '250000.00' },
          currency: 'LKR',
          status: AccountStatus.ACTIVE,
          dailyLimit: { toFixed: () => '500000.00' },
          singleLimit: { toFixed: () => '250000.00' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getAccounts('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].accountNumber).toEqual('VG-SAV-001234');
      expect(result[0].balance).toEqual('250000.00');
      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('getAccountById', () => {
    it('should return account detail if user owns account', async () => {
      const mockAccount = {
        id: 'acc-1',
        userId: 'user-1',
        accountNumber: 'VG-SAV-001234',
        type: AccountType.SAVINGS,
        balance: { toFixed: () => '250000.00' },
        currency: 'LKR',
        status: AccountStatus.ACTIVE,
        dailyLimit: { toFixed: () => '500000.00' },
        singleLimit: { toFixed: () => '250000.00' },
        createdAt: new Date(),
      };

      mockPrismaService.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.getAccountById('acc-1', 'user-1');
      expect(result.id).toEqual('acc-1');
    });

    it('should throw NotFoundException if account belongs to another user or does not exist', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      await expect(service.getAccountById('acc-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatements', () => {
    it('should return paginated date-filtered statements', async () => {
      const mockAccount = {
        id: 'acc-1',
        userId: 'user-1',
        accountNumber: 'VG-SAV-001234',
        type: AccountType.SAVINGS,
        balance: { toFixed: () => '250000.00' },
        currency: 'LKR',
        status: AccountStatus.ACTIVE,
        dailyLimit: { toFixed: () => '500000.00' },
        singleLimit: { toFixed: () => '250000.00' },
        createdAt: new Date(),
      };

      const mockTransactions = [
        {
          id: 'txn-1',
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: { toFixed: () => '15000.00' },
          currency: 'LKR',
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          description: 'Transfer to Nimali',
          reference: 'TXN-001',
          createdAt: new Date('2026-07-25T14:30:00.000Z'),
        },
      ];

      mockPrismaService.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.getStatements('acc-1', 'user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toEqual('-15000.00'); // Debit transaction
      expect(result.pagination.total).toEqual(1);
    });
  });
});
