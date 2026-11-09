# Production readiness checklist

Status: **NOT READY FOR PRODUCTION** based on this Phase 11 evidence.

- [ ] Replace local/test secrets with generated deployment secrets; do not commit them.
- [x] Production startup rejects placeholder Razorpay credentials and requires live-mode configuration; still verify test/live key separation and webhook secret in the deployment environment.
- [ ] Configure HTTPS, production HTTPS origin allowlist, `HSTS_ENABLED=true`, trusted proxy IP/CIDR list, Neon pooled runtime hostname (`-pooler`) and direct migration URL, Cloudinary credentials, and production Redis URL.
- [ ] Run Prisma migrations on a disposable/staging database and test rollback/recovery procedure.
- [ ] Run unit, E2E, authorization, payment mock, and concurrent booking tests against isolated Postgres/Redis.
- [ ] Run a dedicated secret scan and resolve remaining low/moderate development dependency advisories; production dependencies currently have no known critical/high findings.
- [ ] Verify webhook delivery, retries, inbox recovery, refund reconciliation, and worker shutdown in Razorpay test mode.
- [ ] Run staging load test, Lighthouse lab checks, axe scans, and production bundle analysis; publish actual measurements.
- [ ] Validate CSP, Cloudinary upload pixel limits, logs/redaction, health probes, backups/PITR plan, and incident contacts.
- [ ] Complete operations handover and explicit deployment approval in Phase 12.

Environment inventory is in `operations-runbook.md`; values are secret-managed at deploy time, never committed here.
