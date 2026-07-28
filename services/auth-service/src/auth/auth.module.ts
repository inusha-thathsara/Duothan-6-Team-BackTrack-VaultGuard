import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt.service';
import { MfaService } from './mfa.service';
import { DeviceTrustService } from './device-trust.service';
import { EventBusService } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { StepUpMfaGuard } from './guards/step-up-mfa.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'vaultguard-super-secret-jwt-key-2026-phase-2-mvp'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtAuthService,
    MfaService,
    DeviceTrustService,
    EventBusService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    StepUpMfaGuard,
  ],
  exports: [
    AuthService,
    JwtAuthService,
    MfaService,
    DeviceTrustService,
    EventBusService,
    JwtAuthGuard,
    RolesGuard,
    StepUpMfaGuard,
  ],
})
export class AuthModule {}
