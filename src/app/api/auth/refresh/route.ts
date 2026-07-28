import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/services/auth/jwt';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const rawRefreshToken = request.cookies.get('refreshToken')?.value;

    if (!rawRefreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REFRESH_EXPIRED',
            message: 'Refresh token is missing.',
            details: null,
          },
          meta: { timestamp, requestId },
        },
        { status: 401 }
      );
    }

    const rotated = await rotateRefreshToken(rawRefreshToken);

    if (!rotated) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REFRESH_EXPIRED',
            message: 'Refresh token has expired or been revoked.',
            details: null,
          },
          meta: { timestamp, requestId },
        },
        { status: 401 }
      );

      // Clear invalid cookie
      response.cookies.set({
        name: 'refreshToken',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 0,
      });

      return response;
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken: rotated.accessToken,
          expiresIn: 900,
        },
        meta: { timestamp, requestId },
      },
      { status: 200 }
    );

    // Set updated refresh token cookie (rotation)
    response.cookies.set({
      name: 'refreshToken',
      value: rotated.rawRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
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
