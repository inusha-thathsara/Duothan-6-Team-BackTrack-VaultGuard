import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MfaService } from '../src/auth/mfa.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: any) => defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('should generate a valid MFA setup with secret, QR URI, and backup codes', async () => {
    const email = 'demo@vaultguard.com';
    const setup = await service.generateMfaSetup(email);

    expect(setup.secret).toBeDefined();
    expect(typeof setup.secret).toBe('string');

    expect(setup.otpauthUrl).toContain('otpauth://totp/');
    expect(setup.otpauthUrl).toContain(encodeURIComponent(email));

    expect(setup.qrUri).toContain('data:image/png;base64,');

    expect(setup.rawBackupCodes).toHaveLength(5);
    expect(setup.hashedBackupCodes).toHaveLength(5);
    expect(setup.rawBackupCodes[0]).not.toEqual(setup.hashedBackupCodes[0]);
  });

  it('should verify single-use backup codes correctly', async () => {
    const { rawBackupCodes, hashedBackupCodes } = await service.generateBackupCodes();

    const validCode = rawBackupCodes[2];
    const result = await service.verifyBackupCode(validCode, hashedBackupCodes);

    expect(result.isValid).toBe(true);
    expect(result.matchedIndex).toEqual(2);

    const invalidResult = await service.verifyBackupCode('INVALID8', hashedBackupCodes);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.matchedIndex).toEqual(-1);
  });
});
