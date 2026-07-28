# VaultGuard — Phase 02 Banking Platform

VaultGuard is a domain-isolated, high-resilience digital banking system designed for **Duothan 6.0 (Phase 2 · REBUILD)** by **Team BackTrack**.

---

## 🏛️ Architecture & System Design

The architecture mirrors Phase 1's microservices design using NestJS-style domain service modules inside Next.js 15:

- **Auth Service (`FR-01` to `FR-05`):** JWT identity verification, TOTP MFA, trusted devices, step-up MFA, RBAC.
- **Accounts Service (`FR-06` to `FR-08`):** Multi-currency accounts, balances, statements, degraded mode resilience.
- **Payments Service (`FR-09` to `FR-14b`):** Transfer Saga engine, idempotency (`x-request-id`), risk checks, bill pay, transactional outbox pattern.
- **Loans Service (`FR-15`, `FR-16`):** Loan balances, repayment schedules, atomic repayments.
- **Audit Service (`FR-17` to `FR-19`):** Immutable security logs, activity feeds, Dead Letter Queue (DLQ).
- **Notification Service (`FR-17`):** Event-driven alert processing.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 20
- Docker & Docker Compose (or local PostgreSQL)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/inusha-thathsara/Duothan-6-Team-BackTrack-VaultGuard.git
   cd Duothan-6-Team-BackTrack-VaultGuard
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Databases (Docker):**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database & Seed Data:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

### Automated Unit Tests
Run the Vitest test suite:
```bash
npm test
```

### Type Checking & Code Quality
```bash
npm run lint
npx tsc --noEmit
```

---

## 📋 API Reference Summary

### Payments & Transfers (`Member 3`)
- `POST /api/payments/transfer` — Idempotent fund transfer (requires `x-request-id` header & Bearer token)
- `POST /api/payments/bill-pay` — Idempotent bill payment
- `GET /api/payments/history` — Paginated transaction history with type/status/date filters
- `GET /api/payees` & `POST /api/payees` — Manage saved payees and billers

### Loans (`Member 3`)
- `GET /api/loans` — View active loans with full repayment schedules
- `POST /api/loans/repay` — Atomic loan repayment from eligible account
