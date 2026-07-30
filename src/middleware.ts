import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("vaultguard_session")?.value;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // If attempting to access a protected route without a valid session cookie, redirect to login
  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting /login or /mfa without explicit MFA step-up request, redirect to /dashboard
  if ((pathname === "/login" || pathname === "/mfa") && sessionToken && !request.nextUrl.searchParams.has("stepup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
