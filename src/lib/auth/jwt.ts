import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "vaultguard_hsm_master_secret_key_production_2026_super_secure"
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: "CUSTOMER" | "SUPPORT_OPERATOR" | "ADMIN";
  fullName: string;
  nationalId: string;
}

/**
 * Sign a JWT token with user claims, 8h expiration.
 */
export async function signSessionToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("vaultguard-auth-service")
    .setAudience("vaultguard-client")
    .sign(JWT_SECRET_KEY);
}

/**
 * Verify a JWT token and return decoded payload.
 */
export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      issuer: "vaultguard-auth-service",
      audience: "vaultguard-client",
    });

    if (!payload.userId || !payload.email) return null;

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as TokenPayload["role"]) || "CUSTOMER",
      fullName: (payload.fullName as string) || "Alex Perera",
      nationalId: (payload.nationalId as string) || "941820491V",
    };
  } catch (error) {
    return null;
  }
}
