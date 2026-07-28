import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('VaultGuard Auth & Account Integration (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('User Registration & Login Lifecycle', () => {
    it('1. Reject registration if nationalId is not in backup identity database', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nationalId: '999999999999',
          fullName: 'Non Existent',
          email: 'fake@vaultguard.com',
          password: 'Password@2065',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_IDENTITY_NOT_FOUND');
    });

    it('2. Successfully authenticate demo user and return token or MFA challenge', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'demo@vaultguard.com',
          password: 'VaultGuard@2065',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
