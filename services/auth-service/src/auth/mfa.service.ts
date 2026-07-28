import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export interface GeneratedMfaSetup {
  secret: string;
  otpauthUrl: string;
  qrUri: string;
  rawBackupCodes: string[];
  hashedBackupCodes: string[];
}

@Injectable()
export class MfaService {
  private readonly issuer: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.issuer = this.configService.get<string>('MFA_ISSUER', 'VaultGuard');
    this.appName = this.configService.get<string>('MFA_APP_NAME', 'VaultGuard Banking');

    // Configure otplib TOTP parameters (RFC 6238 compliance)
    authenticator.options = {
      window: 1, // ±1 step tolerance (90 second window for clock drift)
      step: 30,
      digits: 6,
    };
  }

  /**
   * Generate a new TOTP secret, otpauth:// URI, QR Code Data URI, and backup codes.
   */
  async generateMfaSetup(email: string): Promise<GeneratedMfaSetup> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, this.issuer, secret);
    const qrUri = await QRCode.toDataURL(otpauthUrl);

    const { rawBackupCodes, hashedBackupCodes } = await this.generateBackupCodes();

    return {
      secret,
      otpauthUrl,
      qrUri,
      rawBackupCodes,
      hashedBackupCodes,
    };
  }

  /**
   * Verify a 6-digit TOTP token against a secret.
   */
  verifyTotp(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  /**
   * Generate 5 random 8-character single-use backup codes and hash them with bcrypt.
   */
  async generateBackupCodes(): Promise<{ rawBackupCodes: string[]; hashedBackupCodes: string[] }> {
    const rawBackupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];

    for (let i = 0; i < 5; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
      const hash = await bcrypt.hash(code, 10);
      rawBackupCodes.push(code);
      hashedBackupCodes.push(hash);
    }

    return { rawBackupCodes, hashedBackupCodes };
  }

  /**
   * Verify if a code matches any of the stored backup codes. Returns index if valid.
   */
  async verifyBackupCode(code: string, hashedBackupCodes: string[]): Promise<{ isValid: boolean; matchedIndex: number }> {
    const cleanCode = code.trim().toUpperCase();

    for (let i = 0; i < hashedBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(cleanCode, hashedBackupCodes[i]);
      if (isMatch) {
        return { isValid: true, matchedIndex: i };
      }
    }

    return { isValid: false, matchedIndex: -1 };
  }
}
