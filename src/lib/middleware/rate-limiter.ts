import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitStore>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitOptions {
  limit: number; // max requests per window
  windowMs: number; // window size in milliseconds
}

export const RATE_LIMIT_CONFIGS = {
  auth: { limit: 5, windowMs: 60 * 1000 },      // 5 requests per minute
  payments: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  general: { limit: 60, windowMs: 60 * 1000 },  // 60 requests per minute
};

/**
 * Checks and enforces sliding window rate limits (FR-21).
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = RATE_LIMIT_CONFIGS.general
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitStore = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    memoryStore.set(key, newRecord);
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  memoryStore.set(key, record);

  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Middleware handler for rate limiting in Next.js routes.
 */
export function applyRateLimit(
  req: NextRequest,
  type: keyof typeof RATE_LIMIT_CONFIGS = "general"
): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const path = req.nextUrl.pathname;
  const key = `ratelimit:${type}:${ip}:${path}`;

  const config = RATE_LIMIT_CONFIGS[type];
  const result = checkRateLimit(key, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.resetTime),
        },
      }
    );
  }

  return null;
}

