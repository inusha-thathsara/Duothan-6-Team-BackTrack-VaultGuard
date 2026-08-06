import { z } from "zod";

/**
 * VaultGuard Identifier Format Validation Module
 * Standardizes format checking across Auth, Accounts, Payments, and Administrative domains.
 */

// 1. Sri Lankan National Identity Card (NIC) Format
// Old Format: 9 digits followed by 'V' or 'X' (case-insensitive), total 10 characters (e.g., 941820491V)
// New Format: 12 digits, total 12 characters (e.g., 200012345678)
export const NIC_REGEX = /^([0-9]{9}[vVxX]|[0-9]{12})$/;

export function isValidNic(nic: string): boolean {
  if (!nic || typeof nic !== "string") return false;
  return NIC_REGEX.test(nic.trim());
}

export const nicSchema = z
  .string()
  .trim()
  .min(1, "National ID (NIC) is required")
  .refine(
    (val) => isValidNic(val),
    "Invalid National ID format. Must be 9 digits followed by 'V'/'X' (e.g., 941820491V) or 12 digits (e.g., 200012345678)."
  );

// 2. Account Number Format (5-30 alphanumeric characters or hyphens)
export const ACCOUNT_NUMBER_REGEX = /^[A-Za-z0-9\-]{5,30}$/;

export function isValidAccountNumber(accountNumber: string): boolean {
  if (!accountNumber || typeof accountNumber !== "string") return false;
  return ACCOUNT_NUMBER_REGEX.test(accountNumber.trim());
}

export const accountNumberSchema = z
  .string()
  .trim()
  .min(5, "Account number must be at least 5 characters")
  .max(30, "Account number cannot exceed 30 characters")
  .refine(
    (val) => isValidAccountNumber(val),
    "Invalid account number format. Must contain 5-30 alphanumeric characters."
  );

// 3. 2FA TOTP Code Format (Exactly 6 numeric digits)
export const TOTP_CODE_REGEX = /^\d{6}$/;

export function isValidTotpCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  return TOTP_CODE_REGEX.test(code.trim());
}

export const totpCodeSchema = z
  .string()
  .trim()
  .length(6, "MFA code must be exactly 6 numeric digits")
  .regex(TOTP_CODE_REGEX, "MFA code must contain only numbers");

// 4. Request ID / Idempotency Key Format (10-100 characters)
export const REQUEST_ID_REGEX = /^[A-Za-z0-9\-_]{10,100}$/;

export function isValidRequestId(requestId: string): boolean {
  if (!requestId || typeof requestId !== "string") return false;
  return REQUEST_ID_REGEX.test(requestId.trim());
}
