# Production Hardening & Demo Removal Implementation Plan

## Overview
This plan outlines the stage-by-stage refactoring required to remove all hardcoded demo fallbacks, mock users, and fake authentication shortcuts across VaultGuard. The system will operate strictly on real PostgreSQL database persistence, JWT session tokens, Next.js Edge Middleware route protection, and RBAC (Role-Based Access Control).

---

## Stage 1: Next.js Edge Middleware & Session Verification
- **File**: `src/middleware.ts`
- **Objective**: Protect application routes at the Edge level using `jose` JWT verification.
- **Actions**:
  1. Parse `vaultguard_session` cookie on incoming requests.
  2. Verify JWT signature, issuer, audience, and expiration.
  3. Enforce route access controls:
     - Unauthenticated requests to protected routes (`/dashboard`, `/transfer`, `/bill-pay`, `/loans`, `/security`, `/history`, `/operator`) -> Redirect to `/login?redirect=...`.
     - Non-operator users accessing `/operator` -> Redirect to `/dashboard`.
     - Authenticated users accessing `/login` -> Redirect to `/dashboard`.

---

## Stage 2: Strict Authentication & User API Routes (Remove All Fallbacks)
- **Files**:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/user/profile/route.ts`
  - `src/app/api/auth/mfa/setup/route.ts`
  - `src/app/api/auth/mfa/verify/route.ts`
- **Objective**: Ensure all auth & profile endpoints query Prisma PostgreSQL database and strictly reject invalid actions without mock fallbacks.
- **Actions**:
  1. `login`: Strictly look up user in DB, verify password hash via bcrypt, and reject invalid credentials with HTTP 401. Remove `dbOffline` / `alex.perera` demo bypasses.
  2. `register`: Create user in PostgreSQL database (`User` model) with hashed password and default `Account` record. Return error if email or NIC already exists.
  3. `me`: Extract `userId` from session token and query Prisma `User` table to return live DB profile.
  4. `profile`: Implement GET & PATCH directly against PostgreSQL `User` table for name, phone, email, and password changes.
  5. `mfa/setup` & `mfa/verify`: Store TOTP secrets in Prisma `MfaFactor` table and verify TOTP code strictly against stored secret.

---

## Stage 3: Context & Application State Refactoring
- **File**: `src/context/VaultGuardContext.tsx`
- **Objective**: Drive application state entirely from authenticated DB APIs.
- **Actions**:
  1. Remove hardcoded fallback demo user initialization (`usr_alex_2065`).
  2. On mount, call `/api/auth/me` to load active user profile from database.
  3. Connect accounts, transactions, and loans state to live API endpoints (`/api/accounts`, `/api/payments/history`, `/api/loans`).

---

## Stage 4: Component & UI Page Updates
- **Files**:
  - `src/app/login/page.tsx`
  - `src/app/enroll/page.tsx`
  - `src/app/security/page.tsx`
  - `src/app/mfa/page.tsx`
  - `src/app/forgot-password/page.tsx`
  - `src/app/reset-password/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/components/layout/Navbar.tsx`
- **Objective**: Clean all residual demo text and hardcoded placeholders.
- **Actions**:
  1. Ensure form inputs start completely blank (`""`).
  2. Replace static demo references (`alex.perera@vaultguard.bank`, `941820491V`) with dynamic properties from `user` context or empty inputs.
  3. Display actual authenticated user name & accounts in Navbar and Dashboard header.

---

## Stage 5: Verification & Automated Testing
- **Actions**:
  1. Run `npx vitest run` to verify all 27 unit tests pass.
  2. Run `npm run typecheck` to verify 0 TypeScript compiler errors.
  3. Seed database (`npx prisma db seed`) and test registration, login, profile editing, and 2FA QR code scanning with live credentials.
