import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtAuthService: JwtAuthService,
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
        // Log warning if accounts service is unreachable in standalone dev mode
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
}
