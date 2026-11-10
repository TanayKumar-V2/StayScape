# StayScape — Production Rollback Procedure

This runbook defines the emergency rollback procedures for frontend web deployments, backend API web services, background workers, and PostgreSQL database schemas.

---

## 1. Rollback Authority & Trigger Criteria

A rollback must be initiated immediately upon detecting:
1. **Critical Authentication Failure**: Users unable to log in, refresh tokens, or valid sessions being invalidated.
2. **Payment Processing Breakdown**: Inability to generate Razorpay orders, capture payments, or complete webhook signatures.
3. **Double-Booking / State Inconsistency**: Bookings confirmed without corresponding payment capture or overlapping holds granted.
4. **Elevated Crash Rate**: API HTTP 5xx error rate > 5% over 5 minutes.
5. **Database Deadlock / Performance Saturation**: Connection pool exhaustion or query lock contention locking booking transactions.

---

## 2. Frontend Rollback Procedure (Vercel)

Vercel stores immutable build artifacts for every deployment. Rolling back the frontend takes less than 60 seconds and does not require rebuilding code.

### Step-by-Step Instructions:
1. Open the [Vercel Dashboard](https://vercel.com).
2. Select the **StayScape** project.
3. Go to the **Deployments** tab.
4. Locate the last known healthy production deployment.
5. Click the three dots menu (`...`) on that deployment and select **Instant Rollback**.
6. Confirm the rollback dialog.
7. Vercel instantly routes edge traffic to the selected deployment.
8. Verify the homepage (`https://www.YOUR_DOMAIN`) and login page (`https://www.YOUR_DOMAIN/login`).

---

## 3. Backend REST API Rollback Procedure (Render)

Render supports redeploying previous Git commits or container tags.

### Step-by-Step Instructions:
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select the **`stayscape-api`** web service.
3. Go to the **Events** tab.
4. Find the last successful deploy event prior to the faulty release.
5. Click **Roll back to this deploy** (or click **Manual Deploy** -> **Deploy a specific commit**).
6. Render builds or pulls the specified image and performs a zero-downtime rolling update.
7. Monitor the deployment logs until the health check passes:
   ```
   GET /api/v1/health/ready -> HTTP 200 OK
   ```

---

## 4. Background Worker Rollback Procedure (Render)

**Version Coordination Rule**: The background worker process (`stayscape-worker`) must be rolled back concurrently with the API (`stayscape-api`) to prevent worker/API payload format mismatches in BullMQ.

### Step-by-Step Instructions:
1. In Render Dashboard, select **`stayscape-worker`**.
2. Go to **Events** -> Select the identical healthy commit rolled back on the API.
3. Click **Roll back to this deploy**.
4. Confirm worker startup logs in Render console:
   ```
   [WorkerBootstrap] StayScape Background Worker successfully started and listening for BullMQ jobs.
   ```
5. Inspect the BullMQ queues in Redis to confirm pending jobs are being consumed.

---

## 5. Database Schema & Migration Rollback Policy

### The Golden Rule of Database Rollback:
> **NEVER run `prisma migrate reset` or drop columns in production.**
> Reversing a migration with `DROP TABLE` or `DROP COLUMN` permanently destroys user customer data and payment audit history.

### Backward-Compatible Migration Principle:
All StayScape migrations use the **Expand-and-Contract** pattern:
- **Phase 1 (Expand)**: New columns, indexes, and tables are added as nullable or with defaults. The previous application version remains fully compatible.
- **Phase 2 (Release)**: Deploy new application code that writes to the new schema.
- **Phase 3 (Contract)**: After the release is validated and the rollback window has closed, old unused columns may be deprecated in a future migration.

### Handling a Faulty Migration:
If a migration fails during release:
1. **Scenario A: Application has not been deployed yet**
   - The old application is still running against the expanded schema. Since the migration was backward-compatible, **do not roll back the schema**. Keep the old application running.
   - Author a forward fix in a new migration file (e.g. `20261110_fix_constraint.sql`) and deploy forward.
2. **Scenario B: Data corruption occurred**
   - Follow the **Point-In-Time Recovery (PITR)** procedure in `docs/disaster-recovery.md` to restore a clean branch from the timestamp immediately prior to the migration.
   - Re-point Render connection strings to the recovered database branch.

---

## 6. Post-Rollback Verification Checklist

Immediately following any rollback, execute the automated smoke test suite:

```bash
pnpm smoke-test --api-url https://api.YOUR_DOMAIN/api/v1 --web-url https://www.YOUR_DOMAIN
```

Confirm that:
- [ ] API readiness probe returns `HTTP 200`.
- [ ] Public listings search loads properties.
- [ ] User login and session cookies function.
- [ ] Razorpay webhook endpoint correctly enforces HMAC verification.
- [ ] Background worker processes hold expirations.
- [ ] An incident report is opened documenting root cause and lessons learned.

