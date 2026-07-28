# DUOTHAN 6.0
## PHASE 01. RECON
# VaultGuard
### Project Blueprint: Secure Digital Banking Rebuild

**Team BackTrack**
1. Inusha Gunasekara (Leader)
2. Kaushalya Wijesiri
3. Anushka Thisera
4. Pushpika Jayanath

**National Inter-University DevOps Combat**  
**IEEE Student Branch of NSBM**  
**Cloud platform:** Google Cloud Platform (GCP)  
**Architecture:** Independent microservices | Zero-trust | Disaster recovery  

---

## 01. Problem Identification

### 1.1 Scenario context
In 2065, the Super Malware Agent triggered a global cyber disaster that disabled governments, healthcare, transport, and finance. In banking, the damage was total: core banking systems, ATMs, digital payment platforms, and loan systems stopped operating. Millions lost access to essential financial services. Small businesses could no longer accept digital payments. Households were forced back to cash, slowing economic recovery and widening inequality.

Customer databases survived because of secure backups - identity and account records were not erased. What failed was the live operating fabric: the services, keys, and network controls that make those records usable. The Master Key required to reopen the banking network remains locked behind hostile security layers. Finance needs a dedicated rebuild.

### 1.2 The core problem VaultGuard solves
Restoring the old monolith is not enough. A single compromised surface took down the entire financial stack. The world lacks a resilient, attack-isolated, inclusive digital banking platform that can:
- Restore daily banking operations (balances, transfers, payments, loans) on top of surviving customer data.
- Protect customer data and transaction integrity with modern zero-trust controls.
- Survive partial compromise so malware or failure in one domain cannot freeze the whole network again.
- Include people and small businesses who were pushed offline into cash-only survival.

**Problem statement:** After a catastrophic malware event, trusted digital finance cannot return until there is a ground-up banking platform with independent services, cryptographic key control, disaster recovery, and accessible UX - built so a future attack cannot cause total systemic failure.

### 1.3 Affected users

| Segment | Impact |
| :--- | :--- |
| **Individual customers** | No ATM/card/app access; salaries and remittances stuck; loss of trust in digital channels |
| **Small & medium businesses** | Cannot take card or wallet payments; cash dependency; stalled cash flow |
| **Underserved / remote users** | Higher travel and cash-handling risk; financial exclusion grows |
| **Bank operations & regulators** | No reliable live audit trail; recovery blocked without secure key and service redesign |

### 1.4 Why restoration matters for economic recovery
Digital banking is the circulatory system of a modern economy. Without it, payroll, trade, credit, and savings stall. Secure restoration reduces inequality (cash-only regimes punish those farthest from branches), restores SME liquidity, and rebuilds public trust. VaultGuard's mission is to redesign finance for isolation, recoverability, and inclusion - then prove that design in later Duothan phases through build and deploy.

---

## 02. Proposed Solution

### 2.1 Solution concept
VaultGuard is a cloud-native digital banking platform that rebuilds financial services as a set of independent microservices on Google Cloud Platform. It reconnects surviving customer backups to a new secure operating layer: identity, accounts, payments, loans, notifications, and immutable audit each deployable, scalable, and failable on its own.

VaultGuard replaces the single point of failure with:
- **Zero-trust identity** - every session and service call is authenticated and authorized.
- **HSM-backed key management (Cloud KMS)** - the narrative "Master Key" maps to hardware-protected keys; no application holds long-lived plaintext secrets.
- **Per-domain data stores** - accounts, payments, and loans do not share one database that can take everything down.
- **Event-driven coordination** - Pub/Sub decouples payment confirmation from notifications and audit fan-out.
- **Disaster recovery by design** - backups, multi-region posture, and degraded (read-only) modes when a service is under attack or offline.

### 2.2 How VaultGuard works for users
- **Recover access** - verify identity against restored backup records, enroll MFA/passkeys, bind a trusted device.
- **View money safely** - Accounts service presents balances from an isolated Cloud SQL store.
- **Move money** - Transfers and bill payments via Payments with risk checks, idempotent IDs, and encryption.
- **Manage credit** - Loans service exposes facilities, schedules, and repayments through well-defined APIs/events.
- **Stay informed** - Notifications for confirmations; personal security activity from Audit.
- **Trust the channel** - Cloud Armor, TLS everywhere, and step-up MFA for high-risk actions.

### 2.3 How independent services prevent total failure

| If this fails... | What still works |
| :--- | :--- |
| **Payments** | Balances and loan views remain available (read paths) |
| **Loans** | Transfers and account views continue |
| **Notifications** | Core money movement still commits; alerts queue and catch up |
| **A single region** | Traffic shifts; DR runbooks restore from backups within defined RTO |

Circuit breakers and API Gateway timeouts stop cascading outages. Compromising one service's runtime does not automatically yield keys for another domain - Secret Manager and KMS enforce least privilege per service identity.

### 2.4 Restoring from surviving customer databases
1. Import/verify backup identity and account snapshots into domain databases under encryption.
2. Re-issue session and signing keys via Cloud KMS (new Master Key ceremony under dual control).
3. Force password/MFA reset and device re-trust before write operations are enabled.
4. Open services in stages: Auth → Accounts (read) → Payments (limited limits) → full operations.

### 2.5 Value delivered
- **Customers:** Fast return to digital balances, transfers, and bill pay with visible security controls.
- **SMEs:** Reliable payment acceptance path once merchant/payee flows are enabled.
- **Society:** Inclusive UX (clear language, mobile-first, accessibility) so recovery is not only for the digitally fluent.
- **Operators:** Observable, auditable, cloud-deployable architecture ready for Phase 02 (Rebuild) and Phase 03 (Fortify).

---

## 03. System Architecture

### 3.1 Architecture principles
- **Independence** - Auth, Accounts, Payments, Loans, Notification, and Audit are separate deployable services.
- **Zero trust** - No implicit trust between services; IAM service accounts; scoped tokens at the edge.
- **Data isolation** - One primary Cloud SQL (PostgreSQL) database per transactional domain.
- **Defense in depth** - Cloud Armor → Load Balancer/CDN → API Gateway → services → private SQL/VPC.
- **Observability & DR** - Central logging/monitoring; immutable audit in BigQuery; multi-region backup strategy.

### 3.2 High-level architecture
*Figure 1. VaultGuard system architecture on Google Cloud Platform.*

#### Edge & entry
- Users reach VaultGuard via Web (Next.js) and mobile-ready clients.
- Cloud Load Balancing + Cloud CDN terminate TLS and cache static assets.
- Cloud Armor provides WAF / DDoS controls against malware-style volumetric and OWASP threats.
- API Gateway authenticates requests, rate-limits, and routes to services.

#### Services (Cloud Run)

| Service | Responsibility |
| :--- | :--- |
| **Auth Service** | Login, MFA, device trust, token issuance; Identity Platform + Cloud KMS |
| **Accounts Service** | Balances, account profiles, statements (read-heavy) |
| **Payments Service** | Transfers, bill pay, idempotent ledgers, risk hooks |
| **Loans Service** | Facilities, schedules, repayments |
| **Notification Service** | Email/SMS/push consumers from Pub/Sub |
| **Audit Service** | Security and transaction event ingestion; query API for user/admin views |

#### Data & platform
- **Cloud SQL (PostgreSQL)** - `accounts_db`, `payments_db`, `loans_db` with separate credentials.
- **Memorystore (Redis)** - sessions, rate-limit counters, short-lived cache.
- **Pub/Sub** - `payment.completed`, `loan.repaid`, `security.alert` events.
- **BigQuery** - long-term immutable audit analytics.
- **Secret Manager + Cloud KMS** - secrets and HSM-backed keys (Master Key analogue).
- **Cloud IAM** - least-privilege service accounts per microservice.
- **VPC/Private IP** - databases not exposed to the public internet.
- **Cloud Logging, Monitoring, Trace** - SLOs, alerts, incident response.

### 3.3 Secure data flow (example: transfer)
1. Client presents access token to API Gateway.
2. Gateway validates token and forwards to Payments with request ID.
3. Payments checks sender account via authenticated internal call to Accounts, runs limits/risk rules.
4. Payments writes ledger entries in `payments_db`; sensitive fields use KMS-backed encryption.
5. Payments publishes `payment.completed` to Pub/Sub.
6. Notification and Audit subscribe independently; failure of Notification does not roll back the payment.
7. All steps emit structured logs with correlation IDs for forensics.

### 3.4 Failure isolation & disaster recovery
- **Blast radius:** Service crash or deploy failure affects only that Cloud Run service.
- **Degraded mode:** If Payments is unhealthy, Gateway returns controlled errors; Accounts remains read-available.
- **RPO/RTO:** RPO ≤ 15 minutes (continuous/PITR backups); RTO ≤ 4 hours for regional failover of Auth + Accounts + Payments.
- **Backup:** Automated Cloud SQL backups + encrypted snapshots; BigQuery retention for audit continuity.
- **Malware resilience:** No shared monolith binary; rotated keys; immutable audit; Armor policies; least privilege.

---

## 04. Wireframes Design

### 4.1 Design intent
VaultGuard's interface communicates trust and recovery. Visual language: deep navy primary, mint accent for success/secure states, high-contrast typography, generous spacing. The brand name is the hero of the landing experience - not a small nav label.

### 4.2 Design file link
Original design file (interactive wireframe gallery - all frames, full fidelity):  
https://inusha-thathsara.github.io/vaultguard-phase01-wireframes/

### 4.3 Screens
- **Figure 2.** Landing brand-first recovery entry
- **Figure 3.** Secure login
- **Figure 4.** MFA challenge
- **Figure 5.** Customer dashboard
- **Figure 6.** Transfer / payment flow
- **Figure 7.** Transaction history
- **Figure 8.** Loans & credit overview
- **Figure 9.** Security & recovery settings
- **Figure 10.** System status (ops transparency)

---

## 05. Functional Requirements

### 5.1 Identity & access

| ID | Requirement |
| :--- | :--- |
| **FR-01** | System shall allow returning customers to verify identity against restored backup records and complete first-time re-enrollment. |
| **FR-02** | System shall authenticate users with password and MFA (TOTP/SMS/passkey). |
| **FR-03** | System shall support trusted-device registration and require step-up MFA for unrecognized devices. |
| **FR-04** | System shall enforce session expiry and secure logout across clients. |
| **FR-05** | System shall support role-based access: Customer and Support Operator (read-scoped tools). |

### 5.2 Accounts

| ID | Requirement |
| :--- | :--- |
| **FR-06** | Customer shall view account list, available balance, and account status. |
| **FR-07** | Customer shall download or view basic statements for a selectable date range. |
| **FR-08** | When Payments is degraded, Accounts shall remain available in read-only mode. |

### 5.3 Payments & transfers

| ID | Requirement |
| :--- | :--- |
| **FR-09** | Customer shall initiate domestic transfer to a saved or new payee. |
| **FR-10** | System shall require confirmation review (amount, payee, fee) before commit. |
| **FR-11** | System shall apply configurable transfer limits and risk checks; high-risk actions require step-up MFA. |
| **FR-12** | System shall process bill payments to registered billers. |
| **FR-13** | System shall guarantee idempotent payment submission (client request ID). |
| **FR-14** | Customer shall view transaction history with status (pending, completed, failed). |

### 5.4 Loans

| ID | Requirement |
| :--- | :--- |
| **FR-15** | Customer shall view active loans, outstanding principal, and next due date. |
| **FR-16** | Customer shall initiate loan repayment from an eligible account. |

### 5.5 Notifications & audit

| ID | Requirement |
| :--- | :--- |
| **FR-17** | System shall notify customers of login from new device, payment success/failure, and MFA changes. |
| **FR-18** | Customer shall view a personal security activity feed (login, device, password events). |
| **FR-19** | System shall record immutable audit events for authentication, payments, and admin actions. |

### 5.6 Resilience & operations

| ID | Requirement |
| :--- | :--- |
| **FR-20** | System shall expose a public system-status view indicating healthy / degraded services. |
| **FR-21** | API Gateway shall reject unauthenticated requests to protected routes and enforce rate limits. |
| **FR-22** | Support Operator shall look up customer profile with full audit of access. |

---

## 06. Non-Functional Requirements

Post-cyberattack quality is non-negotiable. VaultGuard's NFRs prioritize security, recoverability, and reliability.

### 6.1 Security

| ID | Requirement |
| :--- | :--- |
| **NFR-S1** | All data in transit shall use TLS 1.2+. |
| **NFR-S2** | Data at rest in Cloud SQL and object storage shall be encrypted; application secrets only in Secret Manager. |
| **NFR-S3** | Cryptographic keys shall be managed in Cloud KMS (HSM-backed where required); services get decrypt via IAM, not raw key export. |
| **NFR-S4** | Network path to databases shall be private (VPC); no public SQL IPs. |
| **NFR-S5** | Edge shall be protected by Cloud Armor (WAF + rate-based rules). |
| **NFR-S6** | Services shall run with least-privilege IAM service accounts (no shared god-account). |
| **NFR-S7** | PII shall be minimized in logs; payment pan-like data never logged in plaintext. |

### 6.2 Reliability & isolation

| ID | Requirement |
| :--- | :--- |
| **NFR-R1** | Target availability for critical path (Auth + Accounts + Payments): 99.9% monthly. |
| **NFR-R2** | Failure of one microservice shall not cascade unchecked; circuit breakers and timeouts required. |
| **NFR-R3** | Deployments shall be independently releasable per service (Cloud Run revisions). |

### 6.3 Disaster recovery

| ID | Requirement |
| :--- | :--- |
| **NFR-D1** | RPO ≤ 15 minutes for transactional databases via continuous/PITR backups. |
| **NFR-D2** | RTO ≤ 4 hours for restoring critical path in an alternate region (documented runbook). |
| **NFR-D3** | Audit trail shall remain queryable from BigQuery even if a transactional DB is under recovery. |
| **NFR-D4** | Backup restore drills shall be definable as Phase 03 fortify exercises. |

### 6.4 Performance & scalability

| ID | Requirement |
| :--- | :--- |
| **NFR-P1** | Interactive API p95 latency target: < 500 ms for read account balance under normal load. |
| **NFR-P2** | Services shall autoscale on Cloud Run based on concurrency/CPU. |
| **NFR-P3** | Static assets shall be served via Cloud CDN. |

### 6.5 Observability & compliance posture

| ID | Requirement |
| :--- | :--- |
| **NFR-O1** | Structured logs, metrics, and traces shall be enabled for every service. |
| **NFR-O2** | Security-relevant events shall be retained immutably for forensic review. |
| **NFR-O3** | Access by Support Operators shall be attributable (who/when/why). |

### 6.6 Usability & inclusion

| ID | Requirement |
| :--- | :--- |
| **NFR-U1** | Primary flows shall be usable on mobile viewports (responsive web). |
| **NFR-U2** | UI shall meet WCAG 2.1 AA contrast for text and critical controls where feasible. |
| **NFR-U3** | Copy shall support plain-language recovery (avoid jargon in customer-facing errors). |

---

## 07. Technology Stack Selection

### 7.1 Stack overview

| Layer | Technology | Why it fits VaultGuard |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React) + TypeScript | Strong UX for banking flows; type safety for money-critical UI |
| **Backend services** | NestJS (Node.js) on Cloud Run | Module boundaries map 1:1 to microservices; fast Phase 02 delivery |
| **API edge** | API Gateway + Cloud Load Balancing | Central authn, routing, throttling |
| **Identity** | Google Identity Platform + Cloud IAM | Managed MFA-capable identity; workload identity for services |
| **Primary data** | Cloud SQL for PostgreSQL (per domain) | Relational integrity; managed backups/PITR |
| **Cache/session** | Memorystore for Redis | Fast session and limit counters |
| **Messaging** | Pub/Sub | Decouples payments from notify/audit |
| **Secrets & keys** | Secret Manager + Cloud KMS | Direct answer to Master Key / post-attack key ceremony |
| **Edge security** | Cloud Armor + CDN | WAF/DDoS in front of the rebuilt bank |
| **Audit analytics** | BigQuery | Immutable, scalable security and transaction audit |
| **Observability** | Cloud Logging, Monitoring, Trace | Single pane for Phase 03 fortify/defense |
| **CI/CD** | Cloud Build + Artifact Registry | Reproducible images; supply-chain clarity |
| **IaC (planned)** | Terraform | Repeatable secure environments for Rebuild/Fortify |

### 7.2 Why GCP + this stack (attack-proof rationale)
- **Independent services on Cloud Run** - each bounded context scales and fails alone; no shared app server monolith.
- **Managed identity and KMS** - removes custom crypto foot-guns; aligns with zero-trust rebuild.
- **Pub/Sub isolation** - notification malware/load spikes cannot deadlock the payment commit path.
- **Private data plane** - Cloud SQL on private IP + IAM cuts exposure versus publicly reachable legacy cores.
- **Operational realism for Duothan** - Cloud Run + Cloud Build is deployable within hackathon constraints while still demonstrating real DevOps in Phase 03.

### 7.3 Explicit non-choices
- **Single shared monolith database** - rejected; contradicts isolation requirement.
- **Storing Master Key in app config** - rejected; KMS only.
- **Full GKE from day one** - deferred; Cloud Run delivers service independence with less ops overhead for Phase 02/03 timelines (GKE remains a scale-up path).

---

## Closing
By the end of Phase 01, VaultGuard is a complete blueprint: a clearly defined banking crisis problem, a GCP microservices solution that restores trust without recreating a single point of failure.

*Awaken your inner warrior. Rebuild the future. Defend the digital world.*

**Duothan 6.0 | Team BackTrack | VaultGuard**
