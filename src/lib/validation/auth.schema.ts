import { z } from 'zod';

export const registerSchema = z.object({
  nationalId: z
    .string()
    .min(10, 'National ID must be at least 10 characters')
    .max(20, 'National ID must not exceed 20 characters')
    .regex(/^[0-9A-Za-z]+$/, 'National ID must be alphanumeric'),

  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),

  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Code must contain only digits'),
});

export const statementsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
