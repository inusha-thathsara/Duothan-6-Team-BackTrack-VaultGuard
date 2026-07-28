import { prisma } from "@/lib/db/prisma";
import type { Transaction } from "@prisma/client";

/**
 * Idempotency check for payment operations (FR-13).
 *
 * From Phase 1 §3.3:
 *   "Gateway forwards to Payments with client request_id (idempotent submit)"
 *
 * If a transaction with the given request_id already exists,
 * the existing result is returned without re-processing.
 */
export async function checkIdempotency(
  requestId: string
): Promise<{ isDuplicate: boolean; existingTransaction?: Transaction }> {
  if (!requestId) {
    return { isDuplicate: false };
  }

  const existing = await prisma.transaction.findUnique({
    where: { requestId },
  });

  if (existing) {
    console.log(`[Idempotency] Duplicate request detected: ${requestId}`);
    return { isDuplicate: true, existingTransaction: existing };
  }

  return { isDuplicate: false };
}

/**
 * Extract request ID from headers. Required for all payment operations.
 * Throws if header is missing.
 */
export function getRequestId(headers: Headers): string {
  const requestId = headers.get("x-request-id");
  if (!requestId) {
    throw new IdempotencyError("x-request-id header is required for payment operations");
  }
  return requestId;
}

export class IdempotencyError extends Error {
  public statusCode = 400;
  public code = "MISSING_REQUEST_ID";

  constructor(message: string) {
    super(message);
    this.name = "IdempotencyError";
  }
}
