import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTrustService } from '../src/auth/device-trust.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DeviceTrustService', () => {
  let service: DeviceTrustService;

  const mockPrismaService = {
    trustedDevice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTrustService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DeviceTrustService>(DeviceTrustService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a deterministic fingerprint from userAgent and IP subnet', () => {
    const res1 = service.createFingerprint('Mozilla/5.0 (Windows NT 10.0)', '192.168.1.50');
    const res2 = service.createFingerprint('Mozilla/5.0 (Windows NT 10.0)', '192.168.1.99'); // same subnet

    expect(res1.fingerprint).toEqual(res2.fingerprint);
  });

  it('should check if a device is trusted', async () => {
    mockPrismaService.trustedDevice.findFirst.mockResolvedValue({ id: 'dev-1' });

    const isTrusted = await service.isTrustedDevice('user-1', 'fingerprint-123');
    expect(isTrusted).toBe(true);
    expect(mockPrismaService.trustedDevice.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', fingerprint: 'fingerprint-123' },
    });
  });

  it('should list trusted devices for a user', async () => {
    const mockDevices = [
      {
        id: 'dev-1',
        label: 'Chrome Browser',
        fingerprint: 'fp-1',
        trustedAt: new Date('2026-07-25T10:00:00.000Z'),
      },
    ];

    mockPrismaService.trustedDevice.findMany.mockResolvedValue(mockDevices);

    const list = await service.listDevices('user-1', 'fp-1');
    expect(list).toHaveLength(1);
    expect(list[0].isCurrent).toBe(true);
    expect(list[0].label).toEqual('Chrome Browser');
  });
});
