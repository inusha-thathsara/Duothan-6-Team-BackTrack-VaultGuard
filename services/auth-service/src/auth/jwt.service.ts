import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async signAccessToken(payload: { userId: string; email: string; role: UserRole }): Promise<string> {
    return this.jwtService.signAsync(
      {
        email: payload.email,
        role: payload.role,
      },
      {
        subject: payload.userId,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (!payload || !payload.sub) return null;
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role as UserRole,
      };
    } catch {
      return null;
    }
  }

  async createRefreshToken(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
    const rawToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    return { rawToken, expiresAt };
  }

  async rotateRefreshToken(rawToken: string): Promise<{
    accessToken: string;
    rawRefreshToken: string;
    user: { id: string; email: string; fullName: string; role: UserRole };
  } | null> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!existingToken || existingToken.revokedAt !== null || existingToken.expiresAt < new Date()) {
      return null;
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair
    const { rawToken: newRawRefreshToken } = await this.createRefreshToken(existingToken.userId);
    const accessToken = await this.signAccessToken({
      userId: existingToken.user.id,
      email: existingToken.user.email,
      role: existingToken.user.role,
    });

    return {
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      user: {
        id: existingToken.user.id,
        email: existingToken.user.email,
        fullName: existingToken.user.fullName,
        role: existingToken.user.role,
      },
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(rawToken);
      const existingToken = await this.prisma.refreshToken.findUnique({
        where: { token: tokenHash },
      });

      if (!existingToken) return false;

      await this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
      });

      return true;
    } catch {
      return false;
    }
  }
}
