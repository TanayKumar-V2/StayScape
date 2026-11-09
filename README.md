# StayScape

**StayScape** is an AI-powered accommodation booking platform — a modern marketplace for discovering and booking hotels, apartments, villas, homestays, and unique stays.

> **Phase 1 — Foundation & Architecture.** This README covers the initial platform foundation. Business features (search, booking, payments, AI) will be added in subsequent phases.

---

## Technology Stack

| Layer              | Technology                                                    |
| ------------------ | ------------------------------------------------------------- |
| **Frontend**       | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, React 19 |
| **Backend**        | NestJS 11, TypeScript (strict), REST API, Swagger/OpenAPI     |
| **Database**       | Neon PostgreSQL (serverless), Prisma ORM 6                    |
| **Cache**          | Redis 7 (ioredis)                                             |
| **Infrastructure** | Docker Compose                                                |
| **Monorepo**       | pnpm workspaces                                               |
| **Code Quality**   | ESLint, Prettier, TypeScript strict mode                      |

---

## Architecture Overview

```
stayscape/                    ← monorepo root (pnpm workspaces)
├── apps/
│   ├── web/                  ← @stayscape/web  (Next.js, port 3000)
│   └── api/                  ← @stayscape/api  (NestJS, port 4000)
├── docker-compose.yml        ← Redis infrastructure
├── pnpm-workspace.yaml
└── package.json
```

The monorepo uses **pnpm workspaces** without additional build orchestration tools to keep the setup simple.

---

## Prerequisites

| Tool           | Minimum version                      |
| -------------- | ------------------------------------ |
| Node.js        | 20.x (LTS) — `.nvmrc` pins `24.19.0` |
| pnpm           | 9.x or later                         |
| Docker Desktop | Current stable                       |
| Git            | Current stable                       |

---

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd stayscape

# Install all dependencies across all workspaces
pnpm install
```

---

## Project Structure

```
stayscape/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/           ← Next.js App Router pages & layouts
│   │   │   ├── components/    ← Reusable UI components (Phase 2+)
│   │   │   ├── hooks/         ← Custom React hooks (Phase 2+)
│   │   │   ├── lib/           ← Utilities, API client, config
│   │   │   └── types/         ← Shared TypeScript types
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── common/        ← Shared filters, guards, interceptors
│       │   │   └── filters/   ← GlobalExceptionFilter
│       │   ├── config/        ← App configuration & env validation
│       │   ├── health/        ← /health/live and /health/ready endpoints
│       │   ├── prisma/        ← PrismaService, PrismaModule
│       │   ├── redis/         ← RedisService, RedisModule
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   └── schema.prisma  ← Prisma schema (models added Phase 2+)
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── .prettierrc
├── .editorconfig
├── .gitignore
├── .nvmrc
└── README.md
```

---

## Configuring Neon PostgreSQL

StayScape uses [Neon](https://neon.tech) — a serverless PostgreSQL platform. You need **two separate connection strings**:

| Variable       | Purpose                                                | Where to find it                                                          |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `DATABASE_URL` | Pooled connection — used by the application at runtime | Neon dashboard → your project → **Connection string** → select **Pooled** |
| `DIRECT_URL`   | Direct connection — used by Prisma for migrations only | Neon dashboard → your project → **Connection string** → select **Direct** |

Both strings look like:

```
postgresql://user:password@host/dbname?sslmode=require
```

> **Never commit real credentials.** Only commit `.env.example` files.

---

## Configuring Environment Variables

### Backend (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:3000

# Neon pooled connection (application runtime)
DATABASE_URL=postgresql://user:password@pooled-host/dbname?sslmode=require

# Neon direct connection (Prisma migrations)
DIRECT_URL=postgresql://user:password@direct-host/dbname?sslmode=require

# Redis (Docker Compose runs it on localhost:6379)
REDIS_URL=redis://localhost:6379
```

### Frontend (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

> **Important:** Variables prefixed with `NEXT_PUBLIC_` are embedded in the browser bundle. Never put secrets in `NEXT_PUBLIC_` variables.

---

## Starting Redis

Redis runs locally via Docker Compose:

```bash
# Start Redis in the background
pnpm docker:up

# Stop Redis
pnpm docker:down

# View Redis logs
pnpm docker:logs
```

Redis is available on `localhost:6379`.

---

## Running the Application

### Development (both apps simultaneously)

```bash
pnpm dev
```

### Individual apps

```bash
# Frontend only (http://localhost:3000)
pnpm dev:web

# Backend only  (http://localhost:4000)
pnpm dev:api
```

---

## Accessing Swagger

Swagger UI is available in development at:

```
http://localhost:4000/api/docs
```

> Swagger is **disabled in production** (`NODE_ENV=production`).

---

## Phase 3 — Authentication & User Management

StayScape features a dual-token JWT authentication system with session family rotation, Argon2id password hashing, Redis rate-limiting, and secure HTTP-only cookies.

### 1. Architecture & Security Model

```
Browser Client (Next.js)
  │
  ├── 1. Request (credentials: 'include') ───────────► NestJS (OriginGuard + RateLimiter)
  │                                                            │
  │                                                    Validate Origin header & IP/email limits
  │                                                            │
  │   ◄── Sets stayscape_access (15m, /) ──────────────────────┤
  │   ◄── Sets stayscape_refresh (7d, /api/v1/auth) ───────────┤
  │                                                            ▼
  │                                                     Argon2id / JWT Services
  │                                                            │
  │   On 401: Single-flight in-flight refresh ─────────────────┤
  │   Detects reuse: Revokes entire session family ────────────▼
  ▼                                                     Neon PostgreSQL (Prisma)
HTTP-only Cookies (No localStorage)
```

- **Dual-Token Lifecycle:**
  - **Access Token:** 15-minute lifetime. Contains minimal claims: `sub`, `email`, `role`, `tokenVersion`, `type: 'access'`.
  - **Refresh Token:** 7-day lifetime. Signed with a dedicated `REFRESH_TOKEN_SECRET`. Contains `sub`, `jti` (unique record UUID), `familyId`, `type: 'refresh'`.
- **Session Family Rotation & Reuse Detection:**
  - Each refresh generates a new refresh token and atomically marks the old record as revoked with `replacedById`.
  - If a revoked token is ever presented again (indicative of token theft/replay), **all** active tokens in that `familyId` are immediately revoked.
- **Argon2id Hashing:** Password hashing uses OWASP-recommended parameters (64 MB memory cost, 3 iterations, 4 parallelism threads). Plaintext passwords and hashes are never returned or logged.
- **Passphrase Policy:** Minimum 10 characters, maximum 128 characters.
- **Redis Rate Limiting:**
  - Registration: 5 requests per IP per hour.
  - Login: 5 failed attempts per IP + hashed email per 15 minutes.
  - Refresh: 30 requests per IP per minute.
  - Returns `429 Too Many Requests` with `Retry-After`.
- **HTTP-only Cookies:**
  - `stayscape_access`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production).
  - `stayscape_refresh`: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Secure` (in production).
  - Tokens are never exposed to browser-readable storage (`localStorage`/`sessionStorage`).

### 2. Database Models

#### `User`

| Field           | Type            | Description                                  |
| --------------- | --------------- | -------------------------------------------- |
| `id`            | `String` UUID   | Primary key                                  |
| `email`         | `String`        | Unique, normalized lowercase email           |
| `passwordHash`  | `String`        | Argon2id hash (`users.password_hash`)        |
| `firstName`     | `String`        | User first name                              |
| `lastName`      | `String`        | User last name                               |
| `avatarUrl`     | `String?`       | Optional profile photo URL                   |
| `role`          | `UserRole`      | `USER` (guest) or `ADMIN` (default: `USER`)  |
| `status`        | `AccountStatus` | `ACTIVE` or `SUSPENDED` (default: `ACTIVE`)  |
| `emailVerified` | `Boolean`       | Email verification status (default: `false`) |
| `tokenVersion`  | `Int`           | Incremented on `logout-all` to revoke access |
| `lastLoginAt`   | `DateTime?`     | Timestamp of latest login                    |
| `createdAt`     | `DateTime`      | Account creation timestamp                   |
| `updatedAt`     | `DateTime`      | Automatic update timestamp                   |

#### `RefreshToken`

| Field          | Type          | Description                                      |
| -------------- | ------------- | ------------------------------------------------ |
| `id`           | `String` UUID | Unique session identifier (`jti`)                |
| `userId`       | `String` UUID | Foreign key to `User` (cascade on delete)        |
| `familyId`     | `String` UUID | Unique session-family identifier                 |
| `tokenHash`    | `String`      | SHA-256 cryptographic digest of raw refresh JWT  |
| `expiresAt`    | `DateTime`    | Expiration timestamp                             |
| `revokedAt`    | `DateTime?`   | Null when active, timestamp when rotated/revoked |
| `replacedById` | `String?`     | Successor token record UUID in rotation chain    |
| `userAgent`    | `String?`     | Client browser / user-agent identifier           |
| `ipAddress`    | `String?`     | Client IP address                                |

Indexes: `[userId]`, `[familyId]`, `[expiresAt]`, and unique on `tokenHash`.

### 3. API Endpoints

All endpoints use global prefix `/api/v1`.

| Method  | Path                      | Auth Required | Description                                                     |
| ------- | ------------------------- | ------------- | --------------------------------------------------------------- |
| `POST`  | `/api/v1/auth/register`   | Public        | Register new guest account and establish initial session family |
| `POST`  | `/api/v1/auth/login`      | Public        | Verify credentials and set authentication cookies               |
| `POST`  | `/api/v1/auth/refresh`    | Public        | Rotate refresh session and issue fresh access/refresh tokens    |
| `POST`  | `/api/v1/auth/logout`     | Public        | Revoke current session and clear authentication cookies         |
| `POST`  | `/api/v1/auth/logout-all` | JWT Guard     | Invalidate all user sessions and increment `tokenVersion`       |
| `GET`   | `/api/v1/auth/me`         | JWT Guard     | Retrieve current authenticated user's sanitized profile         |
| `PATCH` | `/api/v1/users/me`        | JWT Guard     | Update first name and last name                                 |

### 4. Environment Configuration

Generate strong 32+ character secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configure `apps/api/.env`:

```env
ACCESS_TOKEN_SECRET=your_32_plus_char_secret_for_access_tokens
REFRESH_TOKEN_SECRET=your_32_plus_char_secret_for_refresh_tokens
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
WEB_ORIGIN=http://localhost:3000
```

### 5. Testing Authentication & Protected Endpoints

#### Using cURL

```bash
# 1. Register a new user
curl -i -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"firstName":"Alice","lastName":"Smith","email":"alice@example.com","password":"LongPassphrase2026!"}' \
  -c cookies.txt

# 2. Access protected profile using session cookie
curl -i http://localhost:4000/api/v1/auth/me -b cookies.txt

# 3. Update profile details
curl -i -X PATCH http://localhost:4000/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{"firstName":"Alicia"}'

# 4. Rotate session
curl -i -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt -c cookies.txt

# 5. Log out all devices
curl -i -X POST http://localhost:4000/api/v1/auth/logout-all \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Running Tests

```bash
# Run all unit tests (includes password, token, rate-limiter, auth service, users service)
pnpm test:api

# Run end-to-end integration tests
pnpm --filter @stayscape/api test:e2e
```

### 6. Known Limitations (Strict Scope Separation)

- **Social Login:** Google OAuth and third-party SSO are planned for future phases.
- **Email Verification & Password Reset:** Not introduced in Phase 3 because an outbound transactional email service (e.g. Resend/SES) is deferred to future milestones; the database schema already includes `emailVerified` to support this seamlessly.
- **Host Role:** Users are registered under `USER` role. Host onboarding (`HOST` role capabilities) will be implemented in Phase 4.

---

StayScape features a dual-token JWT authentication system with session family rotation, Argon2id password hashing, Redis rate-limiting, and secure HTTP-only cookies.

### 1. Architecture & Security Model

```
Browser Client (Next.js)
  │
  ├── 1. Request (credentials: 'include') ───────────► NestJS (OriginGuard + RateLimiter)
  │                                                            │
  │                                                    Validate Origin header & IP/email limits
  │                                                            │
  │   ◄── Sets stayscape_access (15m, /) ──────────────────────┤
  │   ◄── Sets stayscape_refresh (7d, /api/v1/auth) ───────────┤
  │                                                            ▼
  │                                                     Argon2id / JWT Services
  │                                                            │
  │   On 401: Single-flight in-flight refresh ─────────────────┤
  │   Detects reuse: Revokes entire session family ────────────▼
  ▼                                                     Neon PostgreSQL (Prisma)
HTTP-only Cookies (No localStorage)
```

- **Dual-Token Lifecycle:**
  - **Access Token:** 15-minute lifetime. Contains minimal claims: `sub`, `email`, `role`, `tokenVersion`, `type: 'access'`.
  - **Refresh Token:** 7-day lifetime. Signed with a dedicated `REFRESH_TOKEN_SECRET`. Contains `sub`, `jti` (unique record UUID), `familyId`, `type: 'refresh'`.
- **Session Family Rotation & Reuse Detection:**
  - Each refresh generates a new refresh token and atomically marks the old record as revoked with `replacedById`.
  - If a revoked token is ever presented again (indicative of token theft/replay), **all** active tokens in that `familyId` are immediately revoked.
- **Argon2id Hashing:** Password hashing uses OWASP-recommended parameters (64 MB memory cost, 3 iterations, 4 parallelism threads). Plaintext passwords and hashes are never returned or logged.
- **Passphrase Policy:** Minimum 10 characters, maximum 128 characters.
- **Redis Rate Limiting:**
  - Registration: 5 requests per IP per hour.
  - Login: 5 failed attempts per IP + hashed email per 15 minutes.
  - Refresh: 30 requests per IP per minute.
  - Returns `429 Too Many Requests` with `Retry-After`.
- **HTTP-only Cookies:**
  - `stayscape_access`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production).
  - `stayscape_refresh`: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Secure` (in production).
  - Tokens are never exposed to browser-readable storage (`localStorage`/`sessionStorage`).

### 2. Database Models

#### `User`

| Field           | Type            | Description                                  |
| --------------- | --------------- | -------------------------------------------- |
| `id`            | `String` UUID   | Primary key                                  |
| `email`         | `String`        | Unique, normalized lowercase email           |
| `passwordHash`  | `String`        | Argon2id hash (`users.password_hash`)        |
| `firstName`     | `String`        | User first name                              |
| `lastName`      | `String`        | User last name                               |
| `avatarUrl`     | `String?`       | Optional profile photo URL                   |
| `role`          | `UserRole`      | `USER` (guest) or `ADMIN` (default: `USER`)  |
| `status`        | `AccountStatus` | `ACTIVE` or `SUSPENDED` (default: `ACTIVE`)  |
| `emailVerified` | `Boolean`       | Email verification status (default: `false`) |
| `tokenVersion`  | `Int`           | Incremented on `logout-all` to revoke access |
| `lastLoginAt`   | `DateTime?`     | Timestamp of latest login                    |
| `createdAt`     | `DateTime`      | Account creation timestamp                   |
| `updatedAt`     | `DateTime`      | Automatic update timestamp                   |

#### `RefreshToken`

| Field          | Type          | Description                                      |
| -------------- | ------------- | ------------------------------------------------ |
| `id`           | `String` UUID | Unique session identifier (`jti`)                |
| `userId`       | `String` UUID | Foreign key to `User` (cascade on delete)        |
| `familyId`     | `String` UUID | Unique session-family identifier                 |
| `tokenHash`    | `String`      | SHA-256 cryptographic digest of raw refresh JWT  |
| `expiresAt`    | `DateTime`    | Expiration timestamp                             |
| `revokedAt`    | `DateTime?`   | Null when active, timestamp when rotated/revoked |
| `replacedById` | `String?`     | Successor token record UUID in rotation chain    |
| `userAgent`    | `String?`     | Client browser / user-agent identifier           |
| `ipAddress`    | `String?`     | Client IP address                                |

Indexes: `[userId]`, `[familyId]`, `[expiresAt]`, and unique on `tokenHash`.

### 3. API Endpoints

All endpoints use global prefix `/api/v1`.

| Method  | Path                      | Auth Required | Description                                                     |
| ------- | ------------------------- | ------------- | --------------------------------------------------------------- |
| `POST`  | `/api/v1/auth/register`   | Public        | Register new guest account and establish initial session family |
| `POST`  | `/api/v1/auth/login`      | Public        | Verify credentials and set authentication cookies               |
| `POST`  | `/api/v1/auth/refresh`    | Public        | Rotate refresh session and issue fresh access/refresh tokens    |
| `POST`  | `/api/v1/auth/logout`     | Public        | Revoke current session and clear authentication cookies         |
| `POST`  | `/api/v1/auth/logout-all` | JWT Guard     | Invalidate all user sessions and increment `tokenVersion`       |
| `GET`   | `/api/v1/auth/me`         | JWT Guard     | Retrieve current authenticated user's sanitized profile         |
| `PATCH` | `/api/v1/users/me`        | JWT Guard     | Update first name and last name                                 |

### 4. Environment Configuration

Generate strong 32+ character secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configure `apps/api/.env`:

```env
ACCESS_TOKEN_SECRET=your_32_plus_char_secret_for_access_tokens
REFRESH_TOKEN_SECRET=your_32_plus_char_secret_for_refresh_tokens
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
WEB_ORIGIN=http://localhost:3000
```

### 5. Testing Authentication & Protected Endpoints

#### Using cURL

```bash
# 1. Register a new user
curl -i -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"firstName":"Alice","lastName":"Smith","email":"alice@example.com","password":"LongPassphrase2026!"}' \
  -c cookies.txt

# 2. Access protected profile using session cookie
curl -i http://localhost:4000/api/v1/auth/me -b cookies.txt

# 3. Update profile details
curl -i -X PATCH http://localhost:4000/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{"firstName":"Alicia"}'

# 4. Rotate session
curl -i -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt -c cookies.txt

# 5. Log out all devices
curl -i -X POST http://localhost:4000/api/v1/auth/logout-all \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Running Tests

```bash
# Run all unit tests (includes password, token, rate-limiter, auth service, users service)
pnpm test:api

# Run end-to-end integration tests
pnpm --filter @stayscape/api test:e2e
```

### 6. Known Limitations (Strict Scope Separation)

- **Social Login:** Google OAuth and third-party SSO are planned for future phases.
- **Email Verification & Password Reset:** Not introduced in Phase 3 because an outbound transactional email service (e.g. Resend/SES) is deferred to future milestones; the database schema already includes `emailVerified` to support this seamlessly.
- **Host Role:** Users are registered under `USER` role. Host onboarding (`HOST` role capabilities) will be implemented in Phase 4.

---

### Liveness — `GET /api/v1/health/live`

Checks that the Node.js process is running. Does **not** depend on the database or Redis.

```bash
curl http://localhost:4000/api/v1/health/live
# {"status":"ok","service":"stayscape-api"}
```

### Readiness — `GET /api/v1/health/ready`

Checks database and Redis connectivity. Returns **HTTP 200** when all healthy, **HTTP 503** when any dependency is down.

```bash
curl http://localhost:4000/api/v1/health/ready
# {"status":"ok","checks":{"database":"up","redis":"up"}}
```

---

## Useful Commands

```bash
# Install all dependencies
pnpm install

# Generate Prisma Client
pnpm prisma:generate

# Run database migrations (requires DATABASE_URL and DIRECT_URL)
pnpm prisma:migrate

# Type-check all workspaces
pnpm typecheck

# Lint all workspaces
pnpm lint

# Format all code
pnpm format

# Check formatting without writing
pnpm format:check

# Build all packages
pnpm build

# Run API unit tests
pnpm test:api
```

---

## Common Setup Errors

### `DATABASE_URL is required`

You have not created `apps/api/.env` or the value is empty. Copy `.env.example` and set your Neon connection strings.

### `Error connecting to Redis`

Redis is not running. Start it with `pnpm docker:up`.

### `Cannot find module '@prisma/client'`

Run `pnpm prisma:generate` to generate the Prisma Client.

### `Port 3000 / 4000 already in use`

Another process is using the port. Either stop it or change `PORT` / `--port` in the respective `.env` / package.json.

### `pnpm: command not found`

Install pnpm globally: `npm install -g pnpm@latest`

---

## Development Workflow

1. `pnpm docker:up` — start Redis
2. Configure `apps/api/.env` with Neon credentials
3. `pnpm prisma:generate` — generate Prisma Client
4. `pnpm dev` — start frontend and backend
5. Open `http://localhost:3000` — frontend landing page
6. Open `http://localhost:4000/api/docs` — Swagger
7. `curl http://localhost:4000/api/v1/health/live` — verify API

---

## Phase 9 — Reviews, Wishlists & Real-Time Guest–Host Communication

StayScape Phase 9 introduces verified guest reviews with category ratings, wishlist management, real-time messaging via Socket.IO, and AI-powered review summarization.

### 1. Verified Guest Reviews & Ratings
- **Strict Eligibility Rule**: Reviews can only be submitted for bookings that are paid and confirmed, where the checkout date in UTC has elapsed, and where the guest has not already submitted a review.
- **Ratings System**: Overall rating (1–5) and category ratings (Cleanliness, Accuracy, Check-in, Communication, Location, Value).
- **Genuine Aggregation**: Property average ratings and review counts are aggregated directly from genuine PostgreSQL rows using batched `groupBy` queries to prevent N+1 query overhead.
- **Host Responses**: Verified hosts can publish responses to reviews for their listings.
- **Lifecycle Transition**: Stays transition to `COMPLETED` automatically via the BullMQ `BookingCompletionProcessor` or on-demand during checkout and review eligibility checks.

### 2. Wishlists & Saved Stays
- **Persistence**: Database-backed wishlist items with composite unique key `(userId, propertyId)` preventing duplicate entries.
- **Endpoints**:
  - `GET /api/v1/wishlist`: Paginated saved properties with real ratings and cover images.
  - `POST /api/v1/wishlist/:propertyId`: Add stay to wishlist (idempotent).
  - `DELETE /api/v1/wishlist/:propertyId`: Remove stay from wishlist.
  - `GET /api/v1/wishlist/:propertyId/status`: Check whether property is saved.

### 3. Real-Time Guest–Host Communication
- **Socket.IO Gateway**:
  - Authenticated via HTTP-only `stayscape_access` JWT cookie during handshake.
  - Room isolation by conversation (`conversation:${conversationId}`).
  - Redis ephemeral presence tracking (`presence:updated`).
  - Redis-based sliding window rate limiting (20 msg/min, 10 conversations/hour).
  - WebSocket Events:
    - Client to Server: `conversation:join`, `message:send`, `message:read`, `typing:start`, `typing:stop`.
    - Server to Client: `message:new`, `message:read`, `typing:started`, `typing:stopped`, `presence:updated`.
  - HTTP fallback: `POST /api/v1/messages/conversations/:id/messages` if connection is interrupted.
  - Deduplication via `(conversationId, senderUserId, clientMessageId)`.

### 4. AI Review Summarization (Groq)
- **Endpoint**: `GET /api/v1/ai/properties/:slug/review-summary`
- **Threshold**: Requires at least 3 published reviews; otherwise returns an informative prompt indicating more stays are needed before generating an AI summary.
- **Grounded Synthesis**: Powered by Groq's Llama 3 model with structured JSON outputs identifying overall sentiment, key positive highlights, and potential considerations.
- **Caching**: 30-minute Redis cache automatically invalidated upon review submission, edit, or host response.

---

## Phase 10 — Admin Dashboard, Moderation & Platform Management

StayScape Phase 10 delivers a secure, production-grade back-office operations console and platform management system.

### 1. Security & Admin Promotion
- **Dedicated Guard (`AdminGuard`)**: Validates the JWT cookie, verifies user existence in PostgreSQL, checks `role === 'ADMIN'`, verifies account status is `ACTIVE`, and verifies token version matching.
- **No Public Admin Registration**: Admin status can never be granted via public registration or self-service profile endpoints.
- **CLI Promotion Script**:
  ```bash
  # Promote an existing active user to ADMIN
  pnpm --filter @stayscape/api run admin:promote <email>

  # Promote with forced account activation
  pnpm --filter @stayscape/api run admin:promote <email> --force
  ```
  Every promotion writes an immutable security event to `AdminAuditLog`.

### 2. Moderation Workflow & Platform Visibility
- **Moderation Statuses**: `APPROVED`, `FLAGGED`, `REJECTED`.
- **Public Visibility Invariant**: A property is visible in search, public listings, calendar availability, booking reservation, and AI recommendations **only** if:
  `status = PUBLISHED` AND `moderationStatus = APPROVED` AND `hostProfile.status = ACTIVE`.
- **Moderation Actions**: Approving, flagging, or rejecting a property immediately invalidates public search caches, calendar availability caches, and AI context in Redis, while logging admin notes.

### 3. User & Host Oversight
- **User Management**: Search users by name/email, filter by role/status, inspect user details with booking and review history, and suspend or reactivate accounts. Suspending a user increments their `tokenVersion` to immediately invalidate all active JWT sessions.
- **Host Management**: Review host verification status, commission rate, bio, and property portfolio. Suspending a host automatically delists their properties from public search.

### 4. Reviews & Community Reporting
- **Review Moderation**: Admins can inspect flagged reviews, hide abusive reviews (`status = HIDDEN`), and restore them with required moderation reason logging.
- **Public Reporting API**: Authenticated guests can report listings or reviews directly from the UI (`POST /api/v1/reports`).
- **Reports Resolution**: Admins can triage open reports (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`) and attach resolution notes.

### 5. Financial & Booking Oversight
- **Booking Ledger**: Global search by booking reference, property, guest, or status with complete payment breakdowns, hold timers, and cancellation timelines.
- **Payments & Refunds**: Read-only ledger of captured Razorpay payments and refund records. Includes an operational retry action for failed refunds without allowing arbitrary payment generation.

### 6. AI Telemetry & Immutable Audit Logging
- **AI Usage Tracking**: Real-time telemetry logging token consumption, response latency, model identifiers, and feature breakdown (StayMatch, Property Assistant, Comparison, Itineraries, Review Summary) with fallback rate tracking.
- **Audit Logging**: Every administrative action automatically creates a structured, immutable `AdminAuditLog` record containing admin details, target entity, action verb, timestamp, IP address, user agent, and JSON diffs of before/after state.

---

## License

Proprietary — All rights reserved.
