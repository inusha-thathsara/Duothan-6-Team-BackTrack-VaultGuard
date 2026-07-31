# Production Hardening, Role-Based Access Control & Demo Removal Implementation Plan

## Overview
This plan outlines the stage-by-stage refactoring required to remove all hardcoded demo fallbacks, mock users, and fake authentication shortcuts across VaultGuard. The system will operate strictly on real PostgreSQL database persistence, JWT session tokens, Next.js Edge Middleware route protection, strict Role-Based Access Control (RBAC), and verified payment transfer saga execution.

---

## Stage 1: Next.js Edge Middleware & Role-Based Access Control (RBAC) — [COMPLETED ✅]
- **Files**:
  - `src/middleware.ts`
  - `src/components/layout/Navbar.tsx`
  - `src/app/operator/page.tsx`
- **Completed Actions**:
  1. Updated `middleware.ts` to decode & verify `vaultguard_session` JWT token using `jose` at the Edge level.
  2. Implemented strict Role-Based Access Control (RBAC):
     - Unauthenticated requests to protected routes redirect to `/login?redirect=...`.
     - Non-operator users (`role !== "SUPPORT_OPERATOR"`) attempting to access `/operator` are redirected to `/dashboard`.
     - Authenticated users attempting to access `/login` are redirected to `/dashboard`.
  3. Cleaned `Navbar.tsx`: Removed unauthenticated role switcher and restricted Operator link to `user.role === "SUPPORT_OPERATOR"`.
  4. Added Security Guard in `operator/page.tsx`: Non-operator users see an `"Access Denied"` message and PII lookup is blocked.

---

## Stage 2: Strict Authentication & User API Routes (Remove All Fallbacks) — [COMPLETED ✅]
- **Files**:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/user/profile/route.ts`
  - `src/app/api/auth/mfa/setup/route.ts`
  - `src/app/api/auth/mfa/verify/route.ts`
- **Completed Actions**:
  1. `login`: Removed `dbOffline` demo fallback & `alex.perera` demo bypasses. Strictly queries Prisma PostgreSQL DB and verifies password hashes via bcrypt.
  2. `register`: Executes atomic Prisma `$transaction` inserting `User` and default active `SAVINGS` `Account` into PostgreSQL.
  3. `me`: Extracts `userId` from verified JWT session token and fetches live profile from Prisma `User` table.
  4. `profile`: Requires auth context (`requireAuth`). Reads and updates live user profile fields (name, phone, email, password hash) directly in PostgreSQL.
  5. `mfa/setup` & `mfa/verify`: Persists TOTP secrets in Prisma `MfaFactor` table and verifies TOTP code strictly against stored secret using HMAC-SHA1 algorithm (no fake bypasses).

---

## Stage 3: Payment Transfer Saga Logic & Unit Testing — [COMPLETED ✅]
- **Files**:
  - `src/lib/services/payments/transfer.service.ts`
  - `src/app/api/payments/transfer/route.ts`
  - `src/tests/unit/payments.test.ts`
- **Completed Actions**:
  1. Verified `executeTransfer` saga execution in `transfer.service.ts`: handles idempotency keys (`requestId`), debiting sender balance, crediting receiver balance, and inserting `OutboxEvent` inside a single Prisma `$transaction`.
  2. Updated unit tests in `payments.test.ts`: tested transfer schemas, high-amount risk check step-up MFA threshold, and `TransferError` status codes. All 28 unit tests pass cleanly (`npx vitest run`).

---

## Stage 4: Context & Application State Refactoring — [COMPLETED ✅]
- **File**: `src/context/VaultGuardContext.tsx`
- **Completed Actions**:
  1. Removed hardcoded fallback demo user initialization (`usr_alex_2065`). User state defaults to `null` until explicit login or session restoration.
  2. Updated `restoreSession()` to query `/api/auth/me` and `/api/user/profile` on mount to restore user profile and accounts dynamically from PostgreSQL DB.
  3. Updated `login()` to store backend DB user payload into React state and issue toasted notifications.
  4. Updated `logout()` to call POST `/api/auth/logout`, clear cookies, set `user` to `null`, and redirect to `/login`.

---

## Stage 5: Component & UI Page Updates — [IN PROGRESS 🔄]
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

## Stage 6: Verification & Automated Testing
- **Actions**:
  1. Run `npx vitest run` to verify all unit tests pass.
  2. Run `npm run typecheck` to verify 0 TypeScript compiler errors.
  3. Seed database (`npx prisma db seed`) and test registration, login, operator access restriction, payment transfers, profile editing, and 2FA QR code scanning with live credentials.
