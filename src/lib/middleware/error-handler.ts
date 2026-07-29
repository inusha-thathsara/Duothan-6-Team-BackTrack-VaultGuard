import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./with-auth";
import type { ApiResponse } from "@/lib/types";

/**
 * Custom application error with structured error code.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Centralized API error handler.
 * Converts all known error types into structured JSON responses.
 *
 * Covers: AuthError, AppError, ZodError, Prisma unique constraint (P2002),
 * and generic fallback.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  // Log for observability (NFR-O1)
  console.error("[API Error]", error instanceof Error ? error.message : error);

  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "AUTH_ERROR", message: error.message },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details,
        },
      },
      { status: 400 }
    );
  }

  // Prisma unique constraint violation
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_ENTRY",
          message: "A record with this identifier already exists",
        },
      },
      { status: 409 }
    );
  }

  // Generic fallback — never leak internal details (NFR-S7)
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

export const handleError = handleApiError;


