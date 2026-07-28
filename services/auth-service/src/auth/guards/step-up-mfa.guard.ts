import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StepUpMfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'AUTH_STEP_UP_REQUIRED',
          message: 'Step-up MFA verification required.',
          details: null,
        },
      });
    }

    const mfaVerifiedAt = user.mfaVerifiedAt ? new Date(user.mfaVerifiedAt) : null;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    if (!mfaVerifiedAt || new Date().getTime() - mfaVerifiedAt.getTime() > FIVE_MINUTES_MS) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'AUTH_STEP_UP_REQUIRED',
          message: 'This operation requires recent step-up MFA verification.',
          details: { requiresStepUpMfa: true },
        },
      });
    }

    return true;
  }
}
