import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validation/auth.schema';
import { verifyPassword } from '@/lib/services/auth/password';
import { signAccessToken, createRefreshToken } from '@/lib/services/auth/jwt';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-super-secret-jwt-key-2026-phase-2-mvp';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: result.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
          meta: { timestamp, requestId },
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Fail securely: generic credentials error if user not found or password incorrect
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'The email or password you entered is incorrect.',
            details: null,
          },
          meta: { timestamp, requestId },
        },
        { status: 401 }
      );
    }

    // 2. Check MFA status
    if (user.mfaEnabled) {
      // Issue short-lived temporary MFA session token (5-minute TTL)
      const mfaToken = await new SignJWT({
        sub: user.id,
        email: user.email,
        scope: 'mfa_pending',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(secretKey);

      return NextResponse.json(
        {
          success: true,
          data: {
            requiresMfa: true,
            mfaToken,
            message: 'MFA verification required.',
          },
          meta: { timestamp, requestId },
        },
        { status: 200 }
      );
    }

    // 3. Issue Access Token + Refresh Token
    const accessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { rawToken: refreshToken } = await createRefreshToken(user.id);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken,
          expiresIn: 900,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
        meta: { timestamp, requestId },
      },
      { status: 200 }
    );

    // Set httpOnly cookie for refresh token
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected internal error occurred.',
          details: null,
        },
        meta: { timestamp, requestId },
      },
      { status: 500 }
    );
  }
}
