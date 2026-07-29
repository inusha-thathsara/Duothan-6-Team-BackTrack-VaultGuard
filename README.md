# VaultGuard — Secure Digital Banking Platform

[![Architecture](https://img.shields.io/badge/Architecture-Zero__Trust_Microservices-009688.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Google_Cloud_Platform-4285F4.svg)]()
[![Framework](https://img.shields.io/badge/Framework-Next.js_16-000000.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16_|_Prisma_5-336791.svg)]()
[![Testing](https://img.shields.io/badge/Testing-Vitest_2.1-6E9F18.svg)]()

> **Post-Cyberattack Secure Banking Platform**  
> *Rebuild the future. Defend the digital world.*

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start & Local Development](#quick-start--local-development)
- [Database Setup & Seeding](#database-setup--seeding)
- [Complete API Reference](#complete-api-reference)
- [Testing & Quality Verification](#testing--quality-verification)
- [Security & Resilience Controls](#security--resilience-controls)
- [Repository Structure](#repository-structure)

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
cd Duothan-6-Team-BackTrack-VaultGuard/vaultguard
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
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 Complete API Reference

All protected endpoints accept `Authorization: Bearer <jwt_token>` and enforce rate limits.

### 🔐 Auth & Identity
- `POST /api/auth/register` — Customer registration matching backup identity records
- `POST /api/auth/login` — User authentication returning JWT & MFA requirement
- `POST /api/auth/mfa/verify` — Verify 6-digit TOTP MFA challenge
- `POST /api/auth/refresh` — Rotate refresh token for access token renewal
- `POST /api/auth/logout` — Revoke refresh token and end session

### 🏦 Accounts & Statements
- `GET /api/accounts` — List customer bank accounts and real-time balances
- `GET /api/accounts/:id/statements` — Filtered transaction statements (`?from=&to=&page=&limit=`)

### 💸 Payments & Transfers
- `POST /api/payments/transfer` — Idempotent funds transfer (Requires `x-request-id` header)
- `POST /api/payments/bill-pay` — Idempotent utility & biller payment
- `GET /api/payments/history` — Paginated and searchable transaction history
- `GET /api/payees` & `POST /api/payees` — Manage saved payees

### 📊 Loans & Repayments
- `GET /api/loans` — View active loans and repayment schedules
- `POST /api/loans/repay` — Execute loan repayment from checking or savings

### 🛡️ Audit, Health & Admin
- `GET /api/audit/me` — Personal security activity timeline
- `GET /api/admin/customers/:id` — Support Operator customer lookup (Audited with `admin.customer_lookup`)
- `GET /api/admin/dlq` — List failed Dead Letter Queue events
- `POST /api/admin/dlq/replay` — Replay failed DLQ entry to EventBus
- `GET /api/health` — Multi-service health monitoring & degraded mode check

---

## 🧪 Testing & Quality Verification

Run the automated test and validation commands:

```bash
# 1. Run ESLint code quality check
npm run lint

# 2. Run TypeScript strict type check
npm run typecheck

# 3. Run full Vitest unit & integration test suites
npm run test
```

---

## 🔐 Security & Resilience Controls

1. **Password Security**: Bcrypt hashing with cost factor 12.
2. **Stateless JWTs & Refresh Rotation**: Short-lived access tokens (15m) + single-use refresh token rotation.
3. **Idempotency Protection**: `x-request-id` UUID header prevents double-debiting on network retries.
4. **Step-Up Authorization**: High-risk operations (>$5000) require Step-Up MFA verification.
5. **Sliding Window Rate Limiter**: 5 req/min (auth), 10 req/min (payments), 60 req/min (general).
6. **PII Scrubbing & Audit Trails**: Automatic redaction of sensitive fields in JSON logs and immutable `AuditEvent` database logs.
7. **Degraded Mode Protection**: Read-only fallback when payment gateway or ledger services degrade.

---

*VaultGuard — Secure Digital Banking Platform*
