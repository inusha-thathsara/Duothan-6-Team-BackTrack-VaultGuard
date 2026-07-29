import { NextRequest } from "next/server";
import { AuthContext } from "@/lib/types";

/**
 * Extract and verify authentication context from request.
 *
 * TODO (Member 2 — Kaushalya): Replace with real JWT verification using jose.
 * This stub allows Member 3 & 4 to develop API routes against a working auth layer.
 *
 * Production implementation should:
 * 1. Extract token from Authorization: Bearer <token>
 * 2. Verify signature + expiry with jose (Identity Platform JWT analogue)
 * 3. Return { userId, role } from verified claims
 */
export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split(" ")[1];
    // STUB: Decode base64-encoded JSON payload for development.
    // In production (M2): verify JWT signature via jose.
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));

    if (!payload.userId) return null;

    return {
      userId: payload.userId,
      role: payload.role || "CUSTOMER",
    };
  } catch {
    return null;
  }
}

/**
 * Assert that auth context exists; throws AuthError if not.
 */
export function requireAuth(
  auth: AuthContext | null
): asserts auth is AuthContext {
  if (!auth) {
    throw new AuthError("Authentication required", 401);
  }
}

/**
 * Assert that the authenticated user has a specific role.
 */
export function requireRole(auth: AuthContext, role: AuthContext["role"]): void {
  if (auth.role !== role) {
    throw new AuthError("Insufficient permissions", 403);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

