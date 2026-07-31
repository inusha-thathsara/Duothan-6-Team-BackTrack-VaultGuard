import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";

// Protected routes requiring authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/transfer",
  "/bill-pay",
  "/loans",
  "/security",
  "/history",
  "/operator",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("vaultguard_session")?.value;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  let verifiedPayload = null;
  if (sessionToken) {
    verifiedPayload = await verifySessionToken(sessionToken);
  }

  // 1. Redirect unauthenticated users away from protected routes
  if (isProtected && (!sessionToken || !verifiedPayload)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (sessionToken && !verifiedPayload) {
      response.cookies.delete("vaultguard_session");
    }
    return response;
  }

  // 2. Role-Based Access Control (RBAC): Protect /operator route
  if (pathname.startsWith("/operator")) {
    if (!verifiedPayload || verifiedPayload.role !== "SUPPORT_OPERATOR") {
      // Non-operator user attempting to access operator panel -> Redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 3. Page Access & Redirect Rules
  const mfaPendingToken = request.cookies.get("vaultguard_mfa_pending")?.value;

  if (pathname === "/login" && verifiedPayload) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/mfa") {
    if (verifiedPayload && !request.nextUrl.searchParams.has("stepup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (!verifiedPayload && !mfaPendingToken && !request.nextUrl.searchParams.has("stepup")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transfer/:path*",
    "/bill-pay/:path*",
    "/loans/:path*",
    "/security/:path*",
    "/history/:path*",
    "/operator/:path*",
    "/login",
    "/mfa",
  ],
};
