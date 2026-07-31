import { eventBus } from "@/lib/events/event-bus";
import type { EventPayload } from "@/lib/events/event-bus";
import { logger } from "@/lib/logger/logger";

export interface NotificationPayload {
  type: "EMAIL" | "SMS";
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private isSubscribed = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Register EventBus listeners for notification delivery (FR-17).
   */
  initConsumer(): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    const notificationEvents = [
      "auth.login",
      "auth.mfa_change",
      "auth.device_new",
      "payment.completed",
      "payment.failed",
      "loan.repayment.completed",
    ];

    for (const eventType of notificationEvents) {
      eventBus.subscribe(eventType, async (event: EventPayload) => {
        await this.handleNotificationEvent(event);
      });
    }

    logger.info("[NotificationService] Registered consumer for auth & transaction events");
  }

  async handleNotificationEvent(event: EventPayload): Promise<void> {
    const payload = event.payload || {};
    const recipient = (payload.email as string) || (payload.userId as string) || "user@vaultguard.bank";

    let subject = "VaultGuard Security Notification";
    let body = `Event ${event.eventType} was processed.`;
    const type: "EMAIL" | "SMS" = "EMAIL";

    switch (event.eventType) {
      case "auth.login":
        subject = "VaultGuard Alert: New Security Login";
        body = `A new login was recorded for your account from IP ${payload.ipAddress || "unknown"}.`;
        break;
      case "auth.mfa_change":
        subject = "VaultGuard Security: MFA Settings Updated";
        body = `Your Multi-Factor Authentication settings were recently updated.`;
        break;
      case "auth.device_new":
        subject = "VaultGuard Alert: New Device Linked";
        body = `A new untrusted device (${payload.userAgent || "Unknown Device"}) requested access to your account.`;
        break;
      case "payment.completed":
        subject = "VaultGuard Notice: Payment Completed";
        body = `Your transfer of $${payload.amount || "0.00"} was successfully completed (Ref: ${event.eventId}).`;
        break;
      case "payment.failed":
        subject = "VaultGuard Alert: Payment Failed";
        body = `Your transaction request of $${payload.amount || "0.00"} failed. Reason: ${payload.reason || "Verification error"}.`;
        break;
      case "loan.repayment.completed":
        subject = "VaultGuard Notice: Loan Repayment Received";
        body = `Your loan repayment of $${payload.amount || "0.00"} was processed successfully.`;
        break;
    }

    await this.sendNotification({
      type,
      recipient,
      subject,
      body,
      sentAt: new Date().toISOString(),
    });
  }

  async sendNotification(notification: NotificationPayload): Promise<boolean> {
    // Simulate real SMS/Email dispatch
    logger.info(`[NOTIFICATION] [${notification.type}] Sent to ${notification.recipient}: "${notification.subject}" - ${notification.body}`, {
      recipient: notification.recipient,
      type: notification.type,
      subject: notification.subject,
    });

    return true;
  }
}

export const notificationService = NotificationService.getInstance();

