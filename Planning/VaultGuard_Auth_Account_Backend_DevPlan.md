# VaultGuard — Authentication & Account Backend
## Detailed Development Plan (MVP → Production-Ready)

**Author:** Inusha Gunasekara (Project Lead & System Architect)  
**Assigned To:** Kaushalya Wijesiri (Auth & Accounts Backend Engineer)  
**Branch:** `feat/auth-accounts`  
**Phase 1 References:** §3.2 Service Architecture, §5.1–§5.2 Functional Requirements, §6.1 Security NFRs  
**Last Updated:** 28 July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Recommended Architecture](#2-recommended-architecture)
3. [Module Breakdown](#3-module-breakdown)
4. [Development Stages](#4-development-stages)
5. [Key MVP Features](#5-key-mvp-features)
6. [Tech Stack & Tools](#6-tech-stack--tools)
7. [API Design & Structure](#7-api-design--structure)
8. [Database Schema](#8-database-schema)
9. [Security Best Practices](#9-security-best-practices)
10. [Validation Strategy](#10-validation-strategy)
11. [Error Handling & Logging](#11-error-handling--logging)
12. [Testing Strategy](#12-testing-strategy)
13. [Versioning & Git Strategy](#13-versioning--git-strategy)
14. [Scalability Roadmap](#14-scalability-roadmap)
15. [Integration Contracts](#15-integration-contracts)
16. [Appendix: Checklists](#16-appendix-checklists)

---

## 1. Executive Summary

This document defines the **end-to-end development plan** for VaultGuard's **Auth Service** and **Accounts Service** — two of the six domain microservices defined in the Phase 1 blueprint (§3.2). These services form the **critical path** of the entire platform: no other service can function without identity verification and account data.

### Scope Boundaries

| In Scope | Out of Scope |
|:---|:---|
| User registration (backup identity restore) | Payment processing (Member 3) |
| Login with password + MFA (TOTP) | Loan management (Member 3) |
| JWT access & refresh token lifecycle | Audit event ingestion (Member 4) |
| Device trust & step-up MFA | Notification delivery (Member 4) |
| RBAC (Customer / Support Operator) | Frontend UI pages (Member 1) |
| Account listing, balance, statements | Cloud deployment (Phase 3) |
| Degraded mode for Payments dependency | Rate limiting middleware (Member 4) |
| Prisma schema for Auth & Accounts domains | Docker/CI pipeline (Member 4) |
| Seed data for Auth & Accounts domains | — |

### Design Principles

1. **Single Responsibility** — Each module/file does one thing well.
2. **Defense in Depth** — Input validation → auth middleware → business logic → DB constraints.
3. **Fail Securely** — Errors never leak internal state; auth failures return generic messages.
4. **Stateless Auth** — JWTs carry claims; server verifies signatures without session lookup (refresh tokens in DB for revocation only).
5. **Schema-First** — Database schema is the contract; all services depend on it.
6. **Testability** — Every service function is unit-testable in isolation.

---

## 2. Recommended Architecture

### 2.1 True Microservices Architecture

VaultGuard is built as **independent NestJS microservices** deployed on Cloud Run, each owning its own database, aligned 1:1 with the Phase 1 RECON blueprint (§3.2). The Next.js frontend is a separate deployment that communicates with services through an API Gateway.

```
                            ┌──────────────────┐
                            │   Cloud Armor     │
                            │   (WAF / DDoS)    │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  Cloud Load       │
                            │  Balancer + CDN   │
                            └────────┬─────────┘
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                   │
          ┌────────▼──────┐ ┌───────▼────────┐ ┌───────▼────────┐
          │  Next.js       │ │  API Gateway    │ │  Static Assets │
          │  Frontend      │ │  (routing,      │ │  (Cloud CDN)   │
          │  (Cloud Run)   │ │   rate-limit,   │ │                │
          │                │ │   auth check)   │ │                │
          └────────────────┘ └───────┬────────┘ └────────────────┘
                                     │
            ┌────────────┬───────────┼───────────┬────────────┐
            │            │           │           │            │
   ┌────────▼──┐ ┌──────▼────┐ ┌───▼──────┐ ┌──▼───────┐ ┌──▼──────────┐
   │  Auth     │ │ Accounts  │ │ Payments │ │ Loans    │ │ Notification│
   │  Service  │ │ Service   │ │ Service  │ │ Service  │ │ Service     │
   │ (NestJS)  │ │ (NestJS)  │ │ (NestJS) │ │ (NestJS) │ │ (NestJS)    │
   │ :4001     │ │ :4002     │ │ :4003    │ │ :4004    │ │ :4005       │
   └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘
         │              │            │             │              │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌───▼───────┐ ┌───▼──────┐       │
   │ auth_db   │ │accounts_db│ │payments_db│ │ loans_db │       │
   │(Cloud SQL)│ │(Cloud SQL)│ │(Cloud SQL)│ │(Cloud SQL│       │
   └───────────┘ └───────────┘ └───────────┘ └──────────┘       │
                                                                 │
   ┌─────────────────────────────────────────────────────────────┘
   │
   │  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
   └─►│   Pub/Sub     │─────►│ Audit Service│────►│  BigQuery    │
      │  (Events)     │      │  (NestJS)    │     │ (Immutable   │
      │               │      │  :4006       │     │  Audit Log)  │
      └──────────────┘      └──────┬───────┘     └──────────────┘
                                    │
                             ┌──────▼───────┐
                             │  audit_db    │
                             │ (Cloud SQL)  │
                             └──────────────┘

   Shared Infrastructure:
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ Memorystore  │  │ Secret Mgr   │  │ Cloud KMS    │
   │ (Redis)      │  │ + IAM        │  │ (HSM keys)   │
   └──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 Why This Architecture

| Decision | Rationale |
|:---|:---|
| **Independent NestJS microservices** | Each service is independently deployable, scalable, and failable — no single binary can take down the whole bank (Phase 1 §3.1). NestJS module system maps naturally to domain boundaries. |
| **Per-domain Cloud SQL databases** | Data isolation from day 1. Compromise of one service's DB doesn't expose other domains. Matches Phase 1 RECON §3.2 requirement. |
| **API Gateway as single entry point** | Centralized authentication, rate-limiting, and routing. Services never exposed directly to the internet. |
| **Pub/Sub for cross-service events** | Decouples services. Notification/Audit failure cannot deadlock payment commits. Each service publishes domain events without knowing consumers. |
| **NestJS (not Express)** | Built-in dependency injection, guards, interceptors, and module system. Enterprise patterns out of the box. TypeScript-first. |
| **Prisma ORM per service** | Type-safe queries, migration management per domain. Each service owns its own `schema.prisma`. |
| **Monorepo structure** | For a 7-day sprint with 4 members, one repo avoids cross-repo dependency overhead while maintaining service isolation via directory boundaries. |

### 2.3 Service Communication Patterns

```
┌──────────────┐     HTTP (internal)          ┌──────────────────┐
│ Auth Service │ ────────────────────────────► │ Accounts Service  │
│              │  POST /internal/accounts      │                    │
│              │  (create accounts during      │                    │
│              │   registration)               │                    │
└──────┬───────┘                               └──────────────────┘
       │
       │  Publishes Events
       ▼
┌──────────────┐     Pub/Sub (async)           ┌──────────────────┐
│  Pub/Sub     │ ────────────────────────────► │  Audit Service    │
│              │  auth.login                   │  (Member 4)       │
│              │  auth.register                │                    │
│              │  auth.mfa_change              ├──────────────────┤
│              │  auth.device_new              │  Notification     │
│              │  auth.logout                  │  Service (M4)     │
└──────────────┘                               └──────────────────┘
```

**Communication Rules:**
1. **Synchronous (HTTP)**: Auth → Accounts only during registration. Internal endpoints are authenticated via service-to-service tokens (not user JWTs).
2. **Asynchronous (Pub/Sub)**: All other cross-domain communication. Each service publishes domain events; consumers subscribe independently.
3. **No shared database access**: Services never query another service's database. Data is fetched via HTTP or events.
4. **Local dev**: In `docker-compose`, Nginx routes `/api/auth/*` → auth-service:4001, `/api/accounts/*` → accounts-service:4002, etc.

---

## 3. Module Breakdown

### 3.1 Auth Service (NestJS — `services/auth-service/`)

```
services/auth-service/
├── src/
│   ├── auth/                       # Auth module (NestJS)
│   │   ├── auth.module.ts          # Module declaration
│   │   ├── auth.controller.ts      # REST endpoints (register, login, refresh, logout)
│   │   ├── auth.service.ts         # Core auth business logic
│   │   ├── jwt.service.ts          # JWT sign/verify, refresh token rotation
│   │   ├── password.service.ts     # bcrypt hash & compare
│   │   ├── mfa.service.ts          # TOTP generation, verification, backup codes
│   │   ├── device-trust.service.ts # Device fingerprinting, trust management
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts   # JWT Bearer token verification guard
│   │   │   └── roles.guard.ts      # RBAC role-based access guard
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  # Extract user from request
│   │   │   └── roles.decorator.ts         # @Roles() metadata decorator
│   │   ├── dto/
│   │   │   ├── register.dto.ts     # Registration validation (class-validator)
│   │   │   ├── login.dto.ts        # Login validation
│   │   │   └── mfa-verify.dto.ts   # MFA code validation
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   ├── prisma/
│   │   └── prisma.service.ts       # Prisma client lifecycle (NestJS injectable)
│   ├── app.module.ts               # Root module
│   └── main.ts                     # Bootstrap (port 4001)
├── prisma/
│   ├── schema.prisma               # Auth domain models ONLY
│   ├── seed.ts                     # Auth demo data
│   └── migrations/
├── test/
│   ├── auth.service.spec.ts
│   └── auth.controller.e2e-spec.ts
├── package.json
├── tsconfig.json
├── nest-cli.json
├── Dockerfile
├── .env
└── .env.example
```

| Module | Responsibility | Key Methods |
|:---|:---|:---|
| **auth.controller.ts** | REST endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/mfa/setup`, `/auth/mfa/verify`, `GET/DELETE /auth/devices` | Route handlers (thin — delegate to services) |
| **auth.service.ts** | Orchestrates registration (backup identity check + user creation), login (password verify + MFA check), token issuance | `register()`, `login()`, `logout()` |
| **jwt.service.ts** | Sign/verify JWT access tokens (15min TTL, HS256), manage refresh tokens (7d, DB-backed, httpOnly cookie rotation) | `signAccessToken()`, `verifyAccessToken()`, `createRefreshToken()`, `rotateRefreshToken()`, `revokeRefreshToken()` |
| **password.service.ts** | Hash passwords with bcrypt (cost factor 12), timing-safe comparison | `hash()`, `verify()` |
| **mfa.service.ts** | Generate TOTP secrets (RFC 6238), QR URIs, verify tokens, backup codes | `generateSecret()`, `verifyToken()`, `generateBackupCodes()` |
| **device-trust.service.ts** | Device fingerprinting, trust check, CRUD for trusted devices | `createFingerprint()`, `isTrusted()`, `register()`, `revoke()` |
| **jwt-auth.guard.ts** | NestJS Guard — extracts Bearer JWT, verifies via `JwtService`, attaches `{ userId, email, role }` to request | Implements `CanActivate` |
| **roles.guard.ts** | NestJS Guard — checks `@Roles()` decorator metadata against user role. Returns 403 if insufficient. | Implements `CanActivate` |

### 3.2 Accounts Service (NestJS — `services/accounts-service/`)

```
services/accounts-service/
├── src/
│   ├── accounts/
│   │   ├── accounts.module.ts
│   │   ├── accounts.controller.ts   # GET /accounts, GET /accounts/:id, GET /accounts/:id/statements
│   │   ├── accounts.service.ts      # Balance queries, statements, create accounts
│   │   └── dto/
│   │       └── statements-query.dto.ts
│   ├── health/
│   │   └── degraded.service.ts      # Service health flag for Payments dependency
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts                      # Bootstrap (port 4002)
├── prisma/
│   ├── schema.prisma                # Accounts domain models ONLY
│   └── seed.ts
├── package.json
├── Dockerfile
└── .env
```

| Module | Responsibility | Key Methods |
|:---|:---|:---|
| **accounts.service.ts** | List user accounts, get detail, generate filtered statements, create accounts (called from Auth via HTTP) | `getAccounts()`, `getAccountById()`, `getStatements()`, `createAccount()` |
| **degraded.service.ts** | Check health of Payments dependency; surface read-only mode | `isServiceHealthy()`, `getDegradedServices()` |

### 3.3 Validation Strategy (NestJS)

Instead of Zod schemas, NestJS uses **class-validator** + **class-transformer** decorators on DTO classes:

```typescript
// services/auth-service/src/auth/dto/register.dto.ts
import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Matches(/^[0-9A-Za-z]+$/)
  nationalId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Must contain uppercase' })
  @Matches(/[a-z]/, { message: 'Must contain lowercase' })
  @Matches(/[0-9]/, { message: 'Must contain digit' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Must contain special character' })
  password: string;
}
```

NestJS `ValidationPipe` (global) auto-validates all incoming DTOs. No manual `safeParse()` calls needed.

### 3.4 Database Layer (Per-Service)

Each service has its own Prisma schema and database:

```
services/auth-service/prisma/
├── schema.prisma          # BackupIdentity, User, MfaFactor, TrustedDevice, RefreshToken
├── seed.ts                # Auth demo users + backup identities
└── migrations/

services/accounts-service/prisma/
├── schema.prisma          # Account (+ Transaction read model if needed)
├── seed.ts                # Demo accounts
└── migrations/
```

> [!IMPORTANT]
> **Each service owns its own schema and database.** No service reads or writes another service's database. Cross-domain data is accessed via HTTP or events. This enforces the data isolation principle from Phase 1 RECON §3.1.

---

## 4. Development Stages

### Overview

```
Stage 0          Stage 1          Stage 2          Stage 3          Stage 4
Foundation  ──►  Core Auth   ──►  Advanced     ──►  Accounts    ──►  Integration
                                  Auth              Service         & Polish
                                  
Day 1            Day 2            Day 3-4          Day 3-4          Day 5-6
```

---

### Stage 0: Foundation (Day 1 — Friday Jul 25)

**Goal:** Every team member can clone, install, and run the project with a working database.

| # | Task | Output | Priority |
|:--|:-----|:-------|:---------|
| 0.1 | Define complete Prisma schema with all domain models | `prisma/schema.prisma` | 🔴 Critical |
| 0.2 | Create initial migration | `prisma/migrations/` | 🔴 Critical |
| 0.3 | Write comprehensive seed script | `prisma/seed.ts` | 🔴 Critical |
| 0.4 | Set up Prisma client singleton | `src/lib/db/prisma.ts` | 🔴 Critical |
| 0.5 | Create `.env.example` with all required variables | `.env.example` | 🔴 Critical |
| 0.6 | Verify `docker-compose up` → DB healthy → seed runs | Manual test | 🔴 Critical |

**`.env.example` contents:**
```env
# Database
DATABASE_URL="postgresql://vaultguard:vaultguard@localhost:5432/vaultguard?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-256-bit-secret-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
BCRYPT_ROUNDS=12

# MFA
MFA_ISSUER="VaultGuard"
MFA_APP_NAME="VaultGuard Banking"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Acceptance Criteria:**
- [x] `npx prisma migrate dev` runs without errors
- [x] `npx prisma db seed` populates demo data
- [x] Prisma Studio (`npx prisma studio`) shows all tables with data
- [x] All team members can run the project locally

---

### Stage 1: Core Authentication (Day 2 — Saturday Jul 26)

**Goal:** Users can register, log in with password, receive JWTs, and log out.

| # | Task | Endpoint / File | FR Ref | Status |
|:--|:-----|:----------------|:-------|:-------|
| 1.1 | Implement `password.ts` — bcrypt hash/verify | `src/lib/services/auth/password.ts` | FR-02 | ✅ Done |
| 1.2 | Implement `jwt.ts` — sign/verify access tokens | `src/lib/services/auth/jwt.ts` | FR-04 | ✅ Done |
| 1.3 | Implement refresh token rotation | `src/lib/services/auth/jwt.ts` | FR-04 | ✅ Done |
| 1.4 | Implement `withAuth()` middleware | `src/lib/middleware/with-auth.ts` | FR-05 | ✅ Done |
| 1.5 | Implement `withRole()` middleware | `src/lib/middleware/with-role.ts` | FR-05 | ✅ Done |
| 1.6 | Create Zod validation schemas | `src/lib/validation/auth.schema.ts` | — | ✅ Done |
| 1.7 | Build `POST /api/auth/register` | `src/app/api/auth/register/route.ts` | FR-01 | ✅ Done |
| 1.8 | Build `POST /api/auth/login` | `src/app/api/auth/login/route.ts` | FR-02 | ✅ Done |
| 1.9 | Build `POST /api/auth/refresh` | `src/app/api/auth/refresh/route.ts` | FR-04 | ✅ Done |
| 1.10 | Build `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` | FR-04 | ✅ Done |

**Implementation Order:** 1.1 → 1.2 → 1.3 → 1.6 → 1.4 → 1.5 → 1.7 → 1.8 → 1.9 → 1.10

> [!TIP]
> **Build from the bottom up.** Utilities first (password, jwt), then middleware (withAuth), then validation schemas, then route handlers. Route handlers should be thin — just validate, call service, return response.

**Acceptance Criteria:**
- [x] Register creates user in DB with hashed password
- [x] Login returns `{ accessToken }` + sets `refreshToken` httpOnly cookie
- [x] Protected route returns 401 without token, 200 with valid token
- [x] Refresh rotation issues new tokens and invalidates old
- [x] Logout clears cookie and revokes refresh token in DB

---

### Stage 2: Advanced Authentication (Day 3–4 — Sunday–Monday Jul 27–28)

**Goal:** MFA, device trust, and step-up authentication are fully functional.

| # | Task | Endpoint / File | FR Ref |
|:--|:-----|:----------------|:-------|
| 2.1 | Implement `mfa.ts` — TOTP generation/verification | `src/lib/services/auth/mfa.ts` | FR-02 |
| 2.2 | Implement backup codes generation | `src/lib/services/auth/mfa.ts` | FR-02 |
| 2.3 | Build `POST /api/auth/mfa/setup` | `src/app/api/auth/mfa/setup/route.ts` | FR-02 |
| 2.4 | Build `POST /api/auth/mfa/verify` | `src/app/api/auth/mfa/verify/route.ts` | FR-02 |
| 2.5 | Integrate MFA into login flow | Update login route | FR-02 |
| 2.6 | Implement `device-trust.ts` | `src/lib/services/auth/device-trust.ts` | FR-03 |
| 2.7 | Build `GET/POST/DELETE /api/auth/devices` | `src/app/api/auth/devices/route.ts` | FR-03 |
| 2.8 | Implement step-up MFA middleware | `src/lib/middleware/with-auth.ts` | FR-03, FR-11 |
| 2.9 | Implement RBAC guards for Support Operator | `src/lib/services/auth/rbac.ts` | FR-05 |
| 2.10 | Emit auth events to EventBus | All auth routes | FR-19 |

**Login Flow with MFA (Sequence):**

```
Client                    Auth API                    Database
  │                          │                           │
  ├── POST /auth/login ─────►│                           │
  │   { email, password }    │                           │
  │                          ├── Verify password ───────►│
  │                          │◄── User record ──────────┤
  │                          │                           │
  │                          ├── Check MFA enabled? ────►│
  │                          │◄── MfaFactor exists ─────┤
  │                          │                           │
  │◄── 200 { requiresMfa,   │                           │
  │     mfaToken } ──────────┤                           │
  │                          │                           │
  ├── POST /auth/mfa/verify ►│                           │
  │   { mfaToken, code }     │                           │
  │                          ├── Verify TOTP ───────────►│
  │                          │                           │
  │                          ├── Check device trust ────►│
  │                          │◄── New/Known ────────────┤
  │                          │                           │
  │                          ├── Issue JWT + Refresh ───►│
  │                          │   (store refresh token)   │
  │                          │                           │
  │◄── 200 { accessToken }   │                           │
  │    Set-Cookie: refresh    │                           │
  │                          │                           │
  │                          ├── Emit auth.login event ─►│ EventBus
  │                          │                           │
```

**Step-Up MFA Flow:**

```
Client                     Auth Middleware              Service
  │                            │                          │
  ├── POST /payments/transfer ►│                          │
  │   { amount: 500000 }       │                          │
  │                            ├── Verify JWT ──────────►│
  │                            ├── Check step-up needed? │
  │                            │   (amount > threshold)   │
  │                            ├── Check recent MFA ─────►│ (within 5min?)
  │                            │◄── No recent MFA ───────┤
  │◄── 403 { requiresStepUp   │                          │
  │     MFA: true } ───────────┤                          │
  │                            │                          │
  │── POST /auth/mfa/verify ──►│  (re-verify)            │
  │◄── 200 (mfa_verified_at   │                          │
  │    updated) ───────────────┤                          │
  │                            │                          │
  ├── POST /payments/transfer ►│                          │
  │   (retry with fresh MFA)   ├── Verify JWT ──────────►│
  │                            ├── Check step-up ────────►│ (within 5min ✓)
  │                            │──────────────────────────►│ Proceed
```

**Acceptance Criteria:**
- [ ] MFA setup returns `otpauth://` URI
- [ ] MFA verify accepts valid 6-digit TOTP
- [ ] Login with MFA-enabled account requires two steps
- [ ] Unrecognized device triggers MFA even if remembered
- [ ] Step-up MFA blocks high-risk operations without recent verification
- [ ] Support Operator can access admin endpoints, Customer cannot
- [ ] All auth actions emit events to EventBus

---

### Stage 3: Accounts Service (Day 3–4, parallel with Stage 2)

**Goal:** Users can view accounts, balances, and statements. Degraded mode works.

| # | Task | Endpoint / File | FR Ref |
|:--|:-----|:----------------|:-------|
| 3.1 | Implement `account.service.ts` — list accounts | `src/lib/services/accounts/account.service.ts` | FR-06 |
| 3.2 | Implement single account detail | Same file | FR-06 |
| 3.3 | Implement statements with date filtering & pagination | Same file | FR-07 |
| 3.4 | Implement `degraded.ts` — health flag checker | `src/lib/services/accounts/degraded.ts` | FR-08 |
| 3.5 | Build `GET /api/accounts` | `src/app/api/accounts/route.ts` | FR-06 |
| 3.6 | Build `GET /api/accounts/[id]` | `src/app/api/accounts/[id]/route.ts` | FR-06 |
| 3.7 | Build `GET /api/accounts/[id]/statements` | `src/app/api/accounts/[id]/statements/route.ts` | FR-07 |

**Degraded Mode Logic (FR-08):**

```typescript
// src/lib/services/accounts/degraded.ts

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
}

// In-memory health flag (set by health check endpoint or toggled manually for demo)
const serviceHealthMap = new Map<string, ServiceHealth>();

export function isServiceHealthy(serviceName: string): boolean {
  const health = serviceHealthMap.get(serviceName);
  return health?.status === 'healthy';
}

export function getDegradedServices(): ServiceHealth[] {
  return Array.from(serviceHealthMap.values())
    .filter(h => h.status !== 'healthy');
}
```

When Payments is flagged degraded:
- `GET /api/accounts` → 200 (normal) + response includes `"degradedServices": ["payments"]`
- `POST /api/payments/transfer` → 503 `{ error: { code: "SERVICE_DEGRADED", message: "Transfers are temporarily unavailable" } }`

**Acceptance Criteria:**
- [ ] List accounts returns user's accounts with correct balances
- [ ] Statements support `?from=&to=&page=&limit=` query params
- [ ] Account detail returns 404 for non-existent or other user's account
- [ ] Degraded mode flag surfaces correctly in account responses
- [ ] All account queries scoped to authenticated user (no cross-user data access)

---

### Stage 4: Integration & Polish (Day 5–6 — Tuesday–Wednesday Jul 29–30)

**Goal:** Everything works end-to-end with other team members' code.

| # | Task | Details |
|:--|:-----|:--------|
| 4.1 | Integration merge with Member 3 (Payments) | Verify transfer saga calls account balance check correctly |
| 4.2 | Integration merge with Member 4 (Audit/DevOps) | Verify auth events reach audit consumer |
| 4.3 | Integration merge with Member 1 (Frontend) | Verify login → dashboard → accounts flow end-to-end |
| 4.4 | Edge case hardening | Expired tokens, invalid MFA codes, concurrent logins, missing fields |
| 4.5 | Update seed data based on integration needs | Add edge-case demo users if needed |
| 4.6 | Code review & cleanup | Remove debug logs, ensure consistent error formats |

---

## 5. Key MVP Features

### 5.1 Feature Matrix with Priority

| Feature | FR Ref | Priority | Stage |
|:--------|:-------|:---------|:------|
| **User Registration** (backup identity restore) | FR-01 | 🔴 P0 | 1 |
| **Password-Based Login** | FR-02 | 🔴 P0 | 1 |
| **JWT Access Token** (15min TTL) | FR-04 | 🔴 P0 | 1 |
| **Refresh Token Rotation** (7d, httpOnly) | FR-04 | 🔴 P0 | 1 |
| **Secure Logout** (cookie clear + DB revoke) | FR-04 | 🔴 P0 | 1 |
| **Auth Middleware** (JWT verification) | FR-05 | 🔴 P0 | 1 |
| **TOTP MFA Setup & Verification** | FR-02 | 🟡 P1 | 2 |
| **Device Trust & Management** | FR-03 | 🟡 P1 | 2 |
| **Step-Up MFA** for high-risk ops | FR-03/11 | 🟡 P1 | 2 |
| **RBAC** (Customer / Support Operator) | FR-05 | 🟡 P1 | 2 |
| **MFA Backup Codes** | FR-02 | 🟢 P2 | 2 |
| **Account Listing with Balances** | FR-06 | 🔴 P0 | 3 |
| **Account Statements** (date range) | FR-07 | 🟡 P1 | 3 |
| **Degraded Mode** (Payments down) | FR-08 | 🟢 P2 | 3 |
| **Auth Event Emission** | FR-19 | 🟡 P1 | 2 |

### 5.2 Registration Flow — Backup Identity Restore

VaultGuard's scenario requires users to verify identity against **surviving backup records** (§2.4 of Phase 1 blueprint). The registration flow simulates this:

```
1. User provides: nationalId + fullName + email + password
2. System checks: Does nationalId exist in backup seed data?
3. System verifies: Does fullName match the backup record?
4. If match:
   a. Create User record (passwordHash, role: CUSTOMER)
   b. Create initial Accounts (Savings + Checking from backup)
   c. Force MFA enrollment flag (mfaEnabled: false, prompt on first login)
   d. Emit auth.register event
   e. Return success + redirect to MFA setup
5. If no match:
   a. Return 400 "Identity could not be verified against backup records"
   b. (Generic message — don't reveal if NIC exists or not)
```

---

## 6. Tech Stack & Tools

### 6.1 Runtime & Framework

| Layer | Technology | Version | Purpose |
|:------|:-----------|:--------|:--------|
| **Runtime** | Node.js | 20 LTS | Server-side JavaScript |
| **Backend Services** | NestJS | 10.x | Enterprise TypeScript framework for microservices (Auth, Accounts, etc.) |
| **Frontend** | Next.js | 15 (App Router) | React frontend UI application (Member 1) |
| **Language** | TypeScript | 5.x (strict mode) | Type safety across all services |

### 6.2 Auth & Crypto Libraries

| Library | Version | Purpose | Why This Library |
|:--------|:--------|:--------|:-----------------|
| **@nestjs/jwt** / **jose** | ^10.x / ^5.x | JWT sign/verify (HS256) | NestJS JWT module with Web Crypto fallback |
| **bcryptjs** | ^3.x | Password hashing | Industry standard; pure JS for cross-platform reliability |
| **otplib** | ^12.x | TOTP generation & verification | Full RFC 6238 compliance, QR URI generation |
| **qrcode** | ^1.x | QR code image generation for MFA setup | Server-side QR rendering for TOTP enrollment |
| **uuid** | ^9.x / ^10.x | Generate UUIDs for tokens, correlation IDs | Standard RFC 4122 UUIDs |
| **class-validator** | ^0.14.x | DTO request validation schemas | NestJS native declarative decorator validation |
| **class-transformer** | ^0.5.x | DTO object transformation | NestJS native payload transformation |

### 6.3 Database & ORM

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| **PostgreSQL** | 16-alpine | Primary relational database (dedicated container per domain microservice) |
| **Prisma** | ^6.x | ORM, migrations, type-safe queries, seed scripts (per service) |
| **Redis** | 7-alpine | Rate limiting counters, session cache (shared container) |
| **Nginx** | alpine | Local API Gateway for routing requests to microservice ports in dev |

### 6.4 Development Tools

| Tool | Purpose |
|:-----|:--------|
| **Nest CLI** | Code generation, development server (`nest start --watch`) |
| **ESLint / Prettier** | Code linting and formatting |
| **Jest / Supertest** | NestJS unit and E2E testing framework |
| **Prisma Studio** | Visual database browser for development |
| **Thunder Client / Postman** | Manual API testing |

---

## 7. API Design & Structure

### 7.1 Design Principles

1. **RESTful** — Resources as nouns, HTTP methods as verbs.
2. **Consistent Response Format** — All responses follow the same JSON structure.
3. **Versioned via Path Prefix** (future) — `/api/v1/auth/...` when needed.
4. **HTTP Status Codes** — Semantic and correct (see table below).
5. **Error Responses** — Machine-readable codes + human-readable messages.

### 7.2 Standard Response Envelopes

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-07-28T15:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "meta": {
    "timestamp": "2026-07-28T15:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "The email or password you entered is incorrect.",
    "details": null
  },
  "meta": {
    "timestamp": "2026-07-28T15:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Password must be at least 12 characters" }
    ]
  },
  "meta": {
    "timestamp": "2026-07-28T15:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 7.3 HTTP Status Code Usage

| Status | When Used |
|:-------|:----------|
| `200 OK` | Successful GET, successful login, successful token refresh |
| `201 Created` | Successful POST that creates a resource (register, add device) |
| `204 No Content` | Successful DELETE (revoke device, logout) |
| `400 Bad Request` | Validation errors, malformed input |
| `401 Unauthorized` | Missing/invalid/expired JWT |
| `403 Forbidden` | Valid JWT but insufficient role/permissions |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Duplicate registration (email already exists) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unhandled server errors (generic message only) |
| `503 Service Unavailable` | Degraded mode (Payments down) |

### 7.4 Complete API Endpoint Reference

#### Auth Service Endpoints

---

##### `POST /api/auth/register`

**Description:** Restore identity from backup records and create new user account.  
**Auth Required:** No  
**Rate Limit:** 3 requests/minute per IP

**Request Body:**
```json
{
  "nationalId": "200012345678",
  "fullName": "Kamal Perera",
  "email": "kamal@example.com",
  "password": "SecureP@ssw0rd2065!"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "kamal@example.com",
    "role": "CUSTOMER",
    "mfaRequired": true,
    "message": "Identity verified. Please set up MFA to complete enrollment."
  }
}
```

**Error Responses:**
- `400` — Validation error (missing fields, weak password)
- `400` — Identity not found in backup records
- `409` — Email already registered

---

##### `POST /api/auth/login`

**Description:** Authenticate with email and password. Returns JWT or MFA challenge.  
**Auth Required:** No  
**Rate Limit:** 5 requests/minute per IP

**Request Body:**
```json
{
  "email": "demo@vaultguard.com",
  "password": "VaultGuard@2065"
}
```

**Success Response — No MFA (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "demo@vaultguard.com",
      "fullName": "Demo Customer",
      "role": "CUSTOMER"
    }
  }
}
```
*+ `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800`*

**Success Response — MFA Required (200):**
```json
{
  "success": true,
  "data": {
    "requiresMfa": true,
    "mfaToken": "temporary-mfa-session-token",
    "message": "MFA verification required."
  }
}
```

**Error Responses:**
- `400` — Validation error
- `401` — Invalid credentials (generic: "email or password is incorrect")
- `429` — Rate limited

---

##### `POST /api/auth/mfa/setup`

**Description:** Generate TOTP secret and QR code URI for MFA enrollment.  
**Auth Required:** Yes (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrUri": "otpauth://totp/VaultGuard:demo@vaultguard.com?secret=JBSWY3DPEHPK3PXP&issuer=VaultGuard",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      "I9J0K1L2",
      "M3N4O5P6",
      "Q7R8S9T0"
    ]
  }
}
```

---

##### `POST /api/auth/mfa/verify`

**Description:** Verify TOTP code during login or step-up authentication.  
**Auth Required:** MFA token (from login response) or Bearer token (for step-up)

**Request Body:**
```json
{
  "mfaToken": "temporary-mfa-session-token",
  "code": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "user": { ... }
  }
}
```
*+ `Set-Cookie: refreshToken=...`*

---

##### `POST /api/auth/refresh`

**Description:** Rotate refresh token and issue new access token.  
**Auth Required:** No (uses httpOnly cookie)  
**Cookie Required:** `refreshToken`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900
  }
}
```
*+ `Set-Cookie: refreshToken=<new-token>; ...`*

**Error Responses:**
- `401` — Missing, expired, or revoked refresh token

---

##### `POST /api/auth/logout`

**Description:** Terminate session — revoke refresh token and clear cookie.  
**Auth Required:** Yes (Bearer token)

**Success Response (204):** No body  
*+ `Set-Cookie: refreshToken=; Max-Age=0; ...`*

---

##### `GET /api/auth/devices`

**Description:** List user's trusted devices.  
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "label": "Chrome on Windows",
      "fingerprint": "abc123...",
      "trustedAt": "2026-07-25T10:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

##### `DELETE /api/auth/devices/[id]`

**Description:** Revoke a trusted device.  
**Auth Required:** Yes

**Success Response (204):** No body

---

#### Accounts Service Endpoints

---

##### `GET /api/accounts`

**Description:** List authenticated user's bank accounts.  
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "accountNumber": "VG-SAV-001234",
      "type": "SAVINGS",
      "balance": "250000.00",
      "currency": "LKR",
      "status": "ACTIVE"
    },
    {
      "id": "uuid",
      "accountNumber": "VG-CHK-001235",
      "type": "CHECKING",
      "balance": "75000.50",
      "currency": "LKR",
      "status": "ACTIVE"
    }
  ],
  "degradedServices": []
}
```

---

##### `GET /api/accounts/[id]`

**Description:** Get single account detail.  
**Auth Required:** Yes

**Success Response (200):** Single account object.  
**Error:** `404` if not found or not owned by user.

---

##### `GET /api/accounts/[id]/statements`

**Description:** Paginated transaction statements for a date range.  
**Auth Required:** Yes

**Query Params:**
| Param | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `from` | ISO date | 30 days ago | Start date |
| `to` | ISO date | today | End date |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2026-07-25T14:30:00.000Z",
      "description": "Transfer to Nimal Fernando",
      "type": "TRANSFER",
      "amount": "-15000.00",
      "balance": "235000.00",
      "status": "COMPLETED",
      "reference": "TXN-2026072514300001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 8. Database Schema

### 8.1 Auth Domain Models

```prisma
// ─── Auth Domain ──────────────────────────────────

enum Role {
  CUSTOMER
  SUPPORT_OPERATOR
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  nationalId   String    @unique
  fullName     String
  role         Role      @default(CUSTOMER)
  mfaEnabled   Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  mfaFactors     MfaFactor[]
  trustedDevices TrustedDevice[]
  refreshTokens  RefreshToken[]
  accounts       Account[]

  @@index([email])
  @@index([nationalId])
}

model MfaFactor {
  id          String    @id @default(uuid())
  userId      String
  secret      String    // encrypted TOTP secret
  backupCodes String[]  // hashed backup codes
  verifiedAt  DateTime?
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model TrustedDevice {
  id          String   @id @default(uuid())
  userId      String
  fingerprint String   // SHA-256(userAgent + ipPrefix)
  userAgent   String
  ipHash      String
  label       String   // "Chrome on Windows"
  trustedAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, fingerprint])
  @@index([userId])
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique // hashed refresh token
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

### 8.2 Accounts Domain Models

```prisma
// ─── Accounts Domain ──────────────────────────────

enum AccountType {
  SAVINGS
  CHECKING
  FIXED_DEPOSIT
}

enum AccountStatus {
  ACTIVE
  FROZEN
  CLOSED
}

model Account {
  id            String        @id @default(uuid())
  userId        String
  accountNumber String        @unique
  type          AccountType
  balance       Decimal       @default(0) @db.Decimal(15, 2)
  currency      String        @default("LKR")
  status        AccountStatus @default(ACTIVE)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([accountNumber])
}
```

### 8.3 Seed Data Strategy

```typescript
// prisma/seed.ts — Key seed data for Auth & Accounts

const BACKUP_IDENTITY_RECORDS = [
  { nationalId: "200012345678", fullName: "Kamal Perera" },
  { nationalId: "199887654321", fullName: "Nimali Fernando" },
  { nationalId: "198512341234", fullName: "Ruwan Silva" },
];

const DEMO_USERS = [
  {
    email: "demo@vaultguard.com",
    password: "VaultGuard@2065",
    nationalId: "200012345678",
    fullName: "Kamal Perera",
    role: "CUSTOMER",
    mfaEnabled: true,
    accounts: [
      { type: "SAVINGS", balance: 250000.00, number: "VG-SAV-001234" },
      { type: "CHECKING", balance: 75000.50, number: "VG-CHK-001235" },
      { type: "FIXED_DEPOSIT", balance: 500000.00, number: "VG-FD-001236" },
    ],
  },
  {
    email: "operator@vaultguard.com",
    password: "Operator@2065",
    nationalId: "199556781234",
    fullName: "Support Admin",
    role: "SUPPORT_OPERATOR",
    mfaEnabled: false,
    accounts: [],
  },
];
```

> [!TIP]
> Always hash passwords and MFA secrets in the seed script. Never store plaintext in the database, even for demo data. Document the plaintext credentials only in `USER_GUIDE.md`.

---

## 9. Security Best Practices

### 9.1 Password Security

| Practice | Implementation |
|:---------|:---------------|
| **Hashing algorithm** | bcrypt with cost factor 12 (≈250ms per hash) |
| **Minimum password length** | 12 characters |
| **Complexity requirements** | At least 1 uppercase, 1 lowercase, 1 digit, 1 special character |
| **Timing-safe comparison** | bcrypt.compare() is inherently timing-safe |
| **No plaintext storage** | Password stored as bcrypt hash only |
| **No password in logs** | PII redactor strips password fields from log output |

### 9.2 Token Security

| Practice | Implementation |
|:---------|:---------------|
| **Access token** | JWT signed with HS256 (or ES256), 15-minute TTL |
| **Refresh token** | Random UUID, stored hashed in DB, 7-day TTL |
| **Refresh token delivery** | `httpOnly; Secure; SameSite=Strict; Path=/api/auth` cookie |
| **Token rotation** | Every refresh issues new access + refresh pair; old refresh revoked |
| **Revocation** | Logout revokes all refresh tokens for user; `revokedAt` timestamp |
| **JWT payload** | Minimal: `{ sub: userId, email, role, iat, exp }` — no sensitive data |

### 9.3 MFA Security

| Practice | Implementation |
|:---------|:---------------|
| **TOTP algorithm** | RFC 6238 (SHA-1, 30s window, 6 digits) |
| **Secret storage** | Encrypted at rest (application-level encryption with env key) |
| **Backup codes** | 5 single-use codes, stored as bcrypt hashes |
| **Window tolerance** | ±1 step (90 second window) to account for clock drift |
| **Rate limiting** | Max 5 MFA attempts per session |

### 9.4 Input Security

| Practice | Implementation |
|:---------|:---------------|
| **Input validation** | Zod schemas on every endpoint — whitelist approach |
| **SQL injection** | Prisma ORM parameterized queries — never raw SQL |
| **XSS prevention** | JSON API responses (no HTML rendering from user input) |
| **CSRF protection** | SameSite=Strict cookies + custom header requirement |
| **Content-Type** | Reject requests without `application/json` Content-Type |
| **Body size limit** | 100KB max request body |

### 9.5 Information Security

| Practice | Implementation |
|:---------|:---------------|
| **Generic auth errors** | "Invalid email or password" — never reveal which is wrong |
| **No user enumeration** | Registration and password reset return same message regardless |
| **Error sanitization** | Production errors never include stack traces or internal details |
| **PII in logs** | Redact email, national ID, IP from log output (NFR-S7) |
| **Helmet headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc. |

### 9.6 Security Checklist

- [ ] All passwords hashed with bcrypt (cost 12)
- [ ] JWTs have max 15min TTL
- [ ] Refresh tokens are httpOnly, Secure, SameSite=Strict
- [ ] MFA secrets encrypted at rest
- [ ] All inputs validated with Zod before processing
- [ ] No raw SQL queries anywhere
- [ ] Generic error messages for auth failures
- [ ] PII redacted from all log output
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting on auth endpoints (5/min)

---

## 10. Validation Strategy

### 10.1 Zod Schema Examples

```typescript
// src/lib/validation/auth.schema.ts

import { z } from 'zod';

export const registerSchema = z.object({
  nationalId: z
    .string()
    .min(10, 'National ID must be at least 10 characters')
    .max(20, 'National ID must not exceed 20 characters')
    .regex(/^[0-9A-Za-z]+$/, 'National ID must be alphanumeric'),

  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),

  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Code must contain only digits'),
});

export const statementsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 10.2 Validation Middleware Pattern

```typescript
// Usage in route handler
export async function POST(request: NextRequest) {
  // 1. Parse and validate body
  const body = await request.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    }, { status: 400 });
  }

  // 2. Proceed with validated data (type-safe)
  const validatedData = result.data;
  // ...business logic
}
```

---

## 11. Error Handling & Logging

### 11.1 Error Code Taxonomy

```typescript
// src/lib/utils/error-codes.ts

export const ErrorCodes = {
  // Auth errors (AUTH_*)
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_EXPIRED: 'AUTH_REFRESH_EXPIRED',
  AUTH_REFRESH_REVOKED: 'AUTH_REFRESH_REVOKED',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID: 'AUTH_MFA_INVALID',
  AUTH_MFA_RATE_LIMITED: 'AUTH_MFA_RATE_LIMITED',
  AUTH_STEP_UP_REQUIRED: 'AUTH_STEP_UP_REQUIRED',
  AUTH_IDENTITY_NOT_FOUND: 'AUTH_IDENTITY_NOT_FOUND',
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',

  // Account errors (ACCOUNT_*)
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_FROZEN: 'ACCOUNT_FROZEN',
  ACCOUNT_ACCESS_DENIED: 'ACCOUNT_ACCESS_DENIED',

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_DEGRADED: 'SERVICE_DEGRADED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### 11.2 Structured Logging Format

```typescript
// Every log entry follows this structure (NFR-O1)
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;        // 'auth' | 'accounts'
  action: string;         // 'login.success' | 'register.identity_mismatch'
  correlationId: string;  // Per-request UUID
  userId?: string;        // Authenticated user (if available)
  metadata?: Record<string, unknown>; // Additional context (PII redacted)
  error?: {
    code: string;
    message: string;
    // No stack trace in production
  };
}
```

**Example log output:**
```json
{
  "timestamp": "2026-07-28T15:30:00.000Z",
  "level": "info",
  "service": "auth",
  "action": "login.success",
  "correlationId": "req-550e8400-e29b",
  "userId": "usr-abc123",
  "metadata": {
    "email": "k***@example.com",
    "deviceTrusted": true,
    "mfaUsed": true
  }
}
```

---

## 12. Testing Strategy

### 12.1 Test Pyramid

```
        ┌──────────┐
        │  E2E     │  ← Member 4 (integration tests)
        │  Tests   │
       ─┼──────────┼─
       │  Integration │  ← Member 2 (auth flow tests)
       │    Tests     │
      ─┼──────────────┼─
      │   Unit Tests    │  ← Member 2 (core priority)
      │                 │
      └─────────────────┘
```

### 12.2 Unit Tests (Your Responsibility)

**File:** `src/tests/unit/auth.test.ts`

| Test Suite | Test Cases |
|:-----------|:-----------|
| **password.ts** | Hash produces bcrypt hash · Verify correct password returns true · Verify incorrect password returns false · Hash is different each time (salt) · Timing is consistent (>100ms) |
| **jwt.ts** | Sign produces valid JWT · Verify accepts valid token · Verify rejects expired token · Verify rejects tampered token · Payload contains correct claims · Refresh token rotation invalidates old token |
| **mfa.ts** | Generate secret returns 16+ char base32 string · QR URI format is correct · Verify accepts valid TOTP code · Verify rejects wrong code · Verify accepts code within ±1 window · Verify rejects old code (>90s) · Backup code verify works · Used backup code fails second time |
| **device-trust.ts** | Fingerprint is deterministic for same inputs · Fingerprint differs for different inputs · Trusted device returns true · Unknown device returns false |
| **rbac.ts** | CUSTOMER cannot access SUPPORT_OPERATOR routes · SUPPORT_OPERATOR can access own routes · Role check is case-insensitive |

**File:** `src/tests/unit/accounts.test.ts`

| Test Suite | Test Cases |
|:-----------|:-----------|
| **account.service.ts** | Returns only authenticated user's accounts · Returns empty array for user with no accounts · Statements filter by date range correctly · Pagination works (offset, limit) · Account detail returns 404 for non-existent |

### 12.3 Integration Tests (Coordinate with Member 4)

**File:** `src/tests/integration/auth-flow.test.ts`

```
1. Register with valid backup identity → 201
2. Register with invalid NIC → 400
3. Register duplicate email → 409
4. Login with correct credentials → 200 + tokens
5. Login with wrong password → 401
6. Access protected route without token → 401
7. Access protected route with valid token → 200
8. Access protected route with expired token → 401
9. Refresh token rotation → new tokens + old revoked
10. Logout → cookies cleared + refresh revoked
11. MFA setup → secret + QR URI
12. Login with MFA → two-step flow
13. Step-up MFA → required for high-risk
14. Device trust → new device triggers MFA
15. RBAC → customer gets 403 on admin route
```

### 12.4 Test Running Commands

```bash
# Run all unit tests
npm run test:unit

# Run auth tests only
npx vitest run src/tests/unit/auth.test.ts

# Run with coverage
npx vitest run --coverage

# Run in watch mode during development
npx vitest watch src/tests/unit/auth.test.ts
```

---

## 13. Versioning & Git Strategy

### 13.1 Branch Strategy

```
main (protected)
  └── feat/auth-accounts (your branch)
       ├── Day 1: Prisma schema + seed + env setup
       ├── Day 2: Core auth (register, login, JWT)
       ├── Day 3: MFA + device trust
       ├── Day 4: Accounts + RBAC + step-up
       └── Day 5-6: Integration fixes
```

### 13.2 Commit Convention

Use **Conventional Commits** format:

```
<type>(<scope>): <description>

feat(auth): implement JWT access token signing and verification
feat(auth): add TOTP MFA setup and verification
feat(accounts): implement account listing with pagination
fix(auth): prevent refresh token reuse after rotation
refactor(auth): extract validation schemas to shared module
test(auth): add unit tests for password hashing
chore(prisma): update schema with MFA backup codes field
docs(auth): document API response formats
```

**Types:** `feat`, `fix`, `refactor`, `test`, `chore`, `docs`  
**Scopes:** `auth`, `accounts`, `prisma`, `middleware`, `validation`

### 13.3 Merge Strategy

| When | Action |
|:-----|:-------|
| **End of Day 2** | PR `feat/auth-accounts` → `main` (core auth complete) |
| **End of Day 4** | PR `feat/auth-accounts` → `main` (full auth + accounts) |
| **Day 5-6** | Integration fixes, direct to `main` via short-lived branches |

### 13.4 Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All inputs validated with Zod
- [ ] Error responses use standard envelope
- [ ] No raw SQL — Prisma only
- [ ] Auth middleware applied to all protected routes
- [ ] PII not logged
- [ ] TypeScript strict — no `any` types
- [ ] Unit tests pass
- [ ] No `console.log` — use structured logger

---

## 14. Scalability Roadmap

### 14.1 MVP → Production Evolution

```
Phase 2 (MVP)                    Phase 3 (Fortify)               Future
─────────────                    ─────────────────               ──────

Independent NestJS        →      Deploy to Cloud Run        →    Kubernetes (GKE)
  microservices                    containers via Cloud Build

Per-domain PostgreSQL     →      Per-domain Cloud SQL       →    Read replicas +
  (Docker containers)              (private IP VPC)               connection pooling

Nginx API Gateway         →      GCP API Gateway +          →    Cloud Armor WAF +
  (local dev routing)              Cloud Load Balancer            rate-based rules

Redis container           →      Memorystore (Redis)        →    Multi-region cache
  (counters & sessions)            cluster                        cluster

Local Pub/Sub mock        →      Google Cloud Pub/Sub       →    Pub/Sub with ordering
  (event bus)                      topics & subscriptions         keys + DLQ

.env secrets              →      Secret Manager +           →    Workload Identity
                                   Cloud KMS                      Federation
```

### 14.2 What We Built That Scales

| Pattern | Microservices Implementation | Why It Scales |
|:--------|:-----------------------------|:-------------|
| **Independent Services** | `services/auth-service/`, `services/accounts-service/` | Containerized microservices on independent ports; ready for Cloud Run |
| **Data Isolation** | Dedicated `schema.prisma` & DB per microservice | Zero cross-domain joins; physical database separation |
| **NestJS Architecture** | Injectable services, Guards, Interceptors, DTOs | Enterprise patterns out of the box; clean testability |
| **API Gateway Throttling** | Nginx / API Gateway route rules | Single ingress point; protects services from traffic spikes |
| **Standard Error Codes** | `AUTH_INVALID_CREDENTIALS` | Uniform machine-readable codes across all microservices |
| **Correlation IDs** | `x-correlation-id` header passed through | Distributed tracing across microservice call chains |
| **Health Probes** | `GET /health` on every microservice | Cloud Run / Kubernetes readiness and liveness probes |

### 14.3 Decisions Deferred to Phase 3

| Decision | Why Deferred |
|:---------|:-------------|
| OAuth2 / Social Login | Not in FR requirements; Identity Platform in Phase 3 |
| Passkey/FIDO2 support | Requires WebAuthn browser APIs; complex for MVP |
| Session blacklisting via Redis | JWT short TTL + refresh revocation sufficient for MVP |
| Multi-region failover | Cloud-specific; Phase 3 DR exercises |
| Automated key rotation | KMS handles this in Phase 3 |
| Account locking after failed attempts | Nice-to-have; rate limiting covers MVP security |

---

## 15. Integration Contracts

### 15.1 What You Provide to Other Members

#### → Member 1 (Frontend)

| What | Details |
|:-----|:-------|
| **Auth API endpoints** | All endpoints in §7.4 with request/response formats |
| **Token handling guide** | Access token in `Authorization: Bearer`, refresh in httpOnly cookie |
| **Error code reference** | All error codes in §11.1 for frontend error handling |
| **User object shape** | `{ id, email, fullName, role }` from login/refresh response |
| **MFA flow states** | `requiresMfa`, `mfaToken`, step-up MFA response format |

#### → Member 3 (Payments)

| What | Details |
|:-----|:-------|
| **Account balance check function** | `getAccountById(accountId, userId)` — returns account with balance |
| **Account debit/credit function** | `updateBalance(accountId, amount, type)` — atomic balance update |
| **withAuth middleware** | Reusable in payment route handlers |
| **User context from JWT** | `{ userId, role }` attached to request by middleware |
| **Step-up MFA middleware** | `withStepUpMfa()` for high-risk payment operations |

#### → Member 4 (Audit/DevOps)

| What | Details |
|:-----|:-------|
| **Auth events emitted** | `auth.register`, `auth.login`, `auth.logout`, `auth.mfa_change`, `auth.device_new` |
| **Event payload format** | `{ eventType, actor, actorRole, resource, resourceId, metadata, correlationId, timestamp }` |
| **withAuth + withRole middleware** | For audit and admin API route protection |
| **Prisma schema** | Complete schema file for all domains |

### 15.2 What You Need from Other Members

#### ← Member 3 (Payments)

| What | Why |
|:-----|:----|
| **Service health status** | To populate degraded mode flag for Accounts responses |
| **Transaction data** | For account statements (transactions linked to accounts) |

#### ← Member 4 (Audit/DevOps)

| What | Why |
|:-----|:----|
| **Rate limiter middleware** | To apply on auth endpoints (5/min login, 3/min register) |
| **Structured logger utility** | To use in auth service logging |
| **Correlation ID generator** | To attach to all requests and events |
| **Docker compose with PostgreSQL + Redis** | Development environment |

---

## 16. Appendix: Checklists

### 16.1 Daily Deliverables Checklist

#### Day 1 (Foundation) ✅
- [x] Prisma schema complete with all domain models
- [x] Migrations run successfully
- [x] Seed script populates demo data
- [x] Prisma client singleton working
- [x] `.env.example` committed
- [x] Team can run `docker-compose up` + `prisma db seed`

#### Day 2 (Core Auth) ✅
- [x] `POST /api/auth/register` — working with backup identity check
- [x] `POST /api/auth/login` — returns JWT
- [x] `POST /api/auth/refresh` — rotates tokens
- [x] `POST /api/auth/logout` — clears session
- [x] `withAuth()` middleware — protects routes
- [x] Zod validation on all endpoints
- [x] Unit tests for password + JWT modules

#### Day 3 (MFA + Accounts Start) ✅
- [ ] `POST /api/auth/mfa/setup` — generates TOTP secret
- [ ] `POST /api/auth/mfa/verify` — verifies 6-digit code
- [ ] Login flow integrates MFA
- [ ] `GET /api/accounts` — lists user accounts
- [ ] `GET /api/accounts/[id]/statements` — filtered statements
- [ ] Unit tests for MFA module

#### Day 4 (Advanced Auth + Accounts Complete) ✅
- [ ] Device trust — fingerprint, check, CRUD
- [ ] Step-up MFA middleware working
- [ ] RBAC — withRole() guards admin routes
- [ ] Degraded mode — health flag check
- [ ] Auth events emitted to EventBus
- [ ] All auth unit tests pass
- [ ] All accounts unit tests pass

#### Day 5-6 (Integration) ✅
- [ ] End-to-end: register → login → MFA → dashboard → accounts
- [ ] Payment service can check balances via account service
- [ ] Audit consumer receives auth events
- [ ] All integration tests pass
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] Code review complete

### 16.2 Security Review Checklist (Pre-Submission)

- [ ] No plaintext passwords in DB (verify via Prisma Studio)
- [ ] No secrets in git history (`git log --all -p | grep -i password`)
- [ ] JWT secret is strong (256-bit minimum)
- [ ] httpOnly flag set on refresh token cookie
- [ ] Secure flag set on cookie (for production)
- [ ] SameSite=Strict on cookie
- [ ] Rate limiting active on login/register endpoints
- [ ] Input validation on every endpoint
- [ ] No user enumeration via registration/login error messages
- [ ] No PII in application logs
- [ ] CORS limited to allowed origins
- [ ] Helmet security headers applied

---

## Final Notes

> [!IMPORTANT]
> **The Auth & Accounts services are the critical path.** Every other service depends on authentication working. Prioritize stability and correctness over features. A working login with JWT is more valuable than a half-working MFA + device trust.

> [!TIP]
> **Implementation priority:** If you're running behind schedule, ship in this order:
> 1. 🔴 Register + Login + JWT + Refresh + Logout (core auth)
> 2. 🔴 Account listing + balances (core accounts)
> 3. 🟡 MFA setup + verify (security layer)
> 4. 🟡 withAuth + withRole middleware (enables other services)
> 5. 🟢 Device trust + Step-up MFA (advanced security)
> 6. 🟢 Degraded mode + Statements (polish)

> [!NOTE]
> This plan is a living document. Update it as decisions are made during development. Mark checklist items as you complete them.

---

**VaultGuard** · Team BackTrack · Duothan 6.0  
*Rebuild the future. Defend the digital world.*
