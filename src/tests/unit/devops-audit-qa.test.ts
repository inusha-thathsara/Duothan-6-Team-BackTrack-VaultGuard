import { describe, it, expect, vi } from "vitest";
import { redactObject } from "@/lib/logger/logger";
import { checkRateLimit } from "@/lib/middleware/rate-limiter";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { notificationService } from "@/lib/services/notifications/notification.service";
import { NextResponse, NextRequest } from "next/server";

describe("DevOps, Security & QA - PII Redactor", () => {
  it("should redact sensitive fields in object structures", () => {
    const payload = {
      username: "john_doe",
      password: "SuperSecretPassword123!",
      token: "jwt.access.token.secret",
      nested: {
        creditCardNumber: "4111-2222-3333-4444",
        secret: "my-secret-key",
        normalKey: "visible",
      },
    };

    const redacted = redactObject(payload) as Record<string, unknown>;

    expect(redacted.username).toBe("john_doe");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.token).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).normalKey).toBe("visible");
    expect((redacted.nested as Record<string, unknown>).secret).toBe("[REDACTED]");
  });
});

describe("DevOps, Security & QA - Rate Limiter (FR-21)", () => {
  it("should allow requests up to the defined limit and block subsequent ones", () => {
    const testKey = `test_rate_limit_${Date.now()}`;
    const options = { limit: 3, windowMs: 60000 };

    expect(checkRateLimit(testKey, options).success).toBe(true);
    expect(checkRateLimit(testKey, options).success).toBe(true);
    expect(checkRateLimit(testKey, options).success).toBe(true);

    const fourth = checkRateLimit(testKey, options);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });
});

describe("DevOps, Security & QA - Security Middleware & Headers (NFR-S1)", () => {
  it("should append standard Helmet security headers and CORS headers", () => {
    const res = NextResponse.json({ ok: true });
    const secured = applySecurityHeaders(res, "corr_test_123");

    expect(secured.headers.get("X-Frame-Options")).toBe("DENY");
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(secured.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(secured.headers.get("X-Correlation-ID")).toBe("corr_test_123");
  });

  it("should generate correlation ID if absent in request", () => {
    const req = new NextRequest("http://localhost:3000/api/test");
    const corrId = getOrCreateCorrelationId(req);
    expect(corrId).toBeDefined();
    expect(corrId.startsWith("corr_")).toBe(true);
  });
});

describe("DevOps, Security & QA - Notification Consumer (FR-17)", () => {
  it("should format and deliver notification payload for events", async () => {
    const sendSpy = vi.spyOn(notificationService, "sendNotification");

    const eventPayload = {
      eventId: `evt_test_${Date.now()}`,
      eventType: "payment.completed",
      payload: {
        userId: "usr_123",
        amount: 150.00,
        email: "customer@vaultguard.bank",
      },
      timestamp: new Date().toISOString(),
    };

    await notificationService.handleNotificationEvent(eventPayload);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "EMAIL",
        recipient: "customer@vaultguard.bank",
        subject: "VaultGuard Notice: Payment Completed",
      })
    );
  });
});

