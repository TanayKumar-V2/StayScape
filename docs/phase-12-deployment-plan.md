# StayScape — Phase 12 Deployment Plan

## 1. Executive Summary

This document specifies the end-to-end production deployment plan, architecture, service responsibilities, migration procedures, operational dependencies, and risk mitigation strategies for launching **StayScape** — a production-ready accommodation booking marketplace.

---

## 2. Production Architecture & Service Responsibilities

```
                                      ┌────────────────────────────────────────┐
                                      │             Internet User              │
                                      └──────────────────┬─────────────────────┘
                                                         │ HTTPS
                                ┌────────────────────────┴────────────────────────┐
                                │                                                 │
                                ▼                                                 ▼
               ┌─────────────────────────────────┐              ┌─────────────────────────────────┐
               │         Frontend (Vercel)       │              │      Backend API (Render)       │
               │      https://www.YOUR_DOMAIN    │              │      https://api.YOUR_DOMAIN    │
               │       Next.js 15 App Router     │              │     NestJS API & Socket.IO      │
               └────────────────┬────────────────┘              └────────┬───────────────┬────────┘
                                │ API Calls / WS                         │               │
                                └────────────────────────────────────────┘               │ Private Network
                                                                                         │
                                ┌────────────────────────────────────────────────────────┼───────────────────────┐
                                │ Render Private Network                                 │                       │
                                │                                                        ▼                       ▼
                                │                                          ┌──────────────────────┐  ┌───────────────────────┐
                                │                                          │  Background Worker   │  │  Managed Redis/Valkey │
                                │                                          │   (Render Worker)    │  │  (Render Key Value)   │
                                │                                          │  BullMQ Queue Runner │  │  Port 6379 (Private)  │
                                │                                          └──────────┬───────────┘  └───────────────────────┘
                                └─────────────────────────────────────────────────────┼──────────────────────────┘
                                                                                      │
                                                                                      ▼ TLS / SSL
                                                         ┌────────────────────────────────────────────────────────┐
                                                         │               Neon PostgreSQL Database                 │
                                                         │  Runtime: ep-pooler (PgBouncer connection pool)        │
                                                         │  Direct:  ep (Direct TCP for Prisma migrate deploy)    │
                                                         └────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer | Hosting Provider | Deployment Unit | Responsibilities |
|---|---|---|---|
| **Frontend** | **Vercel** | Next.js 15 (Edge & Serverless) | SSR, public landing pages, stay search, discovery, reviews, wishlist, booking UI, Razorpay Checkout modal, guest-host messaging, admin console |
| **Backend API** | **Render** | Docker (Web Service) | REST API `/api/v1`, Socket.IO gateway, JWT authentication with HTTP-only cookies, reservation holds, Razorpay order generation & webhooks |
| **Background Worker** | **Render** | Docker (Background Worker) | BullMQ processor: hold expirations (10m), booking completion sweeps (15m), payment webhook processing, refund execution, payment reconciliation (30m) |
| **Database** | **Neon** | Serverless PostgreSQL 16 | ACID source of truth, booking exclusion constraints (`gist`), transactional records, row locks |
| **Cache & Queues** | **Render Key Value** | Managed Redis / Valkey | BullMQ queues, rate limiting, presence tracking, availability caching (30s), AI summary caching |
| **External Media** | **Cloudinary** | SaaS Storage & CDN | Host listing image uploads, transformations, secure HTTPS media delivery |
| **Payments** | **Razorpay** | PCI-DSS Gateway | Customer checkout, signature verification, automatic captures, refunds, webhooks |
| **AI Intelligence** | **Groq** | Inference Cloud | StayMatch semantic search, 24/7 property assistant, comparisons, itineraries, review summaries |

---

## 3. Strict Environment Separation

| Attribute | Local Development | Staging Environment | Production Environment |
|---|---|---|---|
| **Frontend URL** | `http://localhost:3000` | `https://staging.YOUR_DOMAIN` | `https://www.YOUR_DOMAIN` |
| **Backend API URL** | `http://localhost:4000/api/v1` | `https://api-staging.YOUR_DOMAIN/api/v1` | `https://api.YOUR_DOMAIN/api/v1` |
| **Socket.IO Origin**| `http://localhost:4000` | `https://api-staging.YOUR_DOMAIN` | `https://api.YOUR_DOMAIN` |
| **Database** | Local Postgres / Neon Dev branch | Neon Staging branch (`stayscape-staging`) | Neon Production branch (`main` / `primary`) |
| **Redis** | Local Docker container (`localhost:6379`) | Dedicated Staging Redis instance | Dedicated Production Redis instance (`noeviction`) |
| **Razorpay Mode** | Test Mode (`rzp_test_...`) | Test Mode (`rzp_test_...`) | **Live Mode (`rzp_live_...`)** |
| **Cookie Domain** | `localhost` | `.staging.YOUR_DOMAIN` or isolated | `.YOUR_DOMAIN` (covers `www` and `api`) |
| **Admin Provisioning** | Local CLI bootstrap | Staging CLI bootstrap | Production CLI bootstrap (`pnpm admin:promote`) |

---

## 4. Required Accounts & Credentials

1. **GitHub**: Repository hosting, branch protection on `main`, GitHub Actions CI.
2. **Vercel**: Team/personal account, linked to GitHub repository, monorepo root set to `apps/web`.
3. **Render**: Account with access to provision Web Service, Background Worker, and Managed Redis.
4. **Neon**: Serverless PostgreSQL project with two branches: `production` and `staging`.
5. **Razorpay**: Activated business account with completed KYC/compliance for Live Mode API keys and Webhook secret.
6. **Cloudinary**: Production cloud environment with API Key, Secret, and designated upload preset/folder.
7. **Groq**: API account with active credits and access to `openai/gpt-oss-20b` or `llama-3.3-70b-versatile`.
8. **DNS / Registrar (e.g. Hostinger / Cloudflare)**: Control panel access to configure CNAME and A records.

---

## 5. Deployment Sequence

```
1. Pre-Flight Verification ──▶ 2. Staging Infrastructure Setup ──▶ 3. Staging Database Migration
                                                                           │
5. Staging Smoke Test ◀────── 4. Staging Deploy (Vercel & Render) ◀────────┘
         │
         ▼
6. Production Approval Gate
         │
         ▼
7. Production Database Backup Confirmation ──▶ 8. Production Prisma Migrate Deploy
                                                              │
10. Production Smoke Test ◀─── 9. Production Deploy (Vercel & Render API + Worker)
         │
         ▼
11. Secure Admin Promotion CLI ──▶ 12. Final Launch Verification & DNS Cutover
```

---

## 6. Database Migration & Release Strategy

1. **Pooled vs Direct URLs**:
   - `DATABASE_URL` (with `-pooler`) is used by API and Worker runtime instances for high-concurrency connection pooling.
   - `DIRECT_URL` (without `-pooler`) is used exclusively for Prisma migration deployments and schema validation.
2. **Controlled Execution**:
   - Migrations are **never** executed from running container replicas on startup.
   - Release command runs exactly once:
     ```bash
     pnpm --filter @stayscape/api prisma:migrate:deploy
     ```
3. **Production Seeding**:
   - Real customer data, fake listings, and demo users are **forbidden** in production.
   - Only the idempotent standard amenities catalogue is seeded:
     ```bash
     pnpm --filter @stayscape/api run prisma:seed:prod
     ```

---

## 7. Rollback Strategy

1. **Frontend**: Instant rollback to previous immutable deployment artifact in Vercel Dashboard.
2. **Backend API & Worker**: Re-deploy previous verified Git commit tag in Render Dashboard.
3. **Database**: Forward corrective migration policy. All migrations must follow backward-compatible expand-and-contract patterns so older backend versions continue functioning during rollbacks.

---

## 8. Unresolved Deployment Risks & Mitigations

| Risk Identified | Severity | Mitigation in Phase 12 |
|---|---|---|
| **Frontend CSP with Razorpay inline scripts** | Medium | CSP explicitly permits Razorpay CDN (`checkout.razorpay.com`, `api.razorpay.com`) while locking framing (`frame-ancestors 'none'`) and restricting form targets. |
| **Accidental Multi-Worker Contention** | High | `ENABLE_WORKERS=false` enforced on API web service; only dedicated `stayscape-worker` executes processors with deterministic BullMQ job schedulers. |
| **Subdomain Cookie Inaccessibility** | High | `COOKIE_DOMAIN` configured with shared root (`.YOUR_DOMAIN`) ensuring cross-subdomain authentication between `www` and `api`. |
| **Redis Memory Eviction** | Medium | Render Key Value configured with `maxmemoryPolicy: noeviction` so delayed jobs and webhook inbox queues are never dropped. |

