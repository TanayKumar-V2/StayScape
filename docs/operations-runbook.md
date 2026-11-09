# Operations runbook

## Configuration inventory

| Variable                                                                                                | Purpose                                             | Secret?                                       |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| `NODE_ENV`, `PORT`                                                                                      | API runtime                                         | No                                            |
| `WEB_ORIGIN`, `WEB_ORIGINS`                                                                             | Browser allowlist                                   | No                                            |
| `TRUSTED_PROXIES`, `HSTS_ENABLED`, `HSTS_PRELOAD`                                                       | Proxy/IP and HTTPS behavior                         | No                                            |
| `DATABASE_URL`, `DIRECT_URL`                                                                            | Neon pooled runtime and direct migration connection | Yes                                           |
| `REDIS_URL`                                                                                             | Redis/BullMQ                                        | Yes when authenticated                        |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`                                                           | JWT signing                                         | Yes                                           |
| `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`                                                   | Token lifetimes                                     | No                                            |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                  | Image storage                                       | API secret is secret                          |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_SECRET_PREVIOUS` | Checkout/webhooks                                   | Key ID public-facing; remaining values secret |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_ENABLED`, `GROQ_TIMEOUT_MS`, `GROQ_MAX_RETRIES`                     | AI provider                                         | API key secret                                |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`                             | Browser configuration                               | Public                                        |

Production configuration validation rejects placeholder provider credentials, requires HTTPS origins and HSTS, and checks pooled/direct Neon URL separation. Verify the actual deployment values and reverse-proxy TLS behavior during Phase 12; no production credentials are stored in this repository.

## Startup and health

Install with `pnpm install --frozen-lockfile`; start local Redis using `docker compose up -d`; set API environment variables from a secure local/deployment secret store; run migrations with `pnpm --filter @stayscape/api prisma:migrate:deploy`; start API and web with `pnpm dev` for development. BullMQ processors are registered within the API process. Check `/api/v1/health/live` for process liveness and `/api/v1/health/ready` for PostgreSQL/Redis readiness.

## Common infrastructure issues

- **Database:** verify pooled `DATABASE_URL` at runtime and direct `DIRECT_URL` for migrations, database availability, TLS options, and migration status. Do not print connection strings in logs.
- **Redis:** verify authenticated URL and `PING`; cache reads have DB fallback, but selected sensitive limits fail closed with 503. Do not treat Redis as booking/payment truth.
- **Worker/BullMQ:** inspect failed/stalled jobs and queue connectivity; restart the API worker after confirming DB/Redis health. Completed webhook inbox rows are durable in PostgreSQL. For a `RECEIVED`/`FAILED` webhook with no job, re-enqueue its event ID using the existing idempotent processor workflow; do not delete the inbox row.
- **Webhook failure:** verify Razorpay dashboard delivery, endpoint reachability, raw-body middleware, webhook secret/version, and inbox event ID/status. Retry from Razorpay or re-enqueue persisted inbox event. Never mark payment captured manually.
- **Refund failure:** locate refund/payment transaction and provider refund ID; compare authoritative Razorpay state. Retry only through the admin retry action or reconciliation path; preserve idempotency keys.
- **Groq:** verify `GROQ_ENABLED`, model, key, rate/timeout errors; property search and booking do not depend on Groq. Do not log full prompts.
- **Cloudinary:** verify credentials, permitted formats, upload limits, and provider availability; do not expose the API secret. Failed upload responses are sanitized.
- **Common errors:** 401 means missing/expired/invalid session; 403 means origin/authorization restriction; 409 means dates/state conflict; 429 means endpoint limit; 503 can indicate Redis limit service or webhook queue retry condition.

## Incident procedures

- **Emergency account suspension:** use the protected admin user-suspension workflow with a documented reason; verify tokenVersion/session revocation and audit record. If admin access is unavailable, use a reviewed, audited database procedure with a second operator; do not edit audit rows.
- **Secret rotation:** create replacement secret in the secret manager, coordinate JWT invalidation/rollout, rotate Razorpay webhook secret with overlap via `RAZORPAY_WEBHOOK_SECRET_PREVIOUS`, update provider and deployment, verify health, then remove previous key. Rotate Cloudinary/Groq keys at provider and deploy; never write values into logs/issues.
- **Backup restoration:** use Neon console/account backup or point-in-time recovery only if enabled by the actual plan. Restore to a separate branch/database first, validate schema and sampled records, then follow the approved cutover procedure. This repository has no verified restore test; confirm plan capability and recovery objectives with Neon before relying on PITR.
- **Redis loss:** recreate Redis; PostgreSQL preserves bookings, payments, reviews, messages, and wishlist. Recreate recoverable jobs by scanning persisted pending state/inbox/refund records with the reconciliation workflows; inspect queues before manual replay to avoid duplicate external actions.
- **Cloudinary asset loss:** use provider backup/versioning capability if configured; database stores references but is not a binary backup. Confirm the account’s asset recovery settings.
