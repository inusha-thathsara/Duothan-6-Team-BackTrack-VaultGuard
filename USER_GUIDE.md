# VaultGuard — User & Developer Guide

## 1. Environment Setup

### Environment Variables (.env)
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

---

## 2. API Usage & Testing Walkthrough

### Authentication Header Format
All protected endpoints expect a Bearer token header:
`Authorization: Bearer <token>`

For dev testing, a base64 encoded JSON string representing user context is supported:
`Authorization: Bearer eyJ1c2VySWQiOiJ1c3JfY3VzdG9tZXJfMDEiLCJyb2xlIjoiQ1VTVE9NRVIifQ==`

---

### Endpoints Specification

#### 1. Transfer Funds (`POST /api/payments/transfer`)
- **Headers:**
  - `x-request-id: <uuid>` *(Required for Idempotency FR-13)*
  - `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "fromAccountId": "acc_savings_01",
    "toAccountId": "acc_checking_01",
    "amount": 250.00,
    "currency": "USD",
    "description": "Monthly transfer"
  }
  ```
- **Behavior:**
  - Atomic debit from `fromAccountId` and credit to `toAccountId`.
  - Atomically writes an event to `outbox_events`.
  - Responding with duplicate `x-request-id` returns cached response without duplicate debit.
  - Transfer > `$5000` triggers `403` requiring Step-Up MFA (`FR-11`).

#### 2. Pay Bill (`POST /api/payments/bill-pay`)
- **Headers:**
  - `x-request-id: <uuid>`
  - `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "fromAccountId": "acc_savings_01",
    "billerId": "biller_utility_01",
    "amount": 85.50,
    "description": "Electric bill"
  }
  ```

#### 3. View Transaction History (`GET /api/payments/history`)
- **Query Parameters:** `page`, `limit`, `type`, `status`, `from`, `to`, `search`, `accountId`
- **Example:** `/api/payments/history?page=1&limit=10&type=TRANSFER`

#### 4. List Loans & Schedules (`GET /api/loans`)
- **Returns:** List of active loans, outstanding balance, next due date, and detailed repayment schedule.

#### 5. Process Loan Repayment (`POST /api/loans/repay`)
- **Headers:** `x-request-id: <uuid>`
- **Body:**
  ```json
  {
    "loanId": "loan_home_01",
    "amount": 750.00,
    "fromAccountId": "acc_savings_01"
  }
  ```
- **Behavior:** Debits source account, reduces loan outstanding balance, marks repayment schedule item as `PAID`, and emits an outbox event.
