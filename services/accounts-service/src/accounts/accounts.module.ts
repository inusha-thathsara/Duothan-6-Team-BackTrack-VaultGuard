import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountsController, InternalAccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DegradedService } from '../health/degraded.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'vaultguard-super-secret-jwt-key-2026-phase-2-mvp'),
      }),
    }),
  ],
  controllers: [AccountsController, InternalAccountsController],
  providers: [
    AccountsService,
    DegradedService,
    PrismaService,
    JwtAuthGuard,
  ],
  exports: [AccountsService, DegradedService],
})
export class AccountsModule {}
