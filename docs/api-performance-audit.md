# API performance audit

## Findings

The code has Redis versioned caching for public property discovery and a graceful DB fallback; booking/payment decisions query PostgreSQL and do not use cache as authority. Discovery uses bounded pagination and database filters. AI provider calls have configurable timeout/retry settings. Request middleware emits correlation ID, route, status, and duration without query strings.

The Prisma service uses one Nest-managed PrismaClient and disconnects on shutdown. Readiness performs parallel lightweight database and Redis checks. No actual endpoint latency measurement, load test, query trace, or database plan could be collected without a disposable environment and representative data. Accordingly, before/after performance numbers are not claimed.

## Operational targets

Measure public discovery and detail, availability, booking history, messages, and admin metrics separately. Capture p50/p95/p99, DB query time, errors, and resource usage under controlled staging load. Exclude Groq and Razorpay latency from core API measurements. Keep payment verification and availability uncached/authoritative.

## Follow-up

Add request metrics aggregation and a bounded webhook inbox recovery process. Check Redis failure policy for each endpoint; current generic `RateLimitGuard` supports fail-closed per route while the message-service helper fails open. Only tune concurrency after staging measurements.
