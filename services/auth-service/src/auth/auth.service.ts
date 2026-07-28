import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt.service';
import { MfaService } from './mfa.service';
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
        fullName: backupRecord.fullName, // canonical name from backup record
        role: UserRole.CUSTOMER,
        mfaEnabled: false,
      },
    });

    // 4. Trigger synchronous internal HTTP call to Accounts Service to create default accounts
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

  async login(dto: LoginDto) {
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

    if (user.mfaEnabled) {
      const mfaToken = await this.jwtAuthService.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        requiresMfa: true,
        mfaToken,
        message: 'MFA verification required.',
      };
    }

    const accessToken = await this.jwtAuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { rawToken: refreshToken } = await this.jwtAuthService.createRefreshToken(user.id);

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

  async logout(rawRefreshToken: string) {
    if (rawRefreshToken) {
      await this.jwtAuthService.revokeRefreshToken(rawRefreshToken);
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

    // Save or update MfaFactor in database
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

    return {
      secret: mfaSetup.secret,
      qrUri: mfaSetup.qrUri,
      backupCodes: mfaSetup.rawBackupCodes,
    };
  }

  async verifyMfa(dto: MfaVerifyDto) {
    const { mfaToken, code } = dto;

    // Verify token to find userId
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

    // Check TOTP code
    let isVerified = this.mfaService.verifyTotp(code, mfaFactor.secret);

    // If TOTP fails, check backup codes
    if (!isVerified && mfaFactor.backupCodes.length > 0) {
      const backupCheck = await this.mfaService.verifyBackupCode(code, mfaFactor.backupCodes);
      if (backupCheck.isValid) {
        isVerified = true;

        // Burn single-use backup code
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

    // Mark MFA verified & enable on user profile
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const accessToken = await this.jwtAuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { rawToken: refreshToken } = await this.jwtAuthService.createRefreshToken(user.id);

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
}
