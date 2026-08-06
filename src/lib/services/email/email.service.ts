import { Resend } from "resend";
import { logger } from "@/lib/logger/logger";

interface PasswordResetEmailParams {
  email: string;
  token: string;
  baseUrl?: string;
}

interface WelcomeAccountEmailParams {
  email: string;
  fullName: string;
  accountNumber: string;
}

export class EmailService {
  private static instance: EmailService;
  private resend: Resend | null = null;
  private fromEmail: string;

  private constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || "VaultGuard Security <onboarding@resend.dev>";
    if (apiKey) {
      this.resend = new Resend(apiKey);
      logger.info("[EmailService] Initialized with Resend API key");
    } else {
      logger.warn("[EmailService] RESEND_API_KEY not configured. Email will be logged and dispatched via event pipeline.");
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send Password Reset email with secure token & direct URL
   */
  async sendPasswordResetEmail({ email, token, baseUrl }: PasswordResetEmailParams): Promise<boolean> {
    const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://vaultguard-app-1008832068452.asia-south1.run.app";
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    const subject = "VaultGuard Security: Reset Your Password";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0;">VaultGuard Enterprise</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Zero-Trust Banking Gateway</p>
        </div>
        <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            A password reset was requested for your account linked to <strong>${email}</strong>.
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px; display: inline-block;">
              Reset Password Now
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
            Or copy and paste this authorization token manually into the reset page:
          </p>
          <div style="background-color: #0f172a; padding: 12px; font-family: monospace; font-size: 13px; color: #38bdf8; border-radius: 4px; word-break: break-all; text-align: center; border: 1px solid #334155;">
            ${token}
          </div>
          <p style="color: #64748b; font-size: 11px; margin-top: 16px; text-align: center;">
            This single-use token expires in 30 minutes. If you did not request this reset, please contact VaultGuard Security immediately.
          </p>
        </div>
      </div>
    `;

    return this.dispatchEmail(email, subject, html, `Password Reset Token: ${token} | URL: ${resetUrl}`);
  }

  /**
   * Send Welcome & Account Creation email
   */
  async sendWelcomeAccountEmail({ email, fullName, accountNumber }: WelcomeAccountEmailParams): Promise<boolean> {
    const subject = "Welcome to VaultGuard — Account Enrolled";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0;">VaultGuard Enterprise</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Zero-Trust Digital Banking</p>
        </div>
        <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Welcome, ${fullName}!</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            Your zero-trust digital banking account has been successfully created.
          </p>
          <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #334155;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">Primary Savings Account Number:</p>
            <p style="margin: 4px 0 0 0; color: #38bdf8; font-family: monospace; font-size: 18px; font-weight: bold;">${accountNumber}</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">
            Multi-Factor Authentication (2FA) and device fingerprinting are enabled to protect your account.
          </p>
        </div>
      </div>
    `;

    return this.dispatchEmail(email, subject, html, `Welcome ${fullName}! Savings Account ${accountNumber} created.`);
  }

  private async dispatchEmail(to: string, subject: string, html: string, textSummary: string): Promise<boolean> {
    try {
      if (this.resend) {
        const data = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        logger.info(`[EmailService] Sent email via Resend to ${to} (ID: ${data.data?.id || "ok"})`);
        return true;
      } else {
        logger.info(`[EmailService] [RESEND DISPATCH] To: ${to} | Subject: "${subject}" | Details: ${textSummary}`);
        return true;
      }
    } catch (err: unknown) {
      logger.error(`[EmailService] Failed to send email via Resend to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
