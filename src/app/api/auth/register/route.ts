import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { registerSchema } from '@/lib/validation/auth.schema';
import { hashPassword } from '@/lib/services/auth/password';
import { UserRole, AccountType, AccountStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: result.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
          meta: { timestamp, requestId },
        },
        { status: 400 }
      );
    }

    const { nationalId, fullName, email, password } = result.data;

    // 1. Verify identity against surviving backup records (§5.2)
    const backupRecord = await prisma.backupIdentity.findUnique({
      where: { nationalId },
    });

    if (
      !backupRecord ||
      backupRecord.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_IDENTITY_NOT_FOUND',
            message: 'Identity could not be verified against backup records.',
            details: null,
          },
          meta: { timestamp, requestId },
        },
        { status: 400 }
      );
    }

    // 2. Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS',
            message: 'A user with this email address already exists.',
            details: null,
          },
          meta: { timestamp, requestId },
        },
        { status: 409 }
      );
    }

    // 3. Hash password and create user + default accounts
    const passwordHash = await hashPassword(password);
    const randomNumSuffix = Math.floor(100000 + Math.random() * 900000);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nationalId,
        fullName: backupRecord.fullName, // canonical name from backup record
        role: UserRole.CUSTOMER,
        mfaEnabled: false,
        accounts: {
          create: [
            {
              accountNumber: `VG-SAV-${randomNumSuffix}`,
              type: AccountType.SAVINGS,
              balance: 0.00,
              currency: 'LKR',
              status: AccountStatus.ACTIVE,
            },
            {
              accountNumber: `VG-CHK-${randomNumSuffix + 1}`,
              type: AccountType.CHECKING,
              balance: 0.00,
              currency: 'LKR',
              status: AccountStatus.ACTIVE,
            },
          ],
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          mfaRequired: true,
          message: 'Identity verified. Please set up MFA to complete enrollment.',
        },
        meta: { timestamp, requestId },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected internal error occurred.',
          details: null,
        },
        meta: { timestamp, requestId },
      },
      { status: 500 }
    );
  }
}
