# StayScape — Production Monitoring, Observability & Alerting

This document outlines the monitoring architecture, health probes, operational metrics, logging standards, alert thresholds, and incident response procedures for StayScape.

---

## 1. Health Probes Architecture

StayScape provides separate liveness and readiness HTTP probes on the API:

### 1. Liveness Probe (`GET /api/v1/health/live`)
- **Purpose**: Verifies that the Node.js process is active and the event loop is responding.
- **Dependencies Checked**: **None** (Process-only). It does not fail if external AI or database services are intermittently slow or unavailable.
- **Expected Status**: `HTTP 200 OK`
- **Response**: `{"status": "ok", "service": "stayscape-api"}`

### 2. Readiness Probe (`GET /api/v1/health/ready`)
- **Purpose**: Verifies that all hard dependencies required to serve requests are operational.
- **Dependencies Checked**:
  - **Neon PostgreSQL**: Executes `SELECT 1` via `PrismaService`.
  - **Managed Redis**: Executes `PING` -> `PONG` via `RedisService`.
- **Expected Status**:
  - `HTTP 200 OK` if all checks pass.
  - `HTTP 503 Service Unavailable` if PostgreSQL or Redis is down.
- **Response Structure**:
  ```json
  {
    "status": "ok",
    "checks": {
      "database": "up",
      "redis": "up"
    }
  }
  ```
- **Platform Configuration**: Configured as Render's primary HTTP Health Check Path (`/api/v1/health/ready`). Unhealthy instances are automatically withheld from the load balancer routing pool.

---

## 2. Background Worker Operational Health

Because `stayscape-worker` is a background worker without an HTTP listening port, its operational health is monitored via:
1. **Heartbeat & Process Liveness**: Monitored by Render's native worker process supervisor. If the process crashes, Render restarts it automatically.
2. **BullMQ Queue Depletion & Backlog**: Redis metrics tracking pending, active, and failed jobs.
3. **Structured Worker Logs**: Every processed, completed, or failed job outputs structured logs with job ID, processing duration, and error category.

---

## 3. Metrics & Key Performance Indicators (KPIs)

| Metric | Target / SLA | Alert Threshold (Warning) | Alert Threshold (Critical) | Action Required |
|---|---|---|---|---|
| **API Availability** | 99.9% | < 99.5% over 15m | < 99.0% over 5m | Inspect Render service logs, database connection pool exhaustion. |
| **P95 Latency (Read)** | < 150ms | > 300ms over 10m | > 800ms over 5m | Inspect Redis cache hit ratio, Neon database CPU/active queries. |
| **P95 Latency (Write)**| < 350ms | > 600ms over 10m | > 1500ms over 5m | Check transaction locks, row-level locks on bookings. |
| **HTTP 5xx Error Rate**| < 0.1% | > 1% over 5m | > 5% over 2m | Inspect GlobalExceptionFilter logs, unhandled database errors. |
| **Database Pool Usage**| < 70% | > 80% capacity | > 95% capacity | Scale PgBouncer pool limits or inspect connection leak. |
| **Queue Backlog (Holds)**| 0 stalled | > 10 waiting > 5m | > 50 waiting > 5m | Verify worker process is running and Redis latency is normal. |
| **Failed Webhook Jobs** | 0 failures | > 3 failures in 10m | > 10 failures in 10m | Check Razorpay API reachability, inspect `payment-webhooks` queue. |
| **Failed Refund Jobs** | 0 failures | > 1 failure | > 5 failures | Investigate Razorpay balance or API credentials. |
| **Socket.IO Disconnects**| Normal turnover | > 15% unexpected drop | > 40% unexpected drop | Check server memory, reverse-proxy WebSocket timeout settings. |

---

## 4. Structured Logging Standards

All API and worker components use structured application logs with correlation IDs.

### Log Entry Format:
```json
{
  "timestamp": "2026-11-10T14:30:00.000Z",
  "level": "INFO",
  "service": "stayscape-api",
  "context": "BookingsService",
  "requestId": "req_a1b2c3d4e5",
  "route": "POST /api/v1/bookings/holds",
  "userId": "usr_998877",
  "durationMs": 42,
  "message": "Temporary hold created for property prop_123 (STY-20261110-889)"
}
```

### Sensitive Data Redaction Rules:
The following items **must never** appear in application logs, database logs, error traces, or APM telemetry:
1. Passwords or password hashes.
2. Plaintext JWT access tokens, refresh tokens, or bearer headers.
3. Razorpay Key Secrets, raw signatures, or webhook secrets.
4. Credit card numbers, CVVs, or bank account numbers.
5. Cloudinary API secrets.
6. Groq API keys or full private prompts.
7. Private chat messages or personal contact phone numbers.

---

## 5. Actionable Incident Runbooks

### Incident 1: High Webhook Failure Rate (`payment.captured`)
1. Check the `PaymentWebhookProcessor` logs for specific failure descriptions.
2. Verify that `RAZORPAY_WEBHOOK_SECRET` matches the secret in Razorpay Dashboard.
3. If queue processing failed, inspect `apps/api` database table `PaymentWebhookInbox`:
   - Query all rows with `status = 'RECEIVED'` or `'FAILED'`.
   - Run the manual reconciliation trigger:
     `POST /api/v1/admin/payments/reconcile` (or run payment reconciliation job).
4. Do not mark payments captured manually in database.

### Incident 2: Redis Connection Outage
1. In `GET /health/ready`, `redis: "down"` will be reported.
2. Check Render Key Value status in Render Dashboard.
3. If Redis was restarted or recreated:
   - Queues automatically re-initialize on worker startup.
   - Run the payment reconciliation sweep to recover any in-flight webhook jobs:
     ```bash
     pnpm --filter @stayscape/api run test:e2e
     ```
   - PostgreSQL retains authoritative booking and payment records.

### Incident 3: Groq AI Provider Outage
1. If Groq returns 429 or 503, `GroqService` catches the error and applies exponential backoff up to `GROQ_MAX_RETRIES`.
2. If all retries fail, AI endpoints return graceful fallback responses:
   - StayMatch falls back to standard destination and category filters.
   - Itineraries return structured template recommendations.
   - Review summaries return an informational notice without breaking the page.
3. **Core booking, payments, and messaging continue operating without disruption.**

