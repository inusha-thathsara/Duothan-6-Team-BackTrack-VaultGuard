import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/services/auth/jwt';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const rawRefreshToken = request.cookies.get('refreshToken')?.value;

    if (rawRefreshToken) {
      await revokeRefreshToken(rawRefreshToken);
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Logged out successfully.',
        },
        meta: { timestamp, requestId },
      },
      { status: 200 }
    );

    // Clear refresh token cookie
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
