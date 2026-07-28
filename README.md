# VaultGuard — Secure Digital Banking Platform

[![Duothan 6.0](https://img.shields.io/badge/Duothan_6.0-Team_BackTrack-0052CC.svg)](https://github.com/inusha-thathsara/Duothan-6-Team-BackTrack-VaultGuard)
[![Architecture](https://img.shields.io/badge/Architecture-Independent_Microservices-009688.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Google_Cloud_Platform-4285F4.svg)]()
[![Backend](https://img.shields.io/badge/Backend-NestJS_10-E0234E.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_15-000000.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16-336791.svg)]()

> **Post-Cyberattack Secure Banking Rebuild**  
> *Rebuild the future. Defend the digital world.*

---

## 📋 Table of Contents

- [Overview](#overview)
- [Team BackTrack](#team-backtrack)
- [System Architecture](#system-architecture)
- [Microservices Overview](#microservices-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start & Local Development](#quick-start--local-development)
- [API Reference](#api-reference)
- [Database & Seeding](#database--seeding)
- [Testing](#testing)
- [Security Controls](#security-controls)
- [Repository Structure](#repository-structure)

---

## 🛡️ Overview

**VaultGuard** is a cloud-native digital banking platform designed for attack isolation, zero-trust security, disaster recovery, and financial inclusion. Following a global banking infrastructure cyberattack, VaultGuard restores daily banking operations (balances, transfers, payments, loans) on top of surviving customer backup records.

### Key Architectural Highlights

- **Independent Microservices**: NestJS microservices on GCP Cloud Run; each service owns its codebase, database, and scaling posture.
- **Data Plane Isolation**: Dedicated PostgreSQL databases (`auth_db`, `accounts_db`, etc.). Zero cross-domain joins.
- **Zero-Trust Identity**: Mandatory password + RFC 6238 TOTP MFA, device fingerprinting, and RBAC guards.
- **Edge Security & Routing**: Nginx API Gateway directing traffic to domain microservices.
- **Event-Driven Resilience**: Decoupled async domain event bus for Audit and Notification consumers.

---

## 👥 Team BackTrack

| Name | Role | Microservice Ownership |
|:---|:---|:---|
| **Inusha Gunasekara** | Team Leader & System Architect | System Architecture & Blueprint |
| **Kaushalya Wijesiri** | Backend Lead Engineer | **Auth Service** & **Accounts Service** |
| **Anushka Thisera** | Backend Engineer | Payments Service & Loans Service |
| **Pushpika Jayanath** | DevOps & Backend Engineer | Audit Service, Notification Service, CI/CD |

---

## 📐 System Architecture

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
                   │                 │                 │
          ┌────────▼──────┐ ┌───────▼────────┐ ┌───────▼────────┐
          │  Next.js       │ │  API Gateway    │ │  Static Assets │
          │  Frontend      │ │  (Nginx / GCP)  │ │  (Cloud CDN)   │
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
      │  (Events)     │      │  (NestJS)    │     │ (Immutable)  │
      └──────────────┘      └──────────────┘     └──────────────┘
```

---

## 🧰 Tech Stack

- **Frontend**: Next.js 15 (React 19, TypeScript, TailwindCSS)
- **Backend Framework**: NestJS 10 (TypeScript)
- **API Gateway**: Nginx
- **Databases**: PostgreSQL 16 (per-service databases via Prisma ORM 6)
- **Authentication**: JWT (HS256 access tokens, DB-tracked refresh token rotation), Bcrypt (cost 12), otplib (RFC 6238 TOTP), qrcode
- **Containerization & Orchestration**: Docker, Docker Compose
- **Testing**: Jest, Supertest, Vitest

---

## 🚀 Quick Start & Local Development

### Prerequisites

- **Node.js**: `v20.x LTS`
- **Docker & Docker Compose**: `v24+` / `Docker Desktop`
- **npm**: `v10+`

### 1. Clone & Environment Setup

```bash
git clone https://github.com/inusha-thathsara/Duothan-6-Team-BackTrack-VaultGuard.git
cd Duothan-6-Team-BackTrack-VaultGuard
```

Copy environment files for each service:

```bash
cp services/auth-service/.env.example services/auth-service/.env
cp services/accounts-service/.env.example services/accounts-service/.env
```

### 2. Launch Infrastructure with Docker Compose

Spin up PostgreSQL databases (`auth_db`, `accounts_db`), Redis, Nginx API Gateway, and backend microservices:

```bash
docker compose up -d --build
```

---

## 🗄️ Database Setup & Seeding

### Seed Auth Service Database (`auth_db`)

```bash
cd services/auth-service
npm install
npx prisma db push
npm run prisma:seed
```

### Seed Accounts Service Database (`accounts_db`)

```bash
cd services/accounts-service
npm install
npx prisma db push
npm run prisma:seed
```

---

## 📡 API Reference

All requests pass through the local API Gateway at `http://localhost`:

### Auth & Identity
- `POST /api/auth/register` — Customer registration matching backup records
- `POST /api/auth/login` — Password login (MFA challenge & token issuance)
- `POST /api/auth/mfa/setup` — Generate TOTP secret, QR code, and backup codes
- `POST /api/auth/mfa/verify` — Verify 6-digit TOTP code
- `POST /api/auth/refresh` — Rotate refresh token
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/devices` & `DELETE /api/auth/devices/:id` — Manage trusted devices
- `GET /api/auth/operator/users` — Support Operator user profile search

### Accounts & Balances
- `GET /api/accounts` — List user bank accounts & balances
- `GET /api/accounts/:id` — Account detail
- `GET /api/accounts/:id/statements` — Filtered transaction statements (`?from=&to=&page=&limit=`)

### Payments & Transfers (`Member 3`)
- `POST /api/payments/transfer` — Idempotent fund transfer (`x-request-id` header required)
- `POST /api/payments/bill-pay` — Idempotent bill payment
- `GET /api/payments/history` — Transaction history
- `GET /api/payees` & `POST /api/payees` — Manage saved payees

### Loans (`Member 3`)
- `GET /api/loans` — View active loans & repayment schedules
- `POST /api/loans/repay` — Loan repayment

---

## 🧪 Testing

```bash
# Auth Service Tests
cd services/auth-service
npx jest

# Accounts Service Tests
cd services/accounts-service
npx jest
```

---

## 🔐 Security Controls

1. **Password Protection**: Bcrypt hashing with cost factor 12.
2. **Stateless JWTs & Refresh Rotation**: Short-lived access tokens (15m) + single-use DB-tracked refresh tokens.
3. **Cookie Hardening**: `httpOnly`, `SameSite=Strict`, `Secure` in production.
4. **Device Fingerprinting**: Subnet-level SHA-256 fingerprinting.
5. **Step-Up Authorization**: High-risk operations require recent MFA verification (< 5m).
6. **Role-Based Access Control (RBAC)**: Fine-grained `@Roles()` guards for `CUSTOMER` vs `SUPPORT_OPERATOR`.

---

*VaultGuard — Duothan 6.0 | Team BackTrack*
