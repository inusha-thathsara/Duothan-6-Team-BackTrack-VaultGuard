import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRouteHandler } from './with-auth';
import { UserRole } from '@prisma/client';

/**
 * Middleware wrapper enforcing RBAC role checks on top of JWT authentication.
 */
export function withRole(requiredRole: UserRole, handler: AuthenticatedRouteHandler) {
  return withAuth(async (request: NextRequest, context) => {
    if (context.user.role !== requiredRole) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_ROLE',
            message: `Forbidden: Requires ${requiredRole} role permissions.`,
            details: null,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}
