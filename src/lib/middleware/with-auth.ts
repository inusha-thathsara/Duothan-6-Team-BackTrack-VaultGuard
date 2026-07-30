import { NextRequest } from "next/server";
import { AuthContext } from "@/lib/types";
import { verifySessionToken } from "@/lib/auth/jwt";

/**
 * Extract and verify authentication context from request.
 * Checks both Authorization: Bearer <token> and HttpOnly cookie `vaultguard_session`.
 */
export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  let token: string | undefined;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    token = request.cookies.get("vaultguard_session")?.value;
  }

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    role: payload.role === "SUPPORT_OPERATOR" ? "SUPPORT_OPERATOR" : "CUSTOMER",
  };
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
