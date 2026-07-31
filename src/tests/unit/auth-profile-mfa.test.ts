import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/services/auth/password";
import { generateTotpSecret, generateTotpUri, generateTotpCode, verifyTotpCode } from "@/lib/services/auth/totp";
import { generateQrCodeSvg, generateQrCodeDataUrl } from "@/lib/utils/qrcode";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";

describe("User Authentication & Security Test Suite", () => {
  describe("Password Module", () => {
    it("should hash a password and verify matching hash", async () => {
      const plain = "SuperSecurePass2026!";
      const hash = await hashPassword(plain);
      expect(hash).not.toBe(plain);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isValid = await verifyPassword(plain, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid password", async () => {
      const hash = await hashPassword("RightPassword");
      const isValid = await verifyPassword("WrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("TOTP & 2FA Module", () => {
    it("should generate a valid 16-character base32 secret", () => {
      const secret = generateTotpSecret(16);
      expect(secret).toHaveLength(16);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it("should format otpauth URI properly", () => {
      const uri = generateTotpUri("alex@vaultguard.bank", "JBSWY3DPEHPK3PXP", "VaultGuard");
      expect(uri).toContain("otpauth://totp/VaultGuard:alex%40vaultguard.bank");
      expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
      expect(uri).toContain("issuer=VaultGuard");
    });

    it("should generate 6-digit TOTP code and verify it", () => {
      const secret = generateTotpSecret();
      const code = generateTotpCode(secret);
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);

      const isValid = verifyTotpCode(code, secret);
      expect(isValid).toBe(true);

      const isInvalid = verifyTotpCode("000000", secret);
      if (code !== "000000") {
        expect(isInvalid).toBe(false);
      }
    });
  });

  describe("QR Code Utility", () => {
    it("should render clean SVG XML string for a given text", async () => {
      const text = "otpauth://totp/VaultGuard:user@bank.com?secret=TESTSECRET";
      const svg = await generateQrCodeSvg(text, { size: 200 });
      expect(svg).toContain("<svg");
    });

    it("should generate a base64 Data URL for image embedding", async () => {
      const dataUrl = await generateQrCodeDataUrl("test-qr-content");
      expect(dataUrl.startsWith("data:image/png;base64,") || dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    });
  });

  describe("JWT Session Token Module", () => {
    it("should sign and verify session token correctly", async () => {
      const payload = {
        userId: "usr_test_1001",
        email: "testuser@vaultguard.bank",
        fullName: "Test User",
        nationalId: "991820491V",
        role: "CUSTOMER" as const,
      };

      const token = await signSessionToken(payload);
      expect(token).toBeDefined();

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("usr_test_1001");
      expect(decoded?.email).toBe("testuser@vaultguard.bank");
    });
  });
});
