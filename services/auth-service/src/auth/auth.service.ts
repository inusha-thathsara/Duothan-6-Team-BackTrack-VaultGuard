import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt.service';
import { MfaService } from './mfa.service';
import { DeviceTrustService } from './device-trust.service';
import { EventBusService } from '../events/event-bus.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly mfaService: MfaService,
    private readonly deviceTrustService: DeviceTrustService,
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { nationalId, fullName, email, password } = dto;

    // 1. Verify identity against surviving backup records (§5.2)
    const backupRecord = await this.prisma.backupIdentity.findUnique({
      where: { nationalId },
    });

    if (
      !backupRecord ||
      backupRecord.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()
    ) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_IDENTITY_NOT_FOUND',
          message: 'Identity could not be verified against backup records.',
          details: null,
        },
      });
    }

    // 2. Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'AUTH_EMAIL_EXISTS',
          message: 'A user with this email address already exists.',
          details: null,
        },
      });
    }

    // 3. Hash password and create user
    const passwordHash = await this.passwordService.hash(password);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nationalId,
        fullName: backupRecord.fullName,
        role: UserRole.CUSTOMER,
        mfaEnabled: false,
      },
    });

    // 4. Emit auth.register event to EventBus (FR-19)
    this.eventBus.emit({
      eventType: 'auth.register',
      actor: newUser.id,
      actorRole: newUser.role,
      resource: 'user',
      resourceId: newUser.id,
      metadata: { email: newUser.email, nationalId: newUser.nationalId },
      timestamp: new Date().toISOString(),
    });

    // 5. Trigger internal HTTP call to Accounts Service to create default accounts
    try {
      const accountsServiceUrl = this.configService.get<string>('ACCOUNTS_SERVICE_URL', 'http://localhost:4002');
      const internalSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET', 'vaultguard-internal-secret-key-2026');

      await fetch(`${accountsServiceUrl}/internal/accounts/create-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret,
        },
        body: JSON.stringify({
          userId: newUser.id,
          fullName: newUser.fullName,
        }),
      }).catch(() => {
        console.warn('⚠️ Accounts Service unreachable during registration (degraded mode).');
      });
    } catch {
      // Degraded mode tolerant
    }

    return {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      mfaRequired: true,
      message: 'Identity verified. Please set up MFA to complete enrollment.',
    };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await this.passwordService.verify(password, user.passwordHash))) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'The email or password you entered is incorrect.',
          details: null,
        },
      });
    }

    // Check device trust (FR-03)
    const { fingerprint } = this.deviceTrustService.createFingerprint(userAgent, ip);
    const isTrusted = await this.deviceTrustService.isTrustedDevice(user.id, fingerprint);

    // Require MFA if MFA is enabled OR device is untrusted
    if (user.mfaEnabled || !isTrusted) {
      const mfaToken = await this.jwtAuthService.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        requiresMfa: true,
        untrustedDevice: !isTrusted,
        mfaToken,
        message: !isTrusted
          ? 'Unrecognized device detected. MFA verification required.'
          : 'MFA verification required.',
      };
    }

    const accessToken = await this.jwtAuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { rawToken: refreshToken } = await this.jwtAuthService.createRefreshToken(user.id);

    // Emit auth.login event
    this.eventBus.emit({
      eventType: 'auth.login',
      actor: user.id,
      actorRole: user.role,
      resource: 'session',
      metadata: { email: user.email, isTrustedDevice: isTrusted },
      timestamp: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_REFRESH_EXPIRED',
          message: 'Refresh token is missing.',
          details: null,
        },
      });
    }

    const result = await this.jwtAuthService.rotateRefreshToken(rawRefreshToken);

    if (!result) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_REFRESH_EXPIRED',
          message: 'Refresh token has expired or been revoked.',
          details: null,
        },
      });
    }

    return result;
  }

  async logout(rawRefreshToken: string, userId?: string) {
    if (rawRefreshToken) {
      await this.jwtAuthService.revokeRefreshToken(rawRefreshToken);
    }

    if (userId) {
      this.eventBus.emit({
        eventType: 'auth.logout',
        actor: userId,
        actorRole: 'CUSTOMER',
        resource: 'session',
        timestamp: new Date().toISOString(),
      });
    }

    return { message: 'Logged out successfully.' };
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: 'User not found.',
          details: null,
        },
      });
    }

    const mfaSetup = await this.mfaService.generateMfaSetup(user.email);

    const existingFactor = await this.prisma.mfaFactor.findFirst({
      where: { userId },
    });

    if (existingFactor) {
      await this.prisma.mfaFactor.update({
        where: { id: existingFactor.id },
        data: {
          secret: mfaSetup.secret,
          backupCodes: mfaSetup.hashedBackupCodes,
          verifiedAt: null,
        },
      });
    } else {
      await this.prisma.mfaFactor.create({
        data: {
          userId,
          secret: mfaSetup.secret,
          backupCodes: mfaSetup.hashedBackupCodes,
        },
      });
    }

    this.eventBus.emit({
      eventType: 'auth.mfa_change',
      actor: userId,
      actorRole: user.role,
      resource: 'mfa_factor',
      metadata: { action: 'setup' },
      timestamp: new Date().toISOString(),
    });

    return {
      secret: mfaSetup.secret,
      qrUri: mfaSetup.qrUri,
      backupCodes: mfaSetup.rawBackupCodes,
    };
  }

  async verifyMfa(dto: MfaVerifyDto, userAgent?: string, ip?: string) {
    const { mfaToken, code } = dto;

    const payload = await this.jwtAuthService.verifyAccessToken(mfaToken);

    if (!payload || !payload.sub) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_MFA_SESSION_EXPIRED',
          message: 'MFA session token is invalid or expired.',
          details: null,
        },
      });
    }

    const userId = payload.sub;

    const mfaFactor = await this.prisma.mfaFactor.findFirst({
      where: { userId },
    });

    if (!mfaFactor) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_MFA_NOT_CONFIGURED',
          message: 'MFA factor is not configured for this user.',
          details: null,
        },
      });
    }

    let isVerified = this.mfaService.verifyTotp(code, mfaFactor.secret);

    if (!isVerified && mfaFactor.backupCodes.length > 0) {
      const backupCheck = await this.mfaService.verifyBackupCode(code, mfaFactor.backupCodes);
      if (backupCheck.isValid) {
        isVerified = true;

        const updatedBackupCodes = [...mfaFactor.backupCodes];
        updatedBackupCodes.splice(backupCheck.matchedIndex, 1);

        await this.prisma.mfaFactor.update({
          where: { id: mfaFactor.id },
          data: { backupCodes: updatedBackupCodes },
        });
      }
    }

    if (!isVerified) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_MFA_INVALID',
          message: 'The MFA verification code entered is invalid.',
          details: null,
        },
      });
    }

    // Enable MFA on user profile
    await this.prisma.$transaction([
      this.prisma.mfaFactor.update({
        where: { id: mfaFactor.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
    ]);

    // Automatically register current device as trusted upon successful MFA verification
    if (userAgent && ip) {
      await this.deviceTrustService.registerDevice(userId, userAgent, ip);
      this.eventBus.emit({
        eventType: 'auth.device_new',
        actor: userId,
        actorRole: payload.role,
        resource: 'device',
        metadata: { userAgent, ip },
        timestamp: new Date().toISOString(),
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const accessToken = await this.jwtAuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { rawToken: refreshToken } = await this.jwtAuthService.createRefreshToken(user.id);

    this.eventBus.emit({
      eventType: 'auth.login',
      actor: user.id,
      actorRole: user.role,
      resource: 'session',
      metadata: { email: user.email, mfaVerified: true },
      timestamp: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Support Operator user lookup (FR-22)
   */
  async getOperatorUserSearch(query?: string) {
    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { fullName: { contains: query, mode: 'insensitive' } },
              { nationalId: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        fullName: true,
        nationalId: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
      take: 50,
    });

    return users;
  }
}
