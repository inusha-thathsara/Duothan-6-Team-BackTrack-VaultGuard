import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/services/auth/password';
import { signAccessToken, verifyAccessToken } from '@/lib/services/auth/jwt';
import { registerSchema, loginSchema } from '@/lib/validation/auth.schema';
import { UserRole } from '@prisma/client';

describe('Auth Service - Password Module', () => {
  it('should hash a password and verify it correctly', async () => {
    const rawPassword = 'VaultGuard@2065';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const rawPassword = 'VaultGuard@2065';
    const hash = await hashPassword(rawPassword);

    const isValid = await verifyPassword('WrongPassword123!', hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for identical passwords (salt)', async () => {
    const password = 'VaultGuard@2065';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toEqual(hash2);
  });
});

describe('Auth Service - JWT Module', () => {
  it('should sign and verify access tokens with valid claims', async () => {
    const payload = {
      userId: 'usr-123-abc',
      email: 'demo@vaultguard.com',
      role: UserRole.CUSTOMER,
    };

    const token = await signAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toEqual(payload.userId);
    expect(decoded?.email).toEqual(payload.email);
    expect(decoded?.role).toEqual(payload.role);
  });

  it('should reject tampered JWT access tokens', async () => {
    const payload = {
      userId: 'usr-123-abc',
      email: 'demo@vaultguard.com',
      role: UserRole.CUSTOMER,
    };

    const token = await signAccessToken(payload);
    const tamperedToken = token + 'tampered';

    const decoded = await verifyAccessToken(tamperedToken);
    expect(decoded).toBeNull();
  });
});

describe('Auth Service - Validation Schemas', () => {
  it('should validate correct registration payload', () => {
    const validData = {
      nationalId: '200012345678',
      fullName: 'Kamal Perera',
      email: 'kamal@example.com',
      password: 'SecureP@ssw0rd2065!',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject registration payload with weak password', () => {
    const invalidData = {
      nationalId: '200012345678',
      fullName: 'Kamal Perera',
      email: 'kamal@example.com',
      password: 'weakpassword',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate login payload', () => {
    const validData = {
      email: 'demo@vaultguard.com',
      password: 'VaultGuard@2065',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

