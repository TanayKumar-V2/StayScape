# StayScape — Production Deployment Guide

This guide provides exhaustive, step-by-step instructions for deploying and launching **StayScape** across Vercel, Render, Neon, Cloudinary, Razorpay, and Groq.

---

## 1. Prerequisites & Account Setup

Ensure you have administrative access to:
- [GitHub](https://github.com) (Repository owner/admin)
- [Vercel](https://vercel.com) (Frontend hosting)
- [Render](https://render.com) (API, Background Worker, Managed Redis)
- [Neon](https://neon.tech) (PostgreSQL database)
- [Razorpay Dashboard](https://dashboard.razorpay.com) (Live Mode credentials and webhooks)
- [Cloudinary Console](https://cloudinary.com) (Media storage)
- [Groq Console](https://console.groq.com) (AI Inference API)
- [DNS Registrar](https://hostinger.com) (Hostinger, Cloudflare, Namecheap, etc.)

---

## 2. Neon Database Configuration

StayScape requires two connection strings from Neon:
1. **Pooled Connection URL (`DATABASE_URL`)**: Uses PgBouncer (`-pooler.`) for runtime queries from API and Worker instances.
2. **Direct Connection URL (`DIRECT_URL`)**: Connects directly to the PostgreSQL engine (without `-pooler.`) for executing Prisma migrations and schema locks.

### Step-by-Step Neon Setup:
1. Log into the [Neon Console](https://console.neon.tech).
2. Create or select the `StayScape` project.
3. Create two branches:
   - `production` (Default branch)
   - `staging` (Disposable / staging branch)
4. Under `Connection Details`:
   - Select **Connection pooling: ON** -> Copy this string as `DATABASE_URL`.
   - Select **Connection pooling: OFF** -> Copy this string as `DIRECT_URL`.
5. Ensure SSL is enabled (`sslmode=require`).

---

## 3. Render Infrastructure Setup (Blueprint / Manual)

### Option A: Automated Provisioning via `render.yaml`
1. Connect your GitHub repository to Render.
2. Navigate to **Blueprints** -> **New Blueprint Instance**.
3. Select the StayScape repository. Render reads `render.yaml` and auto-provisions:
   - `stayscape-api` (Web Service, Docker)
   - `stayscape-worker` (Background Worker, Docker)
   - `stayscape-redis` (Key Value Redis instance, private networking)
4. Populate the requested secret variables when prompted.

### Option B: Manual Service Creation

#### 1. Managed Redis (Render Key Value):
- Click **New** -> **Redis**.
- Name: `stayscape-redis`.
- Region: `Oregon` (or match your database/API region).
- IP Allow List: Leave empty (private access only).
- Maxmemory Policy: `noeviction` (crucial for BullMQ job queue durability).
- Copy the **Internal Redis URL** (`redis://...:6379`).

#### 2. NestJS REST API (Web Service):
- Click **New** -> **Web Service**.
- Build from Git Repository: Select StayScape.
- Runtime: **Docker**.
- Dockerfile Path: `./Dockerfile.api`.
- Docker Build Context: `.`.
- Health Check Path: `/api/v1/health/ready`.
- Auto-Deploy: **No** (Controlled CI/CD deployment).
- Environment Variables: Enter the variables listed in `docs/production-environment-variables.md`.

#### 3. Background Worker (Background Worker Service):
- Click **New** -> **Background Worker**.
- Runtime: **Docker**.
- Dockerfile Path: `./Dockerfile.worker`.
- Docker Build Context: `.`.
- Environment Variables:
  - `NODE_ENV=production`
  - `APP_ENV=production`
  - `ENABLE_WORKERS=true`
  - `DATABASE_URL` (Neon pooled URL)
  - `DIRECT_URL` (Neon direct URL)
  - `REDIS_URL` (Internal Redis URL)
  - Plus Razorpay, Groq, and JWT secrets.

---

## 4. Vercel Frontend Deployment

StayScape's frontend is an optimized Next.js 15 App Router application in `apps/web`.

### Setup in Vercel Dashboard:
1. Log into [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Import the `StayScape` GitHub repository.
3. Configure the Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm run build`
   - **Install Command**: `pnpm install`
   - **Output Directory**: `.next`
4. Add Environment Variables:
   ```env
   NEXT_PUBLIC_APP_URL=https://www.YOUR_DOMAIN
   NEXT_PUBLIC_API_URL=https://api.YOUR_DOMAIN/api/v1
   NEXT_PUBLIC_SOCKET_URL=https://api.YOUR_DOMAIN
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
   ```
5. Click **Deploy**.

---

## 5. Domain, DNS & HTTPS Configuration

StayScape uses a unified subdomain architecture sharing a parent registrable domain:
- Frontend: `https://www.YOUR_DOMAIN`
- Root Domain: `https://YOUR_DOMAIN` (Redirects to `www`)
- Backend API: `https://api.YOUR_DOMAIN`
- Socket.IO: `https://api.YOUR_DOMAIN`

### DNS Records Table (e.g. at Hostinger / Cloudflare / Route53):

| Type | Name / Host | Target / Value | Proxy / TTL | Purpose |
|---|---|---|---|---|
| **CNAME** | `www` | `cname.vercel-dns.com` | DNS only / 300s | Frontend production application |
| **A** | `@` | `76.76.21.21` | DNS only / 300s | Apex root domain (Vercel redirect) |
| **CNAME** | `api` | `stayscape-api.onrender.com` | DNS only / 300s | Backend REST API & Socket.IO |
| **CNAME** | `staging` | `cname.vercel-dns.com` | DNS only / 300s | Staging frontend |
| **CNAME** | `api-staging` | `stayscape-api-staging.onrender.com` | DNS only / 300s | Staging backend API |

### Hostinger DNS Setup Walkthrough:
1. Log into your **Hostinger Control Panel** (hPanel).
2. Go to **Domains** -> Select your domain -> **DNS / Nameservers**.
3. Under **Manage DNS records**:
   - Add CNAME: Name `www`, Points to `cname.vercel-dns.com`, TTL `300`.
   - Add CNAME: Name `api`, Points to your Render service address (`stayscape-api.onrender.com`), TTL `300`.
   - Update A record `@`: Points to `76.76.21.21` (Vercel IP).
4. Wait 5–15 minutes for worldwide DNS propagation. Both Vercel and Render automatically provision free Let's Encrypt SSL/TLS certificates.

---

## 6. Cookie & Subdomain Authentication

Authentication uses HTTP-only JWT cookies (`stayscape_access` and `stayscape_refresh`).
For cookies to be securely sent across both the frontend (`www.YOUR_DOMAIN`) and API (`api.YOUR_DOMAIN`):
1. Configure in Render API environment variables:
   ```env
   COOKIE_DOMAIN=.YOUR_DOMAIN
   COOKIE_SECURE=true
   WEB_ORIGIN=https://www.YOUR_DOMAIN
   ```
2. The leading dot (`.YOUR_DOMAIN`) enables the browser to transmit cookies across all subdomains.
3. `SameSite=Lax` and `HttpOnly=true` protect against CSRF and XSS token exfiltration.

---

## 7. Razorpay Live Mode & Webhook Configuration

### Step-by-Step Payment Setup:
1. Log into [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Toggle the switch at top from **Test Mode** to **Live Mode**.
3. Go to **Settings** -> **API Keys** -> **Generate New Key**.
   - Copy **Key ID** (`rzp_live_...`) -> Add to Vercel and Render environments.
   - Copy **Key Secret** -> Add to Render `RAZORPAY_KEY_SECRET`.
4. Go to **Settings** -> **Webhooks** -> **Add New Webhook**:
   - Webhook URL: `https://api.YOUR_DOMAIN/api/v1/webhooks/razorpay`
   - Secret: Generate a random string of at least 32 characters (e.g. `openssl rand -hex 24`). Add this to Render `RAZORPAY_WEBHOOK_SECRET`.
   - Active Events:
     - `payment.captured`
     - `payment.failed`
     - `refund.processed`
     - `refund.failed`
5. Save Webhook.

---

## 8. Cloudinary Media Storage Setup

1. Log into [Cloudinary Console](https://console.cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret**.
3. Add these credentials to Render API environment variables:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Verify Next.js image domain configuration:
   `apps/web/next.config.ts` includes `res.cloudinary.com` in `remotePatterns`.

---

## 9. Groq AI Engine Setup

1. Log into [Groq Console](https://console.groq.com/keys).
2. Create an API Key.
3. Configure in Render API environment variables:
   ```env
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-20b
   GROQ_ENABLED=true
   ```

---

## 10. Database Migration Release Procedure

Always deploy migrations **before** deploying new application versions:

```bash
# 1. Verify schema validity
pnpm --filter @stayscape/api prisma:validate

# 2. Deploy migrations to production database (uses DIRECT_URL)
pnpm --filter @stayscape/api prisma:migrate:deploy

# 3. Seed standard amenities catalogue (safe, idempotent, no dummy data)
pnpm --filter @stayscape/api run prisma:seed:prod
```

---

## 11. Secure Administrator Bootstrapping

StayScape strictly forbids public administrator registration. Provision the first administrator via the CLI:

```bash
# In the Render API shell or local administrative terminal connected to production DB:
pnpm --filter @stayscape/api run admin:promote admin@yourdomain.com --force
```

This updates the user's role to `ADMIN`, confirms account activation, and logs an immutable audit event in `AdminAuditLog`.

---

## 12. Automated Smoke Testing

Run the automated smoke test suite to verify the deployment:

```bash
pnpm smoke-test --api-url https://api.YOUR_DOMAIN/api/v1 --web-url https://www.YOUR_DOMAIN
```

