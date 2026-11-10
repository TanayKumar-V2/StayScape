# StayScape — Production Launch Checklist

This checklist contains the 50 mandatory verification gates that must be satisfied before declaring StayScape fully launched.

---

## 1. Infrastructure Readiness (Gates 1–7)

- [x] **Gate 1 — Production Frontend Deployment**: Vercel project configured for `apps/web` with production branch gating.
- [x] **Gate 2 — Production API Deployment**: Render Web Service configured with `Dockerfile.api` binding to `0.0.0.0:${PORT}`.
- [x] **Gate 3 — Production Background Worker**: Render Background Worker configured with `Dockerfile.worker` (`ENABLE_WORKERS=true`, non-HTTP).
- [x] **Gate 4 — Managed Redis Connectivity**: Private internal network connection to managed Redis instance with `maxmemoryPolicy: noeviction`.
- [x] **Gate 5 — Neon Database Connectivity**: Pooled connection (`DATABASE_URL`) with `-pooler.` and direct connection (`DIRECT_URL`) configured with SSL.
- [x] **Gate 6 — Cloudinary Storage**: Production cloud credentials verified and Next.js remote patterns configured.
- [x] **Gate 7 — Groq AI Engine**: Production API key configured with bounded timeouts and structured fallback modes.

---

## 2. Domains, HTTPS & Networking (Gates 8–14)

- [ ] **Gate 8 — Frontend DNS**: CNAME `www` pointing to `cname.vercel-dns.com` and apex `@` record pointing to Vercel IP `76.76.21.21`.
- [ ] **Gate 9 — Backend API DNS**: CNAME `api` pointing to Render service endpoint (`stayscape-api.onrender.com`).
- [ ] **Gate 10 — HTTPS / TLS Certificates**: Active, valid SSL/TLS certificates issued and verified for `www.YOUR_DOMAIN` and `api.YOUR_DOMAIN`.
- [ ] **Gate 11 — HTTP-to-HTTPS Redirects**: Automatic permanent redirect (HTTP 301/308) from plain HTTP to HTTPS across all routes.
- [x] **Gate 12 — Shared Cookie Domain**: `COOKIE_DOMAIN=.YOUR_DOMAIN` set with `Secure=true`, `HttpOnly=true`, and `SameSite=Lax`.
- [x] **Gate 13 — Strict CORS Whitelist**: Backend only accepts origins explicitly configured in `WEB_ORIGIN` and `WEB_ORIGINS`.
- [x] **Gate 14 — Socket.IO Over HTTPS/WSS**: WebSocket upgrade handshake succeeds over TLS with session cookie authentication.

---

## 3. Database Integrity & Migrations (Gates 15–19)

- [x] **Gate 15 — Migration Status**: All 7 Prisma migrations applied via `pnpm prisma:migrate:deploy` with zero pending migrations.
- [x] **Gate 16 — Performance Indexes**: Indexes active on foreign keys, property search fields (`city`, `state`, `country`, `propertyType`, `pricePerNightPaise`), and composite booking dates.
- [x] **Gate 17 — Exclusion Constraints**: PostgreSQL `gist` exclusion constraint `no_overlapping_active_bookings` active to prevent double-booking at the database engine level.
- [x] **Gate 18 — Connection Pool Boundaries**: API and Worker connection limits tuned for Neon PgBouncer pool capacity.
- [x] **Gate 19 — Production Seeding Isolation**: Only standard amenities seeded via `prisma:seed:prod`; demo users and fictional listings are excluded.

---

## 4. Application Workflows & Features (Gates 20–36)

- [x] **Gate 20 — Homepage & Brand Identity**: Premium landing page loads with destinations carousel and responsive layout.
- [x] **Gate 21 — Property Discovery & Filtering**: Filter by location, price range, property type, and guest count with approximate coordinates (rounded to 2 decimal places).
- [x] **Gate 22 — Property Details Page**: Gallery, host details, amenities list, and interactive pricing summary render cleanly.
- [x] **Gate 23 — User Authentication**: Secure registration, login, JWT token rotation, and HTTP-only cookie persistence.
- [x] **Gate 24 — Host Onboarding & Portal**: Host profile creation, terms acceptance, and listing management dashboard.
- [x] **Gate 25 — Listing Creation & Media Upload**: Multi-image Cloudinary upload with cover image selection and property publishing.
- [x] **Gate 26 — Availability Calendar**: Dynamic unavailable date ranges calculated with real-time exclusion of active holds and confirmed stays.
- [x] **Gate 27 — Temporary Booking Holds**: 10-minute hold creation with delayed BullMQ expiration job and atomic row lock.
- [ ] **Gate 28 — Razorpay Checkout Modal**: Client-side checkout modal loads Razorpay SDK securely and initiates orders.
- [ ] **Gate 29 — Payment Confirmation Lifecycle**: Payment callback verifies cryptographic signature and transitions hold to `CONFIRMED`.
- [ ] **Gate 30 — Asynchronous Webhook Processing**: `payment.captured` and `payment.failed` webhooks processed through PostgreSQL inbox and BullMQ.
- [x] **Gate 31 — Refund Reconciliation**: Operational retry mechanism and automated sweep for requested or failed refunds.
- [x] **Gate 32 — AI StayMatch**: Semantic stay recommendations powered by Groq with fallback to standard query filters.
- [x] **Gate 33 — Verified Reviews & Category Ratings**: Reviews restricted to completed stays with 6 category ratings and host responses.
- [x] **Gate 34 — Wishlist Management**: Database-backed saved properties with composite unique constraint `(userId, propertyId)`.
- [x] **Gate 35 — Real-Time Guest–Host Messaging**: Ephemeral presence, typing indicators, read receipts, and message delivery via Socket.IO.
- [x] **Gate 36 — Back-Office Admin Dashboard**: 10 administrative modules under `/admin` with role verification and immutable audit logging.

---

## 5. Reliability & Disaster Recovery (Gates 37–43)

- [x] **Gate 37 — API Health Probes**: `/api/v1/health/live` (process) and `/api/v1/health/ready` (PostgreSQL + Redis) functional.
- [x] **Gate 38 — Worker Process Isolation**: `stayscape-worker` operates as a separate process without HTTP listening ports.
- [x] **Gate 39 — Redis Outage Resilience**: Application degrades gracefully on Redis failure; PostgreSQL preserves all critical records.
- [x] **Gate 40 — Background Job Idempotency**: All BullMQ jobs use deterministic identifiers and idempotent database transactions.
- [x] **Gate 41 — Operational Monitoring**: Structured logs with correlation IDs and error categorization.
- [x] **Gate 42 — Rollback Runbook**: Instant Vercel frontend rollback and Render commit rollback procedures tested.
- [x] **Gate 43 — Database Recovery Runbook**: Neon Point-In-Time Recovery (PITR) and payment reconciliation procedures documented.

---

## 6. Security & Compliance Verification (Gates 44–50)

- [x] **Gate 44 — Zero Committed Secrets**: Repository scanned; `.env` files ignored by `.gitignore` and `.dockerignore`.
- [x] **Gate 45 — Client Bundle Audit**: No server-side private keys, database URLs, or Razorpay secrets in `NEXT_PUBLIC_*` variables.
- [x] **Gate 46 — Protected Admin Bootstrap**: Admin accounts can only be created via secure CLI script (`pnpm admin:promote`).
- [x] **Gate 47 — Secure Cookie Flags**: `Secure=true`, `HttpOnly=true`, and `SameSite=Lax` verified.
- [x] **Gate 48 — Content Security Policy (CSP)**: Strict headers configured in Next.js with `upgrade-insecure-requests`.
- [x] **Gate 49 — Raw-Body Webhook Verification**: Webhooks verify exact HMAC bytes; forged signatures are rejected with HTTP 400.
- [ ] **Gate 50 — Payment Mode Verification**: Production environment uses genuine `rzp_live_*` credentials; test mode disabled in production.

---

## Status Key
- `[x]` **Verified in repository & test suites**
- `[ ]` **Requires live DNS / payment gateway account connection during deployment**

