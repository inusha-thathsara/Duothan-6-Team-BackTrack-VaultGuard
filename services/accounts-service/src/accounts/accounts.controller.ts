import { Controller, Get, Post, Param, Query, Body, Headers, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { DegradedService } from '../health/degraded.service';
import { StatementsQueryDto } from './dto/statements-query.dto';
import { CreateDefaultAccountDto } from './dto/create-default-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly degradedService: DegradedService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAccounts(@CurrentUser('userId') userId: string) {
    const data = await this.accountsService.getAccounts(userId);
    const degradedServices = this.degradedService.getDegradedServices();

    return {
      success: true,
      data,
      degradedServices,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAccountById(
    @Param('id') accountId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.accountsService.getAccountById(accountId, userId);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get(':id/statements')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getStatements(
    @Param('id') accountId: string,
    @Query() query: StatementsQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.accountsService.getStatements(accountId, userId, query);

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }
}

@Controller('internal/accounts')
export class InternalAccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create-default')
  @HttpCode(HttpStatus.CREATED)
  async createDefaultAccounts(
    @Body() dto: CreateDefaultAccountDto,
    @Headers('x-internal-secret') internalSecret: string,
  ) {
    this.verifyInternalSecret(internalSecret);
    const data = await this.accountsService.createDefaultAccounts(dto);
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  @Get(':id/balance')
  @HttpCode(HttpStatus.OK)
  async getInternalBalance(
    @Param('id') accountId: string,
    @Headers('x-internal-secret') internalSecret: string,
  ) {
    this.verifyInternalSecret(internalSecret);
    const data = await this.accountsService.checkInternalBalance(accountId);
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  private verifyInternalSecret(internalSecret: string) {
    const expectedSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET', 'vaultguard-internal-secret-key-2026');
    if (!internalSecret || internalSecret !== expectedSecret) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INTERNAL_AUTH_FAILED',
          message: 'Invalid or missing internal service authorization secret.',
          details: null,
        },
      });
    }
  }
}
