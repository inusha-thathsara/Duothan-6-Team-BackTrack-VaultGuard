# VaultGuard — Phase 02 · REBUILD — Finalized Implementation Plan

**Team:** BackTrack
**Members:** Inusha Gunasekara (Lead), Kaushalya Wijesiri, Anushka Thisera, Pushpika Jayanath
**Deadline:** 31 July 2026, 11:59 PM
**Source Documents:**
- [Team BackTrack_Recon.pdf](file:///e:/Documents/Projects/Duothon/plan/Team%20BackTrack_Recon.pdf) — our Phase 1 blueprint
- [Phase-2 Context.docx.pdf](file:///e:/Documents/Projects/Duothon/Phase-2%20Context.docx.pdf) — official Phase 2 brief
- [delegate-booklet.pdf](file:///e:/Documents/Projects/Duothon/delegate-booklet.pdf) — competition rules & timeline

---

## 1. Phase 02 Mandate

From the official brief:

> *"Teams transition from planning to implementation by transforming their Phase 1 architecture and design document into a functional banking web application."*

Key requirements from the brief:
- Application must **reflect objectives and features from Phase 1**
- Implement **core banking functionalities** with frontend + backend + databases + APIs
- Use **GitHub** with proper version control, modular development, clean code
- Solution must be **functional, organized, and aligned with Phase 1 requirements**

### Deliverables

| # | Deliverable | Format |
|---|------------|--------|
| 1 | **Public GitHub Repository Link** | URL submitted via form |
| 2 | **Working Web Application Source Code** | `.zip` uploaded via form |
| 3 | **User Guide Markdown File** | `USER_GUIDE.md` in repo root |

**Submission:** [duothan.ieeensbm.org/submission](https://duothan.ieeensbm.org/submission)

---

## 2. Evaluation Criteria → Execution Strategy

| Criteria | Weight | Our Execution (Mapped to Phase 1 Blueprint) |
|----------|--------|----------------------------------------------|
| **Solution's Functionality** | 15% | Implement every FR from our blueprint: FR-01 to FR-22. All 9 wireframe screens (Figures 2–10) functional end-to-end. |
| **System Architecture & Best Practices** | 15% | Preserve Phase 1's 6-service domain separation (Auth, Accounts, Payments, Loans, Notification, Audit). Saga/outbox pattern (§3.3). Per-domain data isolation (§3.1). TypeScript strict, ESLint, Prettier. |
| **Client-Side Handling** | 10% | Match Phase 1 wireframe visual identity (§4.1): Navy `#0A1128`, Mint `#00E699`, trust-forward design. Responsive mobile-first (NFR-U1). WCAG 2.1 AA contrast (NFR-U2). Error boundaries, skeleton loaders, toast feedback. |
| **Authentication System** | 15% | Implement FR-01 to FR-05 exactly: JWT source of truth (§3.2), TOTP MFA (FR-02), device trust + step-up MFA (FR-03), RBAC Customer/Support Operator (FR-05), session expiry (FR-04). |
| **Server-Side Handling** | 20% | FR-13 idempotent `request_id`. FR-14a transactional outbox. FR-14b event_id dedup + DLQ. FR-21 API Gateway auth + rate limits. Zod validation. Saga coordination (§3.3). Helmet security headers. |
| **Quality Assurance Strategies** | 15% | Unit tests for auth/ledger/outbox. Integration API tests. Simulated degraded mode (FR-08, §3.4). Linting CI pipeline. |
| **Enterprise Base Strategies** | 10% | Docker containerization. Structured logging (NFR-O1). Health checks (FR-20). `.env.example`. PII minimization in logs (NFR-S7). OWASP mitigations. |

---

## 3. Phase 1 Blueprint → Phase 2 Architecture Mapping

> [!IMPORTANT]
> Phase 2 deliverable is a **working web application source code** — not a cloud deployment. Cloud Run / GCP deployment is Phase 3 (Fortify). Our architecture preserves clean domain boundaries identical to Phase 1 so the Phase 3 lift is trivial.

### Phase 1 Service Architecture (from §3.2 of our submitted blueprint)

```
Users (Web Next.js / Mobile)
    │
    ▼
Load Balancer + CDN + Cloud Armor ──► simulated as: Helmet + rate-limiter middleware
    │
    ▼
HA API Gateway ──► simulated as: Next.js API route layer with auth guard + rate limiting
    │
    ├──► Auth Service        → src/lib/services/auth/
    ├──► Accounts Service    → src/lib/services/accounts/
    ├──► Payments Service    → src/lib/services/payments/
    ├──► Loans Service       → src/lib/services/loans/
    ├──► Audit Service       → src/lib/services/audit/
    │         ▲
    │         │ (Event Bus = Pub/Sub analogue)
    │         └── Notification Service → src/lib/services/notifications/
    │                                    (internal only — no API route, per §3.2)
```

### Technology Stack (matches §7.1 of our blueprint)

| Phase 1 Blueprint (§7.1) | Phase 2 Implementation | Rationale |
|---------------------------|------------------------|-----------|
| **Next.js (React) + TypeScript** | Next.js 15 (App Router, React 19, TypeScript) | Exact match |
| **NestJS (Node.js) on Cloud Run** | Next.js API Route Handlers with NestJS-style domain service modules | Same domain boundaries; deploys to Cloud Run in Phase 3 |
| **Cloud SQL for PostgreSQL (per domain)** | PostgreSQL via Prisma ORM, domain-isolated schema models | Same RDBMS; single instance with logical isolation (physical separation in Phase 3) |
| **Identity Platform JWTs** | Custom JWT (jose library) + TOTP (otplib) | JWT is session source of truth per §3.2; Identity Platform swap in Phase 3 |
| **Memorystore for Redis** | Redis via ioredis in Docker | Cache + rate-limits only, not session SoT (per §3.2, §3.5) |
| **Pub/Sub + DLQ** | In-process EventBus + outbox worker + dead_letter_queue table | Same pattern; swap to Pub/Sub in Phase 3 |
| **BigQuery** | PostgreSQL audit_events table (structured JSON) | Same immutable audit schema; swap to BQ in Phase 3 |
| **Saga + transactional outbox** | Prisma `$transaction` with outbox_events table | Exact pattern from §3.3 |
| **Secret Manager + Cloud KMS** | `.env` secrets + simulated KMS key operations | Real KMS in Phase 3 |
| **Cloud Armor + CDN** | Helmet headers + express-rate-limit | WAF/DDoS simulation; real Armor in Phase 3 |
| **Cloud Build + Artifact Registry** | GitHub Actions CI + Docker | Same CI/CD concept; swap to Cloud Build in Phase 3 |
| **Terraform (planned)** | Docker Compose | IaC simulation; Terraform in Phase 3 |

---

## 4. FR Traceability Matrix

Every Functional Requirement from our Phase 1 submission (§5) explicitly implemented:

### Identity & Access (§5.1)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-01** | Verify identity against restored backup records; first-time re-enrollment | `POST /api/auth/register` — validates against seed backup data (NIC + name match), creates user, forces password set + MFA enrollment |
| **FR-02** | Authenticate with password and MFA (TOTP/SMS/passkey) | `POST /api/auth/login` — bcrypt password verify → TOTP challenge via `POST /api/auth/mfa/verify` |
| **FR-03** | Trusted-device registration; step-up MFA for unrecognized devices | Device fingerprint (user-agent + IP hash) checked against `trusted_devices` table; unknown device → forced MFA |
| **FR-04** | Session expiry and secure logout | JWT access token 15min TTL; refresh token 7d with rotation; `POST /api/auth/logout` clears cookies + invalidates DB refresh token |
| **FR-05** | Role-based access: Customer and Support Operator | `role` field on User model; `withRole()` middleware guard; Support Operator gets read-only customer lookup (FR-22) |

### Accounts (§5.2)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-06** | View account list, balance, status | `GET /api/accounts` — returns user's accounts with type, balance, status badge |
| **FR-07** | Download/view statements for date range | `GET /api/accounts/[id]/statements?from=&to=` — filtered transaction entries |
| **FR-08** | Accounts available read-only when Payments degraded | Service health flag check; if payments unhealthy → accounts API still responds, transfer endpoints return 503 with "service degraded" message |

### Payments & Transfers (§5.3)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-09** | Domestic transfer to saved or new payee | `POST /api/payments/transfer` — select source account, payee (from saved list or create new), amount |
| **FR-10** | Confirmation review before commit | Frontend multi-step wizard: Amount → Payee → **Review** (shows amount, payee, fee) → Confirm |
| **FR-11** | Configurable transfer limits; high-risk → step-up MFA | Per-account-type daily/single limits; amount > threshold returns `{ requiresStepUpMfa: true }` |
| **FR-12** | Bill payments to registered billers | `POST /api/payments/bill-pay` — biller is a special payee type; reuses payment engine |
| **FR-13** | Idempotent payment submission (request_id) | `x-request-id` header; unique constraint on `transactions.request_id`; duplicate → return cached result |
| **FR-14** | Transaction history with status | `GET /api/payments/history` — paginated, filterable (date/type/status), searchable |
| **FR-14a** | Transactional outbox row with ledger commit | Prisma `$transaction`: write ledger rows + `outbox_events` row atomically |
| **FR-14b** | Dedup by event_id; DLQ for exhausted deliveries | Audit/Notify consumers check `event_id` before processing; failed events after 3 retries → `dead_letter_queue` table |

### Loans (§5.4)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-15** | View active loans, principal, next due date | `GET /api/loans` — loan cards with principal, rate, outstanding, schedule, progress |
| **FR-16** | Loan repayment from eligible account | `POST /api/loans/repay` — debit linked account, reduce loan balance, create audit event |

### Notifications & Audit (§5.5)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-17** | Notify: new device login, payment success/fail, MFA changes | Notification service subscribes to events (`auth.device_new`, `payment.completed`, `payment.failed`, `auth.mfa_change`); simulated email/SMS log |
| **FR-18** | Personal security activity feed | `GET /api/audit/me` — timeline of user's security events (logins, MFA, devices, payments) |
| **FR-19** | Immutable audit events for auth, payments, admin | Every auth/payment/admin action writes to `audit_events` with `{ actor, action, resource, metadata, correlationId, timestamp }` |

### Resilience & Operations (§5.6)

| FR ID | Requirement | Implementation |
|-------|-------------|----------------|
| **FR-20** | Public system-status view (healthy/degraded) | `GET /api/health` + `/status` page showing per-service health (green/yellow/red) |
| **FR-21** | Gateway rejects unauth requests; rate limits | Auth middleware on all protected routes; Redis-backed rate limiter (auth: 5/min, payments: 10/min) |
| **FR-22** | Support Operator customer lookup with audit | `GET /api/admin/customers/[id]` — SUPPORT_OPERATOR role only; access itself logged to audit |

---

## 5. NFR Coverage Map

Key Non-Functional Requirements from our blueprint (§6) and how Phase 2 addresses them:

| NFR ID | Requirement | Phase 2 Implementation |
|--------|-------------|----------------------|
| **NFR-S1** | TLS 1.2+ in transit | HTTPS in production; dev uses localhost; Phase 3 enforces TLS via Cloud Run |
| **NFR-S2** | Data at rest encrypted; secrets in Secret Manager | PostgreSQL disk encryption (Docker default); secrets in `.env` (Secret Manager in Phase 3) |
| **NFR-S7** | PII minimized in logs; no plaintext PAN | Logger utility redacts email/PAN patterns before output |
| **NFR-R2** | Circuit breakers; no cascade | Service health flags + timeouts; degraded mode returns 503 without crashing other services |
| **NFR-R6** | JWTs are session SoT; Redis not sole session store | JWT verification at API layer; Redis only for cache/rate-limits |
| **NFR-R7** | Saga + outbox; no 2PC | Prisma `$transaction` for local commit; outbox worker for cross-domain |
| **NFR-R8** | Pub/Sub retries + DLQ; idempotent consumers | Event bus retries 3x; DLQ table; `event_id` dedup |
| **NFR-O1** | Structured logs, metrics, traces | JSON logger with `{ timestamp, level, service, correlationId }` |
| **NFR-O2** | Immutable security event retention | `audit_events` table: append-only, no UPDATE/DELETE |
| **NFR-O3** | Support Operator access attributable | All admin API calls logged with operator ID + timestamp |
| **NFR-U1** | Mobile-responsive | All pages responsive (mobile-first CSS breakpoints) |
| **NFR-U2** | WCAG 2.1 AA contrast | Design system enforces Navy/White high-contrast palette |
| **NFR-U3** | Plain-language errors | User-facing error messages avoid jargon; friendly recovery prompts |

---

## 6. UI Screens (Matching Phase 1 Wireframes §4, Figures 2–10)

Each wireframe from our submitted blueprint maps to a page:

| Fig # | Screen (from PDF) | Route | Key Elements |
|-------|-------------------|-------|-------------|
| **Fig 2** | Landing — brand-first recovery entry | `/` | VaultGuard shield logo hero, deep navy gradient background, "Recover Access" + "Sign In" CTAs, trust badges, animated subtle particles |
| **Fig 3** | Secure Login | `/login` | Email + password form, "Recover Identity" link, clean navy/white split layout |
| **Fig 4** | MFA Challenge | `/mfa` | 6-digit TOTP input with auto-focus progression, countdown timer, "Use backup code" link |
| **Fig 5** | Customer Dashboard | `/dashboard` | Balance cards (glassmorphism on dark slate), quick-action grid (Transfer, Pay Bill, Loans, Security), recent transactions mini-list, security status chip (green shield icon) |
| **Fig 6** | Transfer / Payment Flow | `/transfers` | Multi-step wizard: Source Account → Amount + Payee → Review (amount, payee name, fee summary) → Confirm → Receipt with reference |
| **Fig 7** | Transaction History | `/transfers/history` | Filterable table (date range, type, status), search bar, pagination, status badges (green=completed, yellow=pending, red=failed) |
| **Fig 8** | Loans & Credit Overview | `/loans` | Loan cards with principal, rate, outstanding, next due, circular progress indicator; "Make Payment" button → repayment modal |
| **Fig 9** | Security & Recovery Settings | `/security` | Trusted devices list (with revoke), recovery contacts, security activity timeline (sourced from audit), "Setup MFA" / "Change Password" actions |
| **Fig 10** | System Status (ops transparency) | `/status` | Per-service health cards (Auth, Accounts, Payments, Loans, Notifications, Audit) with green/yellow/red indicators, last-checked timestamps, uptime metrics |

**Visual Identity (from §4.1):**
- Primary: Navy `#0A1128`
- Surface: Dark Slate `#1B2845`
- Accent: Mint `#00E699`
- Text: White `#F0F4F8` / Light Gray `#94A3B8`
- Typography: Inter (Google Fonts)
- Style: Trust-forward, generous spacing, high contrast, glassmorphism cards

---

## 7. Database Schema Design

Single PostgreSQL instance with domain-prefixed models (mirrors Phase 1's per-domain Cloud SQL architecture from §3.2):

### Auth Domain (maps to Auth Service)
```
User { id, email, passwordHash, nationalId, fullName, role(CUSTOMER|SUPPORT_OPERATOR), mfaEnabled, createdAt }
MfaFactor { id, userId, secret, backupCodes, verifiedAt }
TrustedDevice { id, userId, fingerprint, userAgent, ipHash, label, trustedAt }
RefreshToken { id, userId, token, expiresAt, revokedAt }
```

### Accounts Domain (maps to Accounts Service + accounts_db)
```
Account { id, userId, accountNumber, type(SAVINGS|CHECKING), balance(Decimal), currency, status(ACTIVE|FROZEN), createdAt }
```

### Payments Domain (maps to Payments Service + payments_db)
```
Transaction { id, requestId(unique), fromAccountId, toAccountId, amount, currency, type(TRANSFER|BILL_PAY|LOAN_REPAYMENT), status(PENDING|COMPLETED|FAILED|COMPENSATED), sagaStatus(INITIATED|DEBITED|CREDITED|COMPLETED|COMPENSATED), description, fee, createdAt }
Payee { id, userId, name, accountNumber, bankCode, type(PERSON|BILLER), createdAt }
OutboxEvent { id, eventType, payload(JSON), processed, retryCount, createdAt, processedAt }
```

### Loans Domain (maps to Loans Service + loans_db)
```
Loan { id, userId, accountId, principalAmount, outstandingBalance, interestRate, termMonths, nextDueDate, status(ACTIVE|PAID_OFF|DEFAULTED), createdAt }
RepaymentSchedule { id, loanId, dueDate, amount, status(UPCOMING|PAID|OVERDUE) }
```

### Audit Domain (maps to Audit Service + BigQuery analogue)
```
AuditEvent { id, eventId(unique), actor, actorRole, action, resource, resourceId, metadata(JSON), correlationId, ipAddress, timestamp }
DeadLetterEntry { id, originalEventId, eventType, payload(JSON), failureReason, retryCount, createdAt, replayedAt }
```

### Seed Data
- 2 demo users: `demo@vaultguard.com` (CUSTOMER), `operator@vaultguard.com` (SUPPORT_OPERATOR)
- 3 accounts per customer (Savings, Checking, Fixed Deposit) with pre-set balances
- 15+ sample transactions (mix of transfers, bill payments)
- 2 active loans with repayment schedules
- 5 registered payees + 3 billers
- Sample audit events

---

## 8. Implementation Details by Domain

### 8.1 Auth Service (FR-01 to FR-05)

| Endpoint | Method | Description | Key Logic |
|----------|--------|-------------|-----------|
| `/api/auth/register` | POST | Backup identity restore + enrollment | Validate NIC + name against seed backup data; hash password (bcrypt cost 12); create User + initial Account; return success |
| `/api/auth/login` | POST | Email + password authentication | Verify bcrypt hash; check MFA enrollment → if enabled: return `{ requiresMfa: true, mfaToken }`; if not: issue JWT + refresh token |
| `/api/auth/mfa/setup` | POST | Generate TOTP secret + QR | `otplib.authenticator.generateSecret()`; return `otpauth://` URI for QR rendering; store MfaFactor |
| `/api/auth/mfa/verify` | POST | Validate 6-digit TOTP | Verify token against stored secret; on success: issue JWT access (15min) + refresh (7d httpOnly cookie); register device if new |
| `/api/auth/refresh` | POST | Rotate refresh token | Validate current refresh token in DB; issue new access + refresh tokens; revoke old |
| `/api/auth/logout` | POST | Secure session termination | Revoke refresh token in DB; clear httpOnly cookie |
| `/api/auth/devices` | GET/POST/DELETE | Manage trusted devices | List user's devices; add new fingerprint; revoke existing |

**Auth Middleware (`withAuth`):** Extracts JWT from `Authorization: Bearer <token>`, verifies signature + expiry via `jose`, attaches `{ userId, role }` to request context. Rejects with 401 if invalid.

**Step-Up MFA Middleware:** For high-risk endpoints (new payee, transfer > limit), checks if a recent MFA verification exists (within 5 minutes); if not, returns `{ requiresStepUpMfa: true }`.

### 8.2 Accounts Service (FR-06 to FR-08)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/accounts` | GET | List user's accounts with balances |
| `/api/accounts/[id]` | GET | Single account detail |
| `/api/accounts/[id]/statements` | GET | Paginated statements for date range (`?from=&to=&page=&limit=`) |

**Degraded Mode (FR-08):** Checks service health flag. If payments flagged unhealthy → accounts endpoints still respond normally, but frontend shows "Transfers temporarily unavailable" banner.

### 8.3 Payments Service (FR-09 to FR-14b, §3.3 Saga Flow)

**Transfer Saga Flow (matches §3.3 exactly):**

```
1. Client sends POST /api/payments/transfer with x-request-id header
2. Middleware: Check idempotency (request_id unique constraint)
3. Service: Validate input (Zod schema)
4. Service: Check sender balance via Accounts service interface
5. Service: Apply risk checks (limits, step-up MFA trigger)
6. Prisma.$transaction (atomic):
   a. Debit sender account (sagaStatus: DEBITED)
   b. Credit receiver account (sagaStatus: CREDITED)
   c. Write Transaction row (status: COMPLETED, sagaStatus: COMPLETED)
   d. Write OutboxEvent { eventType: "payment.completed", payload: {...} }
7. Return success with transaction receipt
8. [Background] Outbox worker picks up event → emits to EventBus
9. [Background] Audit + Notification consumers process event (dedup by event_id)
10. On failure at step 6: compensating transaction (sagaStatus: COMPENSATED)
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/transfer` | POST | Idempotent fund transfer (full saga) |
| `/api/payments/bill-pay` | POST | Bill payment (reuses engine) |
| `/api/payments/history` | GET | Paginated transaction history with filters |
| `/api/payees` | GET/POST | List/add payees |

### 8.4 Loans Service (FR-15, FR-16)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/loans` | GET | Active loans with schedules |
| `/api/loans/[id]` | GET | Single loan detail + repayment history |
| `/api/loans/repay` | POST | Repayment: debit account, reduce outstanding, audit log |

### 8.5 Audit Service (FR-17 to FR-19)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit/me` | GET | Personal security activity timeline |
| `/api/audit` | GET | Admin audit search (SUPPORT_OPERATOR only, FR-22) |
| `/api/admin/customers/[id]` | GET | Customer profile lookup (SUPPORT_OPERATOR, access audited) |

**Event Consumer:** Subscribes to EventBus events:
- `payment.completed` / `payment.failed` → audit log + notification trigger
- `auth.login` / `auth.device_new` / `auth.mfa_change` → audit log + notification trigger

**DLQ:** Events failing after 3 retries (exponential backoff: 1s, 5s, 30s) → written to `dead_letter_queue` table. Admin can view and replay via `/api/audit/dlq`.

### 8.6 Notification Service (FR-17, Internal Only per §3.2)

No public API routes (matches Phase 1: "internal only — no public Gateway route").

Subscribes to EventBus, deduplicates by `event_id`, simulates notification delivery:
- Console log formatted as email/SMS (for demo)
- Records delivery status in audit log

---

## 9. Project File Structure

```
vaultguard/
├── .github/
│   └── workflows/
│       └── ci.yml                        # Lint + typecheck + test on push/PR
├── docker-compose.yml                    # app + postgres + redis
├── Dockerfile                            # Multi-stage build
├── .env.example                          # Documented env vars
├── .eslintrc.json
├── .prettierrc
├── package.json
├── tsconfig.json
├── USER_GUIDE.md                         # ★ Phase 2 deliverable
├── README.md
│
├── prisma/
│   ├── schema.prisma                     # All domain models
│   ├── seed.ts                           # Demo data (users, accounts, loans, etc.)
│   └── migrations/
│
├── public/
│   └── assets/                           # Logo, favicons
│
└── src/
    ├── app/                              # Next.js App Router — Pages + API
    │   ├── layout.tsx                    # Root layout (fonts, providers, nav shell)
    │   ├── page.tsx                      # Fig 2: Landing page
    │   ├── globals.css                   # Design system tokens
    │   │
    │   ├── (auth)/                       # Auth route group
    │   │   ├── login/page.tsx            # Fig 3: Secure login
    │   │   ├── register/page.tsx         # Backup identity restore
    │   │   └── mfa/page.tsx              # Fig 4: MFA challenge
    │   │
    │   ├── dashboard/page.tsx            # Fig 5: Dashboard
    │   │
    │   ├── transfers/
    │   │   ├── page.tsx                  # Fig 6: Transfer wizard
    │   │   └── history/page.tsx          # Fig 7: Transaction history
    │   │
    │   ├── payments/page.tsx             # Bill pay (Fig 6 variant)
    │   │
    │   ├── loans/page.tsx                # Fig 8: Loans overview
    │   │
    │   ├── security/page.tsx             # Fig 9: Security & recovery
    │   │
    │   ├── status/page.tsx               # Fig 10: System status
    │   │
    │   └── api/                          # Backend Route Handlers
    │       ├── auth/
    │       │   ├── register/route.ts
    │       │   ├── login/route.ts
    │       │   ├── refresh/route.ts
    │       │   ├── logout/route.ts
    │       │   ├── mfa/setup/route.ts
    │       │   ├── mfa/verify/route.ts
    │       │   └── devices/route.ts
    │       ├── accounts/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       └── statements/route.ts
    │       ├── payments/
    │       │   ├── transfer/route.ts
    │       │   ├── bill-pay/route.ts
    │       │   └── history/route.ts
    │       ├── payees/route.ts
    │       ├── loans/
    │       │   ├── route.ts
    │       │   └── repay/route.ts
    │       ├── audit/
    │       │   ├── route.ts
    │       │   ├── me/route.ts
    │       │   └── dlq/route.ts
    │       ├── admin/
    │       │   └── customers/[id]/route.ts
    │       └── health/route.ts
    │
    ├── components/
    │   ├── ui/                           # Design system primitives
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Toast.tsx
    │   │   ├── Skeleton.tsx
    │   │   └── StatusIndicator.tsx
    │   ├── layout/
    │   │   ├── Navbar.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Footer.tsx
    │   │   └── AuthGuard.tsx
    │   └── features/
    │       ├── AccountCard.tsx
    │       ├── TransferWizard.tsx
    │       ├── TransactionRow.tsx
    │       ├── LoanCard.tsx
    │       ├── AuditTimeline.tsx
    │       ├── DeviceList.tsx
    │       └── ServiceHealthCard.tsx
    │
    ├── lib/
    │   ├── services/                     # Domain service modules (= Phase 1 microservices)
    │   │   ├── auth/
    │   │   │   ├── jwt.ts                # Sign/verify with jose
    │   │   │   ├── password.ts           # bcrypt hash/compare
    │   │   │   ├── mfa.ts                # otplib TOTP generate/verify
    │   │   │   ├── device-trust.ts       # Fingerprint, trust check
    │   │   │   └── rbac.ts               # Role guard logic
    │   │   ├── accounts/
    │   │   │   ├── account.service.ts    # Balance queries, statements
    │   │   │   └── degraded.ts           # Health flag check
    │   │   ├── payments/
    │   │   │   ├── transfer.service.ts   # Saga transfer engine
    │   │   │   ├── idempotency.ts        # request_id check
    │   │   │   ├── risk-check.ts         # Limits, MFA trigger
    │   │   │   └── bill-pay.service.ts   # Biller payment
    │   │   ├── loans/
    │   │   │   └── loan.service.ts       # Loan queries, repayment
    │   │   ├── notifications/
    │   │   │   └── notification.consumer.ts  # Event listener, simulated delivery
    │   │   └── audit/
    │   │       ├── audit.service.ts      # Event logger, feed queries
    │   │       └── dlq.service.ts        # Dead letter handling
    │   ├── db/
    │   │   └── prisma.ts                 # Prisma client singleton
    │   ├── events/
    │   │   ├── event-bus.ts              # In-process EventEmitter (Pub/Sub analogue)
    │   │   └── outbox-worker.ts          # Polls outbox_events, emits, marks processed
    │   ├── middleware/
    │   │   ├── with-auth.ts              # JWT extraction + verification
    │   │   ├── with-role.ts              # RBAC guard
    │   │   ├── rate-limiter.ts           # Redis sliding window
    │   │   ├── idempotency.ts            # x-request-id middleware
    │   │   └── error-handler.ts          # Centralized JSON error responses
    │   ├── validation/
    │   │   ├── auth.schema.ts            # Zod schemas for auth endpoints
    │   │   ├── payment.schema.ts
    │   │   └── loan.schema.ts
    │   └── utils/
    │       ├── logger.ts                 # Structured JSON logger (NFR-O1)
    │       ├── correlation-id.ts         # Per-request correlation ID
    │       └── pii-redactor.ts           # Redact PII from logs (NFR-S7)
    │
    └── tests/
        ├── unit/
        │   ├── auth.test.ts              # JWT, bcrypt, TOTP tests
        │   ├── ledger.test.ts            # Balance math, overdraft, double-entry
        │   ├── idempotency.test.ts       # Duplicate request_id detection
        │   └── outbox.test.ts            # Event serialization, retry logic
        └── integration/
            ├── auth-flow.test.ts         # Register → login → MFA → protected route
            ├── transfer-flow.test.ts     # Auth → transfer → balance check → audit
            └── degraded-mode.test.ts     # Payments down → accounts read-only
```

---

## 10. Team Work Distribution

Assigned by **domain boundary** matching Phase 1 service boundaries to minimize merge conflicts:

### 👤 Member 1: Inusha Gunasekara — Team Lead & Frontend Architect

**Branch:** `feat/frontend` | **Owns:** Project scaffold, design system, all UI pages, client-side integration

| # | Task | Phase 1 Ref |
|---|------|-------------|
| 1 | Project init: `create-next-app`, TypeScript strict, ESLint, Prettier, Husky, folder structure, `.env.example` | §7.1 |
| 2 | Design system: CSS tokens (Navy/Mint/Slate), Inter font, component library (Button, Card, Input, Modal, Badge, Toast, Skeleton, StatusIndicator) | §4.1 |
| 3 | Root layout: responsive sidebar nav, top bar with user menu, AuthGuard wrapper | §4 |
| 4 | **Fig 2** — Landing page: shield logo hero, navy gradient, CTAs, trust badges | §4.3 |
| 5 | **Fig 3 + Fig 4** — Login + Register + MFA pages | §4.3, FR-01–FR-03 |
| 6 | **Fig 5** — Dashboard: balance cards, quick actions, recent transactions, security chip | §4.3, FR-06 |
| 7 | **Fig 6** — Transfer wizard (multi-step: account → amount/payee → review → confirm → receipt) + Bill Pay page | §4.3, FR-09–FR-12 |
| 8 | **Fig 7** — Transaction history: filters, search, pagination, status badges | §4.3, FR-14 |
| 9 | **Fig 8** — Loans overview: loan cards + repayment modal | §4.3, FR-15–FR-16 |
| 10 | **Fig 9** — Security settings: device list, activity timeline | §4.3, FR-18 |
| 11 | **Fig 10** — System status: per-service health cards | §4.3, FR-20 |
| 12 | Auth context provider, API client with JWT interceptor + auto-refresh, toast system | FR-04 |

---

### 👤 Member 2: Kaushalya Wijesiri — Auth & Accounts Backend Engineer

**Branch:** `feat/auth-accounts` | **Owns:** Prisma schema, auth service (FR-01–FR-05), accounts service (FR-06–FR-08), seed data

| # | Task | Phase 1 Ref |
|---|------|-------------|
| 1 | Full Prisma schema: all domain models, indexes, unique constraints, relations | §3.2 |
| 2 | Seed script: demo users, accounts with balances, sample transactions, loans, payees | §2.4 |
| 3 | FR-01: `POST /api/auth/register` — backup identity restore, password hash, create user | FR-01 |
| 4 | FR-02: `POST /api/auth/login` — password verify → MFA check → JWT issuance | FR-02 |
| 5 | FR-02: `POST /api/auth/mfa/setup` + `verify` — TOTP secret, QR, verify challenge | FR-02 |
| 6 | FR-03: Device trust — fingerprint, trusted_devices CRUD, step-up MFA trigger | FR-03 |
| 7 | FR-04: JWT access (15min) + refresh (7d, httpOnly) + rotation + secure logout | FR-04 |
| 8 | FR-05: `withAuth()` + `withRole()` middleware guards | FR-05 |
| 9 | FR-06: `GET /api/accounts` — list accounts with balances | FR-06 |
| 10 | FR-07: `GET /api/accounts/[id]/statements` — date-range filtered | FR-07 |
| 11 | FR-08: Degraded mode check — service health flag, read-only fallback | FR-08 |

---

### 👤 Member 3: Anushka Thisera — Payments, Saga & Loans Engineer

**Branch:** `feat/payments-loans` | **Owns:** Payments engine (FR-09–FR-14b), loans service (FR-15–FR-16), event bus + outbox

| # | Task | Phase 1 Ref |
|---|------|-------------|
| 1 | FR-13: Idempotency middleware — `x-request-id` header, unique constraint check | FR-13, §3.3 |
| 2 | FR-09: `POST /api/payments/transfer` — full saga: validate → debit → credit → outbox (atomic) | FR-09, §3.3 |
| 3 | FR-11: Risk check — daily/single limits, step-up MFA trigger for high-risk | FR-11 |
| 4 | FR-10: Transfer confirmation data assembly for frontend review step | FR-10 |
| 5 | FR-12: `POST /api/payments/bill-pay` — biller as special payee | FR-12 |
| 6 | FR-14: `GET /api/payments/history` — paginated, filtered, searchable | FR-14 |
| 7 | FR-14a: Outbox pattern — `outbox_events` written atomically with ledger | FR-14a, §3.3 |
| 8 | FR-14b: Outbox worker — polls unpublished, emits to EventBus, retries, DLQ routing | FR-14b, §3.3 |
| 9 | EventBus class — in-process EventEmitter (Pub/Sub analogue) | §3.2 |
| 10 | Payees CRUD — `GET/POST /api/payees` | FR-09 |
| 11 | FR-15: `GET /api/loans` — active loans with schedules | FR-15 |
| 12 | FR-16: `POST /api/loans/repay` — debit account, update loan, audit event | FR-16 |

---

### 👤 Member 4: Pushpika Jayanath — DevOps, Security, Audit & QA Engineer

**Branch:** `feat/devops-audit-qa` | **Owns:** Audit service (FR-17–FR-19), DLQ, security middleware (FR-21), Docker, CI, tests, USER_GUIDE.md

| # | Task | Phase 1 Ref |
|---|------|-------------|
| 1 | FR-19: Audit event consumer — subscribe to EventBus, dedup by `event_id`, write immutable log | FR-19, §3.3 |
| 2 | FR-17: Notification consumer — subscribe to events, simulate email/SMS delivery | FR-17 |
| 3 | FR-18: `GET /api/audit/me` — personal security activity timeline | FR-18 |
| 4 | FR-22: `GET /api/admin/customers/[id]` — support operator lookup (access audited) | FR-22 |
| 5 | DLQ handler — view failed events, replay endpoint | FR-14b |
| 6 | FR-21: Rate limiter (Redis sliding window) — auth: 5/min, payments: 10/min | FR-21, NFR-S5 |
| 7 | Security middleware: Helmet headers, CORS, correlation ID generator | NFR-S1, NFR-O1 |
| 8 | Structured JSON logger + PII redactor | NFR-O1, NFR-S7 |
| 9 | FR-20: `GET /api/health` — per-service health check | FR-20 |
| 10 | Docker: multi-stage Dockerfile + `docker-compose.yml` (app + postgres + redis) | §7.1 |
| 11 | GitHub Actions CI: lint → typecheck → test on push/PR | §7.1 |
| 12 | Unit tests: auth (JWT, bcrypt, TOTP), ledger (balance math), idempotency, outbox | QA criteria |
| 13 | Integration tests: full auth flow, full transfer flow, degraded mode | QA criteria |
| 14 | **USER_GUIDE.md**: install, features, API reference, architecture, testing, troubleshooting | Deliverable #3 |

---

## 11. Development Timeline (Jul 25–31)

| Day | Date | Focus | Milestones |
|-----|------|-------|------------|
| **1** | Fri Jul 25 | **Foundation** | Project scaffold, folder structure, `.env.example` (M1) · Prisma schema + migrations + seed data (M2) · Docker compose + health endpoint (M4) · Empty API route stubs + EventBus skeleton (M3) |
| **2** | Sat Jul 26 | **Core Backend** | Auth: register, login, JWT, MFA complete (M2) · Transfer engine + idempotency + outbox write (M3) · Security middleware + audit consumer (M4) · Design system + landing + auth UI pages (M1) |
| **3** | Sun Jul 27 | **Services Complete** | Accounts service + degraded mode (M2) · Loans service + outbox worker + event bus (M3) · DLQ + notification consumer + logger (M4) · Dashboard + transfer wizard UI (M1) |
| **4** | Mon Jul 28 | **Integration** | Device trust + RBAC + step-up MFA (M2) · Saga state tracking + bill pay (M3) · Rate limiter + structured logging (M4) · History + loans + security pages UI (M1) |
| **5** | Tue Jul 29 | **Feature Complete** | All API endpoints finalized (M2+M3) · Unit tests complete (M4) · Status page + all UI pages wired to APIs (M1) · End-to-end flow testing begins |
| **6** | Wed Jul 30 | **QA & Polish** | Bug fixes across all domains (M2+M3) · Integration tests + CI green (M4) · UI polish, responsive fixes, error states (M1) · USER_GUIDE.md draft (M4) |
| **7** | Thu Jul 31 | **Submission** | Final testing (all) · README + USER_GUIDE.md finalized (M1+M4) · GitHub repo set public · Source code zip · Submit by **11:59 PM** |

---

## 12. Git Workflow

```
main (protected — merge via PR only)
├── feat/frontend          (Inusha — UI pages, components, client state)
├── feat/auth-accounts     (Kaushalya — auth + accounts + Prisma schema)
├── feat/payments-loans    (Anushka — payments + saga + loans + event bus)
└── feat/devops-audit-qa   (Pushpika — audit + docker + tests + middleware)
```

- **Day 1:** M1 creates scaffold on `main`; all branch from there
- **Integration merges:** End of Day 2, Day 4, Day 6 (merge to `main` via PR)
- **Commit format:** `feat(auth): implement JWT token rotation` / `fix(payments): prevent double-debit`
- **Rule:** No direct pushes to `main`; at least 1 review from lead

---

## 13. Verification Plan

### Automated Tests
```bash
npm run lint              # ESLint strict
npm run typecheck         # tsc --noEmit
npm run test:unit         # Vitest — auth, ledger, idempotency, outbox
npm run test:integration  # Supertest — full flows
```

### Manual Demo Walkthrough
1. `docker-compose up --build` → 3 containers healthy
2. `npx prisma db seed` → demo data loaded
3. Open `http://localhost:3000` → Landing page (Fig 2)
4. Click "Recover Access" → Register with backup identity → Setup MFA → Login → MFA challenge → Dashboard (Figs 3–5)
5. Perform transfer → verify balance updated → verify transaction in history → verify audit log (Figs 6–7)
6. Attempt duplicate `x-request-id` → idempotent response (no double-debit)
7. Attempt large transfer → step-up MFA triggered (FR-11)
8. View loans → make repayment → confirm balance change (Fig 8)
9. View security settings → see audit timeline (Fig 9)
10. Toggle payments to "degraded" → verify accounts still works, transfers return 503 (FR-08, §3.4)
11. View system status → see per-service health indicators (Fig 10)
12. Login as SUPPORT_OPERATOR → customer lookup with audit trail (FR-22)

---

## Open Questions

> [!IMPORTANT]
> **Styling Framework:** Should we use **TailwindCSS** (faster development given 7-day sprint) or **Vanilla CSS with custom properties** (more control)? Recommendation: TailwindCSS for speed.

> [!IMPORTANT]
> **Demo Credentials in USER_GUIDE.md:** Should the guide include a default demo login (`demo@vaultguard.com` / `VaultGuard@2065`) so judges can immediately test without registering? Recommendation: Yes.

> [!NOTE]
> **Phase 3 Readiness:** The delegate checklist requires bringing the Phase 2 web app + a GCP/AWS/Azure account to Phase 3 (Fortify, on-site at NSBM, Aug 6). Our domain-module architecture maps 1:1 to Cloud Run services for rapid deployment.
