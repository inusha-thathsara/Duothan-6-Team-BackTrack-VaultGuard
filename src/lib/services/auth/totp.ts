import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate a random Base32 encoded TOTP secret (16 chars = 80 bits).
 */
export function generateTotpSecret(length: number = 16): string {
  const bytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

/**
 * Format a standard TOTP URI for QR Code scanning in Google Authenticator / Authy.
 */
export function generateTotpUri(
  email: string,
  secret: string,
  issuer: string = "VaultGuard"
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Decode Base32 string to Buffer.
 */
function base32ToBuffer(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate standard HMAC-SHA1 6-digit TOTP code for a given timestamp.
 */
export function generateTotpCode(secret: string, timeSeconds: number = Math.floor(Date.now() / 1000)): string {
  const counter = Math.floor(timeSeconds / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(counter, 4);

  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verify TOTP code with time drift window tolerance (+- 1 period = +- 30s).
 */
export function verifyTotpCode(code: string, secret: string, window: number = 1): boolean {
  if (!code || code.length !== 6) return false;
  const currentSec = Math.floor(Date.now() / 1000);
  for (let i = -window; i <= window; i++) {
    const timeSec = currentSec + i * 30;
    const generated = generateTotpCode(secret, timeSec);
    if (generated === code) {
      return true;
    }
  }
  return false;
}
