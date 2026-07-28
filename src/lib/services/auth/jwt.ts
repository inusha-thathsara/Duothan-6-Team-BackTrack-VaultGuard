import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-super-secret-jwt-key-2026-phase-2-mvp';
const secretKey = new TextEncoder().encode(JWT_SECRET);

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Hash raw token string using SHA-256 for secure DB storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sign a JWT access token valid for 15 minutes.
 */
export async function signAccessToken(payload: { userId: string; email: string; role: UserRole }): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify access token signature and expiration.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    return {
      ...payload,
      sub: payload.sub,
      email: (payload.email as string) || '',
      role: (payload.role as UserRole) || UserRole.CUSTOMER,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a DB-backed refresh token and return the raw token for client httpOnly cookie.
 */
export async function createRefreshToken(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomUUID();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Perform refresh token rotation: verify existing token, revoke it, and issue a new pair.
 */
export async function rotateRefreshToken(rawToken: string): Promise<{
  accessToken: string;
  rawRefreshToken: string;
  user: { id: string; email: string; fullName: string; role: UserRole };
} | null> {
  const tokenHash = hashToken(rawToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });

  // Check if token exists, is active, and not expired
  if (!existingToken || existingToken.revokedAt !== null || existingToken.expiresAt < new Date()) {
    return null;
  }

  // Revoke old refresh token (rotation)
  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revokedAt: new Date() },
  });

  // Create new refresh token
  const { rawToken: newRawRefreshToken } = await createRefreshToken(existingToken.userId);

  // Issue new access token
  const accessToken = await signAccessToken({
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

/**
 * Revoke a refresh token by raw token value (e.g. on logout).
 */
export async function revokeRefreshToken(rawToken: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(rawToken);
    const existingToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!existingToken) return false;

    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    return true;
  } catch (error) {
    return false;
  }
}
