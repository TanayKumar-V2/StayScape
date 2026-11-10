# StayScape — Disaster Recovery & Business Continuity Plan

This plan outlines the recovery objectives, database restore workflows, data reconciliation procedures, and failover steps to restore StayScape in the event of an outage or data corruption.

---

## 1. Recovery Objectives (RPO & RTO)

| Service Layer | Recovery Point Objective (RPO) | Recovery Time Objective (RTO) | Primary Backup Mechanism |
|---|---|---|---|
| **Neon PostgreSQL** | < 1 minute (PITR) / < 24h (Snapshot) | < 30 minutes | Neon Continuous WAL Archiving & Point-In-Time Recovery (PITR) |
| **Managed Redis** | Ephemeral / Re-creatable | < 15 minutes | Managed Redis snapshot (`appendonly yes`) + Database state rebuild |
| **Cloudinary Media** | 0 data loss | Immediate (CDN) | Cloudinary Asset Versioning & Redundant Cloud Storage |
| **API & Worker Services** | 0 data loss | < 10 minutes | Immutable Git commits & Multi-stage Docker registry images |

---

## 2. Neon Database Backup & Point-in-Time Recovery (PITR)

### Architecture:
Neon continuously archives write-ahead logs (WAL) to cold storage, enabling point-in-time recovery to any second within the retention window (dependent on your Neon project plan, typically 7–30 days).

### Restoration Procedure:
1. **Assess Incident Time**: Determine the exact UTC timestamp ($T_0 - \Delta t$) immediately preceding the corruption, accidental deletion, or faulty migration.
2. **Branch Restoration (Non-Destructive)**:
   - In the [Neon Console](https://console.neon.tech), navigate to **Branches**.
   - Click **Create Branch**.
   - Choose **Restore from Point in Time**.
   - Set the branch parent to `production` and specify the exact UTC timestamp.
   - Name the new branch: `recovery-YYYYMMDD-HHMM`.
3. **Verify Restored Data**:
   - Connect via `psql` to the recovery branch:
     ```sql
     SELECT count(*) FROM "Booking";
     SELECT count(*) FROM "PaymentTransaction";
     SELECT count(*) FROM "User";
     ```
   - Confirm critical tables and records are intact.
4. **Cutover to Restored Database**:
   - In Render Web Service & Background Worker settings, update `DATABASE_URL` and `DIRECT_URL` with the connection strings for the verified recovery branch.
   - Trigger a manual deployment.
   - Verify readiness: `GET /api/v1/health/ready` returns `HTTP 200`.

---

## 3. Data Reconciliation After Database Recovery

When restoring a database from a snapshot or earlier point in time, external financial transactions may have occurred during the recovery delta. StayScape's payment reconciliation engine reconciles external truth with PostgreSQL:

### Razorpay Payment & Webhook Reconciliation:
1. **Replay Missing Webhooks**:
   - In [Razorpay Dashboard](https://dashboard.razorpay.com), go to **Settings** -> **Webhooks**.
   - Inspect failed deliveries and click **Resend** for the affected timeframe.
   - Every webhook is delivered with an idempotent `event_id` and verified via HMAC before ingestion.
2. **Execute Reconciliation Sweep**:
   - Trigger the payment reconciliation processor to query Razorpay's authoritative API:
     ```bash
     # In Render API container shell or via authenticated admin endpoint:
     pnpm --filter @stayscape/api exec node -e "
       const { Queue } = require('bullmq');
       const q = new Queue('payment-reconciliation', { connection: { host: process.env.REDIS_HOST, port: 6379 } });
       q.add('manual-disaster-recovery-sweep', { checkWindowMinutes: 1440, checkRefundRecoveries: true });
     "
     ```
   - For every unresolved booking created in the last 24 hours, the processor verifies payment status with Razorpay.
   - Any captured payment confirmed on Razorpay transitions the booking to `CONFIRMED` or schedules a compensation refund if the stay dates were lost.

---

## 4. Redis Loss & Recovery

**Core Safety Principle**: Redis is **never** the single source of truth for durable business data. PostgreSQL holds authoritative state for all bookings, payments, users, properties, reviews, and messages.

### Redis Failover Workflow:
1. **Provision Replacement Redis**:
   - If Render Key Value fails, provision a replacement instance or re-deploy.
   - Update `REDIS_URL` on `stayscape-api` and `stayscape-worker`.
2. **Automatic Queue Re-initialization**:
   - As soon as `stayscape-worker` boots, `WorkerSchedulerService` automatically re-registers singleton repeatable job schedulers.
   - BullMQ creates the necessary keys in the new Redis instance.
3. **Cache Rebuilding**:
   - Public property search and availability calendar queries automatically fall back to PostgreSQL on cache miss and repopulate Redis on demand (30s TTL).

---

## 5. Cloudinary Media Asset Recovery

Property photographs and listing galleries are stored in Cloudinary's multi-region storage:
1. PostgreSQL stores only URLs, public IDs, and metadata — never binary blobs.
2. If an image is accidentally deleted from a listing in StayScape, the asset remains in Cloudinary's backup recycle bin for 30 days (if enabled in Cloudinary Settings).
3. If Cloudinary suffers a localized outage, the frontend gracefully falls back to local placeholder images (`/images/placeholder.jpg`) without breaking page layout.

