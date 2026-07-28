import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Missing or invalid Authorization header.',
          details: null,
        },
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (!payload || !payload.sub) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Access token is invalid or has expired.',
            details: null,
          },
        });
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token is invalid or has expired.',
          details: null,
        },
      });
    }
  }
}
