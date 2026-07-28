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
- **Testing**: Jest, Supertest

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

**Seeded Auth Accounts**:
- **Customer**: `demo@vaultguard.com` / `VaultGuard@2065` (NIC: `200012345678`)
- **Support Operator**: `operator@vaultguard.com` / `Operator@2065`

### Seed Accounts Service Database (`accounts_db`)

```bash
cd services/accounts-service
npm install
npx prisma db push
npm run prisma:seed
```

**Seeded Accounts**:
- `VG-SAV-001234` (Savings): LKR 250,000.00
- `VG-CHK-001235` (Checking): LKR 75,000.50
- `VG-FD-001236` (Fixed Deposit): LKR 500,000.00

---

## 📡 API Reference

All requests pass through the local API Gateway at `http://localhost`:

| Service | Method | Route | Auth | Description |
|:---|:---|:---|:---|:---|
| **Auth** | `POST` | `/api/auth/register` | Public | Register customer via backup identity verification |
| **Auth** | `POST` | `/api/auth/login` | Public | Password login (device check & MFA challenge) |
| **Auth** | `POST` | `/api/auth/mfa/setup` | `Bearer JWT` | Generate TOTP secret, QR URI & 5 backup codes |
| **Auth** | `POST` | `/api/auth/mfa/verify` | `mfaToken` | Verify 6-digit TOTP / backup code & issue JWT |
| **Auth** | `POST` | `/api/auth/refresh` | `httpOnly Cookie` | Rotate refresh token & issue new access token |
| **Auth** | `POST` | `/api/auth/logout` | `httpOnly Cookie` | Revoke session & clear cookies |
| **Auth** | `GET` | `/api/auth/devices` | `Bearer JWT` | List user's trusted devices |
| **Auth** | `POST` | `/api/auth/devices` | `Bearer JWT` | Trust current device |
| **Auth** | `DELETE` | `/api/auth/devices/:id` | `Bearer JWT` | Revoke trusted device |
| **Auth** | `GET` | `/api/auth/operator/users` | `SUPPORT_OPERATOR` | Support Operator user profile search |
| **Accounts** | `GET` | `/api/accounts` | `Bearer JWT` | List user accounts + degraded mode status |
| **Accounts** | `GET` | `/api/accounts/:id` | `Bearer JWT` | Account detail (404 for unowned) |
| **Accounts** | `GET` | `/api/accounts/:id/statements` | `Bearer JWT` | Paginated date-filtered statements (`?from=&to=&page=&limit=`) |

### Inter-Service Internal APIs

| Service | Method | Route | Auth | Description |
|:---|:---|:---|:---|:---|
| **Accounts** | `POST` | `/internal/accounts/create-default` | `x-internal-secret` | Called by Auth Service during registration |
| **Accounts** | `GET` | `/internal/accounts/:id/balance` | `x-internal-secret` | Called by Payments Service for balance checks |

---

## 🧪 Testing

Run test suites inside microservice directories:

```bash
# Auth Service Tests (Unit & E2E)
cd services/auth-service
npm run test

# Accounts Service Tests
cd services/accounts-service
npm run test
```

---

## 🔐 Security Controls

1. **Password Protection**: Bcrypt hashing with cost factor 12.
2. **Stateless JWTs & Refresh Rotation**: Short-lived access tokens (15m) + single-use DB-tracked refresh tokens.
3. **Cookie Hardening**: `httpOnly`, `SameSite=Strict`, `Secure` in production.
4. **Device Fingerprinting**: Subnet-level SHA-256 fingerprinting. Unrecognized devices trigger MFA.
5. **Step-Up Authorization**: High-risk operations require recent MFA verification (< 5m).
6. **Role-Based Access Control (RBAC)**: Fine-grained `@Roles()` guards for `CUSTOMER` vs `SUPPORT_OPERATOR`.

---

## 📂 Repository Structure

```
Duothan-6-Team-BackTrack-VaultGuard/
├── services/
│   ├── auth-service/                 # NestJS Auth Microservice (Port 4001)
│   │   ├── src/auth/                 # Controllers, Services, Guards, DTOs
│   │   ├── src/events/               # EventBus & Audit Consumer
│   │   ├── prisma/                   # auth_db Schema & Seed
│   │   └── test/                     # Unit & E2E Test Suites
│   └── accounts-service/             # NestJS Accounts Microservice (Port 4002)
│       ├── src/accounts/             # Controllers, Services, Internal APIs
│       ├── src/health/               # Degraded Mode Health Service
│       ├── prisma/                   # accounts_db Schema & Seed
│       └── test/                     # Unit Test Suites
├── gateway/
│   └── nginx.conf                    # Nginx API Gateway Configuration
├── Planning/
│   └── VaultGuard_Auth_Account_Backend_DevPlan.md # System Architecture & Dev Plan
├── docker-compose.yml                # Multi-container orchestration
└── README.md
```

---

*VaultGuard — Duothan 6.0 | Team BackTrack*
