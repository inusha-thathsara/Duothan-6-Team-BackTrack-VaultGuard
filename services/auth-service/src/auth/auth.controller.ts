import { Controller, Post, Get, Delete, Body, Param, Query, Req, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { DeviceTrustService } from './device-trust.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly deviceTrustService: DeviceTrustService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || '127.0.0.1';

    const result = await this.authService.login(dto, userAgent, ip);

    if ('refreshToken' in result) {
      const { refreshToken, ...data } = result;
      response.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      };
    }

    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setupMfa(@CurrentUser('userId') userId: string) {
    const data = await this.authService.setupMfa(userId);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || '127.0.0.1';

    const result = await this.authService.verifyMfa(dto, userAgent, ip);

    const { refreshToken, ...data } = result;
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const rawRefreshToken = request.cookies?.['refreshToken'];
    const result = await this.authService.refresh(rawRefreshToken);

    response.cookie('refreshToken', result.rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rawRefreshToken = request.cookies?.['refreshToken'];
    await this.authService.logout(rawRefreshToken, userId);

    response.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 0,
    });

    return {
      success: true,
      data: {
        message: 'Logged out successfully.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getDevices(@CurrentUser('userId') userId: string, @Req() request: Request) {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || '127.0.0.1';
    const { fingerprint } = this.deviceTrustService.createFingerprint(userAgent, ip);

    const devices = await this.deviceTrustService.listDevices(userId, fingerprint);

    return {
      success: true,
      data: { devices },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Post('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async trustCurrentDevice(
    @CurrentUser('userId') userId: string,
    @Req() request: Request,
    @Body('label') label?: string,
  ) {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || '127.0.0.1';

    const device = await this.deviceTrustService.registerDevice(userId, userAgent, ip, label);

    return {
      success: true,
      data: { device },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeDevice(
    @Param('id') deviceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.deviceTrustService.revokeDevice(userId, deviceId);

    return {
      success: true,
      data: { message: 'Device trust revoked successfully.' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get('operator/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPORT_OPERATOR)
  @HttpCode(HttpStatus.OK)
  async getOperatorUsers(@Query('q') query?: string) {
    const users = await this.authService.getOperatorUserSearch(query);

    return {
      success: true,
      data: { users },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      data: { user },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }
}
