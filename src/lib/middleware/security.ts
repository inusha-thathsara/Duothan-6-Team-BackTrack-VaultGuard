import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function applySecurityHeaders(response: NextResponse, correlationId?: string): NextResponse {
  // Helmet-style Security Headers (NFR-S1)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
  );

  // CORS Headers
  response.headers.set("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS || "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Correlation-ID");

  // Correlation ID header propagation (NFR-O1)
  if (correlationId) {
    response.headers.set("X-Correlation-ID", correlationId);
  }

  return response;
}

export function getOrCreateCorrelationId(req: NextRequest): string {
  const existing = req.headers.get("x-correlation-id") || req.headers.get("x-request-id");
  if (existing) return existing;
  // Fallback unique correlation ID generator
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

