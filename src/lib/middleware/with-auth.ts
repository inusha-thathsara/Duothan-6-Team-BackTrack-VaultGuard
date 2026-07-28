import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, AccessTokenPayload } from '@/lib/services/auth/jwt';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: { user: AuthUser; [key: string]: any }
) => Promise<NextResponse>;

/**
 * Middleware wrapper enforcing JWT access token authentication on API routes.
 */
export function withAuth(handler: AuthenticatedRouteHandler) {
  return async (request: NextRequest, routeContext?: any) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Missing or invalid Authorization header.',
            details: null,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Access token is invalid or has expired.',
            details: null,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 401 }
      );
    }

    const authUser: AuthUser = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    return handler(request, { ...routeContext, user: authUser });
  };
}
