# StayScape — Production Environment Variables Specification

This document provides a comprehensive inventory of all configuration keys and secrets required to operate **StayScape** in production and staging environments across Vercel and Render.

---

## 1. Summary of Services & Secrets

| Service | Hosting Platform | Config Method | Access / Visibility |
|---|---|---|---|
| **Frontend Web** | Vercel | Vercel Project Settings (Environment Variables) | Client-side public bundle (`NEXT_PUBLIC_*`) |
| **Backend API** | Render (Web Service) | Render Environment Variables / Blueprint | Server-side only (Encrypted at rest) |
| **Background Worker** | Render (Worker Service) | Render Environment Variables / Blueprint | Server-side only (Encrypted at rest) |
| **Database** | Neon | Render Environment Variables (`DATABASE_URL`, `DIRECT_URL`) | Server-side only |
| **Cache & Queue** | Render Key Value | Render Service link (`REDIS_URL`) | Internal private network |

---

## 2. Backend REST API Variables (`stayscape-api`)

These variables must be configured on the **Render Web Service** running `Dockerfile.api`.

| Variable | Scope | Type / Pattern | Required? | Description & Constraints |
|---|---|---|---|---|
| `NODE_ENV` | API Runtime | `production` | **Yes** | Runtime environment flag. Controls Swagger suppression, stack trace masking, and HSTS headers. |
| `APP_ENV` | Application Mode | `production` \| `staging` | **Yes** | `production` requires Razorpay Live Mode (`rzp_live_`); `staging` allows Test Mode (`rzp_test_`). |
| `PORT` | Networking | Integer (e.g. `4000`) | **Yes** | Port for Express/NestJS server to bind to `0.0.0.0`. Render sets this automatically. |
| `ENABLE_WORKERS` | Process Isolation | `false` | **Yes** | Must be set to `false` on the web service so API instances do NOT execute queue jobs. |
| `HSTS_ENABLED` | Security | `true` | **Yes** | Enforces `Strict-Transport-Security` header (`max-age=63072000; includeSubDomains; preload`). |
| `WEB_ORIGIN` | CORS & Security | URI (`https://...`) | **Yes** | Canonical frontend origin (e.g. `https://www.stayscape.example`). Used for CORS & CSRF origin checks. |
| `WEB_ORIGINS` | CORS & Security | Comma-separated URIs | No | Additional allowed origins, e.g. `https://stayscape.example,https://staging.stayscape.example`. |
| `COOKIE_DOMAIN` | Auth Cookies | Host string | **Yes** | Shared root domain (e.g. `.stayscape.example`) allowing cookies between `www` and `api` subdomains. |
| `COOKIE_SECURE` | Auth Cookies | `true` | **Yes** | Ensures cookies are transmitted solely over HTTPS. |
| `TRUSTED_PROXIES` | Security & Audit | `loopback` \| IP \| CIDR | **Yes** | Reverse proxies trusted to provide `X-Forwarded-For` for IP audit logging and rate limiting. |
| `DATABASE_URL` | Database | PostgreSQL URI | **Yes** | **Pooled Neon connection** with `-pooler.` hostname for PgBouncer connection sharing. |
| `DIRECT_URL` | Database | PostgreSQL URI | **Yes** | **Direct Neon connection** WITHOUT `-pooler.` hostname for Prisma migration deployments. |
| `REDIS_URL` | Cache & Queues | Redis URI (`rediss://...`) | **Yes** | Private connection string to managed Redis instance. In Render, use internal connection string. |
| `ACCESS_TOKEN_SECRET` | Authentication | String (min 32 chars) | **Yes** | High-entropy secret for signing short-lived (15m) access JWTs. |
| `REFRESH_TOKEN_SECRET`| Authentication | String (min 32 chars) | **Yes** | High-entropy secret for signing long-lived (7d) refresh JWTs. |
| `ACCESS_TOKEN_EXPIRES_IN` | Authentication | Time string (e.g. `15m`)| No | Access token expiration. Default: `15m`. |
| `REFRESH_TOKEN_EXPIRES_IN`| Authentication | Time string (e.g. `7d`)| No | Refresh token expiration. Default: `7d`. |
| `CLOUDINARY_CLOUD_NAME` | Storage | String | **Yes** | Cloudinary cloud account name. |
| `CLOUDINARY_API_KEY` | Storage | String | **Yes** | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Storage | String (Secret) | **Yes** | Cloudinary API Secret. Never expose to client. |
| `RAZORPAY_KEY_ID` | Payments | `rzp_live_*` (or `rzp_test_*` in staging) | **Yes** | Razorpay Key ID. Must match live format in production. |
| `RAZORPAY_KEY_SECRET` | Payments | String (min 32 chars) | **Yes** | Razorpay Key Secret. Used for order creation and HMAC verification. |
| `RAZORPAY_WEBHOOK_SECRET` | Payments | String (min 32 chars) | **Yes** | Secret configured in Razorpay Dashboard for raw HMAC webhook signature verification. |
| `RAZORPAY_WEBHOOK_SECRET_PREVIOUS` | Payments | String | No | Optional previous webhook secret during zero-downtime webhook secret rotation. |
| `GROQ_API_KEY` | AI Engine | String (`gsk_*`) | **Yes** | Groq production API Key for inference calls. |
| `GROQ_MODEL` | AI Engine | Model ID string | No | Default: `openai/gpt-oss-20b` or `llama-3.3-70b-versatile`. |
| `GROQ_ENABLED` | AI Engine | `true` \| `false` | No | Enables/disables Groq AI features. Default: `true`. |
| `GROQ_TIMEOUT_MS` | AI Engine | Integer (ms) | No | AI request timeout (1000–60000ms). Default: `15000`. |
| `GROQ_MAX_RETRIES` | AI Engine | Integer (0–5) | No | Bounded retry attempts for rate limits. Default: `1`. |

---

## 3. Background Worker Variables (`stayscape-worker`)

These variables must be configured on the **Render Background Worker Service** running `Dockerfile.worker`.
The worker process receives **only** the variables required for background tasks and does NOT accept HTTP traffic.

| Variable | Scope | Type / Value | Required? | Purpose |
|---|---|---|---|---|
| `NODE_ENV` | Runtime | `production` | **Yes** | Production runtime optimizations. |
| `APP_ENV` | Application Mode | `production` \| `staging` | **Yes** | Environment parity with API. |
| `ENABLE_WORKERS` | Worker Activation | `true` | **Yes** | **Activates BullMQ queue listeners** in this process. |
| `DATABASE_URL` | Database | PostgreSQL URI (`-pooler.`) | **Yes** | Database reads and state updates for booking holds, reconciliation, and audit logs. |
| `DIRECT_URL` | Database | PostgreSQL URI | **Yes** | Direct connection fallback. |
| `REDIS_URL` | Queue Connectivity | Redis URI | **Yes** | Connects to BullMQ job queues (internal private network). |
| `ACCESS_TOKEN_SECRET` | Encryption | String | **Yes** | Referenced by shared services. |
| `REFRESH_TOKEN_SECRET`| Encryption | String | **Yes** | Referenced by shared services. |
| `RAZORPAY_KEY_ID` | Payments | String | **Yes** | Used by `PaymentReconciliationProcessor` and `PaymentRefundProcessor`. |
| `RAZORPAY_KEY_SECRET` | Payments | String | **Yes** | Required for executing refund API requests and reconciliation calls. |
| `RAZORPAY_WEBHOOK_SECRET` | Payments | String | **Yes** | Required for asynchronous webhook event processing. |
| `GROQ_API_KEY` | AI Engine | String | **Yes** | Required if AI jobs run asynchronously. |
| `GROQ_MODEL` | AI Engine | String | No | Model identifier. Default: `openai/gpt-oss-20b`. |
| `GROQ_ENABLED` | AI Engine | `true` | No | Enables AI features in background tasks. |

---

## 4. Frontend Web Variables (`apps/web` on Vercel)

These variables are defined in the **Vercel Project Settings** under **Environment Variables**.
**Security Rule**: Only variables prefixed with `NEXT_PUBLIC_` are accessible in browser bundles. Never place private keys or secrets here.

| Variable | Scope | Target / Value | Required? | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public Client | `https://www.YOUR_DOMAIN` | **Yes** | Canonical web URL of the frontend application. |
| `NEXT_PUBLIC_API_URL` | Public Client | `https://api.YOUR_DOMAIN/api/v1` | **Yes** | Base endpoint for browser fetch API requests. |
| `NEXT_PUBLIC_SOCKET_URL`| Public Client | `https://api.YOUR_DOMAIN` | **Yes** | Root origin for real-time WebSocket / Socket.IO connections. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public Client | `rzp_live_*` (or `rzp_test_*` in staging) | **Yes** | Public key identifier used by the Razorpay Checkout modal in the browser. |

---

## 5. Security & Verification Rules

1. **No Committed Secrets**: Never commit `.env`, `.env.production`, or actual API keys to Git.
2. **Key ID & Secret Separation**: `RAZORPAY_KEY_ID` is public-facing; `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are strictly server-side.
3. **Database URL Separation**: `DATABASE_URL` uses Neon pooled endpoint for connection management; `DIRECT_URL` is direct for DDL schema migrations.
4. **Zero Public Redis Exposure**: `REDIS_URL` must use Render's private internal network (`.render.internal` or private IP) with zero external port exposure.

