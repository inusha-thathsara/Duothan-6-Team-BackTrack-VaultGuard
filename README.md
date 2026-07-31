# VaultGuard — Secure Digital Banking Platform

[![Architecture](https://img.shields.io/badge/Architecture-Zero__Trust_Microservices-009688.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Google_Cloud_Platform-4285F4.svg)]()
[![Framework](https://img.shields.io/badge/Framework-Next.js_16-000000.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16_|_Prisma_5-336791.svg)]()
[![Testing](https://img.shields.io/badge/Testing-Vitest_2.1-6E9F18.svg)]()

> **Post-Cyberattack Secure Banking Platform**  
> *Rebuild the future. Defend the digital world.*

> [!NOTE]
> **Phase 2 Localized Simulation Notice:** This Phase 2 submission is a localized simulation of the enterprise production architecture. It allows rapid local prototyping, zero-cost evaluation, and offline testing while preserving identical 1:1 service boundaries, database contracts, and event schemas for Phase 3 GCP cloud deployment.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture Mapping (Local Simulation → Enterprise Production)](#architecture-mapping-local-simulation--enterprise-production)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start & Local Development](#quick-start--local-development)
- [Database Setup & Seeding](#database-setup--seeding)
- [Complete API Reference](#complete-api-reference)
- [Testing & Quality Verification](#testing--quality-verification)
- [Security & Resilience Controls](#security--resilience-controls)

---

## 🛡️ Overview

**VaultGuard** is a cloud-native digital banking platform designed for attack isolation, zero-trust security, disaster recovery, and financial inclusion. Engineered following a major cyberattack, VaultGuard restores daily banking operations (balances, transfers, bill payments, loans, and audit trails) on top of surviving customer backup records.

### Key Architectural Highlights

- **Domain Isolation**: Domain-separated microservices and schemas (`auth`, `accounts`, `payments`, `loans`, `audit`, `notifications`).
- **Data Plane Security**: Dedicated database partitioning via Prisma ORM. Zero cross-domain SQL joins.
- **Zero-Trust Identity**: Password security with Bcrypt (cost 12), RFC 6238 TOTP MFA, device fingerprinting, and JWT refresh token rotation.
- **Event-Driven Resilience**: Transactional Outbox Pattern (`OutboxEvent` table) + Pub/Sub EventBus (`AuditService` & `NotificationService` consumers).
- **Security & Rate Limiting**: Helmet HTTP headers, CORS, request correlation IDs (`x-correlation-id`), sliding window rate limiting, and automated PII scrubbing.

---

## 🏛️ Architecture Mapping (Local Simulation → Enterprise Production)

This Phase 2 deliverable is a localized simulation engineered to prove the enterprise design locally:

| Enterprise Production Component | Local Phase 2 Simulation Implementation | Architecture Rationale |
|---------------------------------|-----------------------------------------|------------------------|
| **GCP Cloud Run Microservices** | Next.js 16 App Router API Routes & isolated domain modules (`auth`, `accounts`, `payments`, `loans`, `audit`, `notifications`) | Ensures modular domain isolation so each service can be deployed independently to Cloud Run in Phase 3. |
| **GCP Cloud SQL (PostgreSQL)** | For Phase 2 rapid prototyping and local evaluation, Cloud SQL is simulated via isolated local PostgreSQL Docker containers and Prisma ORM schemas. | Guarantees identical relational schemas, foreign keys, and indexes for zero-schema-churn cloud migration. |
| **GCP Cloud KMS & HSM Signing** | Cloud KMS HSM signing is simulated via local cryptographic JWT signing, HMAC token verification, and key derivation in the Auth service. | Proves hardware-level security workflows locally without requiring live GCP credentials. |
| **GCP Cloud Pub/Sub Event Bus** | Pub/Sub event bus is simulated via local Transactional Outbox Pattern (`OutboxEvent` table) + local in-process `EventBus` Pub/Sub stream (`event-bus.ts` and `outbox-worker.ts`). | Ensures atomic ledger commits with guaranteed async message delivery and retry semantics. |
| **GCP Cloud Armor WAF & Gateway** | Simulated via custom security middleware (`security.ts`), Helmet HTTP headers, CORS controls, and sliding-window rate limiting (`rate-limiter.ts`). | Protects API endpoints against DDoS, credential stuffing, and injection attacks locally. |
| **GCP BigQuery Audit Sink** | Simulated via append-only `AuditEvent` database records + structured JSON logger with automated PII scrubbing (`logger.ts`, `audit.service.ts`). | Guarantees immutable, attributable security event records for compliance auditing. |

---

## 📐 System Architecture

```
                            ┌──────────────────┐
                            │   Cloud Armor    │
                            │   (WAF / DDoS)   │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  Cloud Load      │
                            │  Balancer + CDN  │
                            └────────┬─────────┘
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                 │
          ┌────────▼──────┐ ┌───────▼────────┐ ┌───────▼────────┐
          │  Next.js 16    │ │  API Gateway    │ │  Static Assets │
          │  Frontend      │ │  (Nginx / GCP)  │ │  (Cloud CDN)   │
          └────────────────┘ └───────┬────────┘ └────────────────┘
                                     │
            ┌────────────┬───────────┼───────────┬────────────┐
            │            │           │           │            │
   ┌────────▼──┐ ┌──────▼────┐ ┌───▼──────┐ ┌──▼───────┐ ┌──▼──────────┐
   │  Auth     │ │ Accounts  │ │ Payments │ │ Loans    │ │ Notification│
   │  Service  │ │ Service   │ │ Service  │ │ Service  │ │ Service     │
   └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘
         │              │            │             │              │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌───▼───────┐ ┌───▼──────┐       │
   │ auth_db   │ │accounts_db│ │payments_db│ │ loans_db │       │
   │(Cloud SQL)│ │(Cloud SQL)│ │(Cloud SQL)│ │(Cloud SQL)│      │
   └───────────┘ └───────────┘ └───────────┘ └──────────┘       │
                                                                 │
   ┌────────────────────────────────────────────────────────────┘
   │
   │  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
   └─►│   Pub/Sub    │─────►│ Audit Service│────►│  BigQuery    │
      │  (Events)    │      │  (Consumer)  │     │ (Immutable)  │
      └──────────────┘      └──────────────┘     └──────────────┘
```

---

## 🧰 Tech Stack

- **Frontend & Fullstack Framework**: Next.js 16 (React 19, TypeScript 5, TailwindCSS 4)
- **Database & ORM**: PostgreSQL 16 with Prisma ORM 5.22
- **Authentication**: JWT (15-min access, 7-day httpOnly refresh token rotation), Bcryptjs, RFC 6238 TOTP
- **Security & Headers**: Helmet, CORS, Correlation IDs, Sliding Window Rate Limiter
- **Testing Suite**: Vitest 2.1, ESLint 9, TypeScript Strict Mode
- **DevOps & Containers**: Docker, Docker Compose, GitHub Actions CI

---

## 🚀 Quick Start & Local Development

### Prerequisites

- **Node.js**: `v20.x LTS` or higher
- **npm**: `v10+`
- **Docker & Docker Compose**: (Optional, for running local PostgreSQL & Redis containers)

### 1. Clone & Environment Setup

```bash
git clone https://github.com/inusha-thathsara/Duothan-6-Team-BackTrack-VaultGuard.git
cd Duothan-6-Team-BackTrack-VaultGuard
cp .env.example .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Migration & Seeding

```bash
# Apply Prisma database schema
npx prisma db push

# Seed demo users, accounts, payees, and active loans
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 Complete API Reference

All protected endpoints accept session cookie / `Authorization: Bearer <jwt_token>` and enforce rate limits.

### 🔐 Auth & Identity
- `POST /api/auth/register` — Customer registration matching backup identity records
- `POST /api/auth/login` — User authentication returning JWT & MFA requirement
- `POST /api/auth/mfa/setup` — Initialize TOTP MFA secret & QR code generation
- `POST /api/auth/mfa/verify` — Verify 6-digit TOTP MFA challenge
- `POST /api/auth/forgot-password` — Request password reset verification token
- `POST /api/auth/reset-password` — Complete password reset with verification token
- `GET /api/auth/me` — Authenticated session check & profile summary
- `POST /api/auth/logout` — Revoke refresh token and clear session cookies

### 👤 User Profile & Accounts
- `GET /api/user/profile` — Fetch customer profile, preferences, and associated bank accounts
- `PATCH /api/user/profile` — Update customer profile details and security settings

### 💸 Payments & Transfers
- `POST /api/payments/transfer` — Idempotent funds transfer (Requires `x-request-id` header & Step-Up MFA for >$5,000)
- `POST /api/payments/bill-pay` — Idempotent utility & biller payment
- `GET /api/payments/history` — Paginated and searchable transaction history
- `GET /api/payees` & `POST /api/payees` — Retrieve and manage saved payees

### 📊 Loans & Repayments
- `GET /api/loans` — View active loans and repayment schedules
- `POST /api/loans/repay` — Execute loan repayment from checking or savings

### 🛡️ Audit, Health & Admin
- `GET /api/audit/me` — Personal security activity timeline
- `GET /api/admin/customers/:id` — Support Operator customer lookup (Audited with `admin.customer_lookup` & restricted to `SUPPORT_OPERATOR` role)
- `GET /api/admin/dlq` — List failed Dead Letter Queue events
- `POST /api/admin/dlq/replay` — Replay failed DLQ entry to EventBus
- `GET /api/health` — Multi-service health monitoring & degraded mode check

---

## 🧪 Testing & Quality Verification

Run the automated test and validation commands (28 unit tests passing across 4 test suites):

```bash
# 1. Run ESLint code quality check
npm run lint

# 2. Run TypeScript strict type check (0 errors)
npm run typecheck

# 3. Run full Vitest unit & integration test suites
npm run test
```

---

## 🔐 Security & Resilience Controls

1. **Password Security**: Bcrypt hashing with cost factor 12.
2. **Stateless JWTs & Refresh Rotation**: Short-lived access tokens (15m) + single-use refresh token rotation with `jose` JWT verification at Next.js Edge Middleware (`middleware.ts`).
3. **Role-Based Access Control (RBAC)**: Strict role enforcement (`SUPPORT_OPERATOR` required for `/operator` route and customer PII lookups).
4. **Idempotency Protection**: `x-request-id` UUID header prevents double-debiting on network retries.
5. **Step-Up Authorization**: High-risk operations (>$5,000) require Step-Up MFA verification.
6. **Sliding Window Rate Limiter**: 5 req/min (auth), 10 req/min (payments), 60 req/min (general).
7. **PII Scrubbing & Audit Trails**: Automatic redaction of sensitive fields in JSON logs and immutable `AuditEvent` database logs.
8. **Degraded Mode Protection**: Read-only fallback when payment gateway or ledger services degrade.

---

*VaultGuard — Secure Digital Banking Platform*
