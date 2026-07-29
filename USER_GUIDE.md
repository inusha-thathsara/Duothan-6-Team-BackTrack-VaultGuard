# VaultGuard — Comprehensive User & Developer Guide

VaultGuard is an enterprise-grade cloud-native banking application built with modern security, resiliency, event-driven architecture, and zero-trust principles.

---

## 1. Architecture Overview

- **Core Framework:** Next.js 15 (App Router, Server Actions, API Routes) + TypeScript
- **Database Layer:** PostgreSQL with Prisma ORM (isolated schema, domain models for Auth, Accounts, Payments, Loans, Audit)
- **Caching & Rate Limiting:** Redis / Sliding window rate limiter with memory fallback
- **Event-Driven Pipeline:** Transactional Outbox Pattern (`OutboxEvent` table) → Outbox Worker → Pub/Sub EventBus → Consumers (`AuditService`, `NotificationService`)
- **Security & Resilience:** Helmet HTTP headers, CORS, Correlation ID tracking (`x-correlation-id`), Sliding Window Rate Limiter (FR-21), PII Redaction, Step-Up MFA (FR-11), Idempotency Keys (FR-13), Degraded Read-Only Mode (FR-08).

---

## 2. Environment Setup

### Environment Variables (`.env`)
```env
DATABASE_URL="postgresql://vaultguard:vaultguard@localhost:5432/vaultguard?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="vaultguard-dev-secret-change-in-prod"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STEP_UP_MFA_THRESHOLD=5000
OUTBOX_POLL_INTERVAL_MS=5000
OUTBOX_MAX_RETRIES=3
OUTBOX_BATCH_SIZE=10
```

### Running Locally with Docker
```bash
# Spin up PostgreSQL, Redis, Gateway and Application services
docker-compose up --build -d

# Run Prisma migrations & seed demo data
npx prisma migrate dev
npx prisma db seed
```

---

## 3. Complete API Reference

### Authentication Header Format
All protected endpoints require a Bearer token:
`Authorization: Bearer <jwt_access_token>`

---

### Core Endpoint Matrix

| Method | Endpoint | Access Role | Description |
|--------|----------|-------------|-------------|
| `POST` | `/api/auth/register` | Public | Register new user account with identity verification |
| `POST` | `/api/auth/login` | Public | User authentication returning JWT + MFA requirement |
| `POST` | `/api/auth/mfa/verify` | Authenticated | Verify TOTP MFA token |
| `POST` | `/api/payments/transfer` | Customer | Idempotent balance transfer between accounts (FR-13, FR-14a) |
| `POST` | `/api/payments/bill-pay` | Customer | Process bill payment to external payees |
| `GET`  | `/api/payments/history` | Customer | Search & filter transaction history |
| `GET`  | `/api/payees` | Customer | Fetch payees list |
| `GET`  | `/api/loans` | Customer | Fetch active loans and repayment schedules (FR-15) |
| `POST` | `/api/loans/repay` | Customer | Execute loan repayment from checking/savings (FR-16) |
| `GET`  | `/api/audit/me` | Customer | Retrieve personal security activity timeline (FR-18) |
| `GET`  | `/api/admin/customers/[id]` | Support Operator | Lookup customer account details (audited, FR-22) |
| `GET`  | `/api/admin/dlq` | Support Operator | View failed Dead Letter Queue entries (FR-14b) |
| `POST` | `/api/admin/dlq/replay` | Support Operator | Replay failed DLQ entry to EventBus (FR-14b) |
| `GET`  | `/api/health` | Public | Per-service health & degraded mode status (FR-20) |

---

## 4. Detailed Feature & Security Specs

### 🔒 Idempotency & Outbox Pattern (FR-13, FR-14a)
- Header `x-request-id: <uuid>` prevents double-debiting on network retries.
- Transactions write to `transactions` and `outbox_events` within a single database transaction.
- Outbox worker asynchronously reads unprocessed events and emits them to `EventBus`.

### 🛡️ Sliding Window Rate Limiting (FR-21)
- Auth routes: 5 requests / min
- Payment routes: 10 requests / min
- General API routes: 60 requests / min
- Exceeding limit returns `HTTP 429 Too Many Requests` with `Retry-After` header.

### 📋 Audit Trail & Observability (FR-18, FR-19, FR-22)
- All domain events are consumed by `AuditService`, deduplicated by `eventId`, and saved as immutable records in `AuditEvent`.
- `GET /api/admin/customers/[id]` records `admin.customer_lookup` event automatically.
- All logs scrub PII fields (`password`, `secret`, `token`, `cardNumber`, `nationalId`) using structured JSON logger.

### 🚑 Degraded Read-Only Mode (FR-08)
- If payment gateway or ledger suffers degradation, system toggles `DEGRADED_MODE`.
- Read operations (`GET /api/loans`, `GET /api/payments/history`, `GET /api/audit/me`) continue operating normally.
- Write operations (`POST /api/payments/transfer`, `POST /api/loans/repay`) return `HTTP 503 Service Unavailable`.

---

## 5. Verification & Testing

### Automated Test Commands
```bash
# Run ESLint validation
npm run lint

# Run TypeScript type check
npm run typecheck

# Run unit & integration test suites
npx vitest run
```

### Manual QA Walkthrough
1. **Health Check:** `curl http://localhost:3000/api/health` → Verify 200 OK & JSON health report.
2. **Transfer Funds:** `POST /api/payments/transfer` with `x-request-id` header → Verify balance debit and outbox event creation.
3. **Idempotency:** Re-send `POST /api/payments/transfer` with identical `x-request-id` → Verify 200 cached response without second debit.
4. **Audit Trail:** Call `GET /api/audit/me` → Verify transfer event appears in audit timeline.
5. **Support Lookup:** Call `GET /api/admin/customers/<id>` with Support Operator token → Verify customer returned and `admin.customer_lookup` audit log written.
6. **Rate Limiter:** Send 6 requests within 1 minute to `/api/auth/login` → Verify 6th request receives HTTP 429.

---

## 6. Troubleshooting & Support

- **Database Connection Error:** Verify PostgreSQL container is healthy (`docker ps` / `pg_isready`).
- **Prisma Schema Mismatch:** Run `npx prisma generate` followed by `npx prisma db push`.
- **Vitest Alias Errors:** Ensure `tsconfig.json` contains `"@/*": ["./src/*"]` and `vitest.config.ts` includes path resolution.
