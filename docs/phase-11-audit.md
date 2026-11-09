# Phase 11 audit

## Scope inspected

Inspected the Next.js App Router pages, auth context and API client, property discovery/detail and image/map components, host and admin routes, booking/payment pages, StayMatch, reviews, wishlist, and messaging UI. Inspected NestJS modules/controllers/services for auth, users, hosts, properties, uploads, availability, bookings, Razorpay/webhooks/refunds, workers, Socket.IO, reviews, wishlist, admin, AI/Groq, Redis, health, and error handling. Reviewed Prisma schema/migrations, Docker Compose, workspace scripts, env examples, and existing unit/API E2E specs.

## Findings and work

- **HIGH — webhook queue failure acknowledged as success.** The inbox row was durable, but queue failure was swallowed and returned an HTTP success, removing the provider retry signal. Changed the endpoint to return a sanitized 503 after inbox persistence; delivery retry enqueues the idempotent event. Added a regression test.
- **HIGH — reconstructed webhook bytes accepted as signature input.** The controller fell back to JSON serialization when rawBody was absent. This is not the exact signed representation. The fallback is removed; missing raw bytes are rejected by the service.
- **MEDIUM — JWT algorithm/claim validation depended on library defaults.** Access and refresh JWTs are now explicitly HS256; refresh and Socket.IO claims are validated, and socket tokens must be access tokens with an unexpired `exp`.
- **MEDIUM — provider error details could reach clients.** Razorpay methods now return generic client errors while keeping diagnostic details in server logs.
- **LOW — request logs included query strings despite the privacy comment.** Access logs now use the route/path without query parameters. Caller request IDs are restricted to safe printable identifier characters.
- **LOW — map tiles were omitted from frontend CSP image origins.** OpenStreetMap tile hosts are allowed for the existing Leaflet maps.
- **HIGH — production could start with mock Razorpay defaults and local service defaults.** Production configuration now requires an HTTPS web origin and preview origins, enabled HSTS, Neon pooled runtime/direct migration URL separation, configured Cloudinary, non-local Redis, a live-mode Razorpay key ID, and non-placeholder secrets. Local/test placeholders remain supported. Added configuration validation tests.
- **CRITICAL/HIGH — production dependency audit found 4 critical and 19 high advisories before remediation.** Next.js was upgraded to 15.5.29; compatible patched overrides were applied for Multer 2.5.0, PostCSS 8.5.32, and Sharp 0.35.5. A high-severity Prisma transitive advisory was fixed with `deepmerge-ts` 8.0.0. Subsequent production audit reported no known vulnerabilities; full-tree audit reports one low and two moderate development dependency advisories.

## Security review results

JWT access lifetime defaults to 15 minutes; refresh lifetime defaults to seven days. Tokens are stored by SHA-256 hash, rotation uses conditional update and transaction, and access checks load current account status/tokenVersion from PostgreSQL. Auth DTO validation is global and rejects unknown properties. Admin routes use JWT plus a database-backed AdminGuard. Host property mutations use current host identity and property ownership lookup. Public property serializers deliberately omit address and contact data. Message services check participant membership; Socket.IO verifies membership before joining and persists before broadcast. Payment verification checks signatures and routes callback/webhook/reconciliation through one transactional service. Upload routes cap ten files at 10 MiB each and validate JPEG/PNG/WebP/AVIF signatures.

No arbitrary server-side URL-fetching feature was found in the inspected code; SSRF through a user-controlled fetch target was not evidenced. No unsafe HTML rendering (`dangerouslySetInnerHTML`) was found in the frontend scan. Raw SQL sites use Prisma tagged-template calls in inspected booking paths. These are code review observations, not penetration-test certification.

## Performance and testing gaps

Schema indexes cover major foreign keys, status/date queries, unique lookup keys, and property search fields. Caches for public property reads and availability fall back to PostgreSQL. No representative dataset or dedicated database was supplied, so EXPLAIN ANALYZE, true concurrent booking integration, and latency/load measurements were not run. API unit tests passed: 37 suites / 196 tests; three targeted suites passed again with 14 tests after final auth/config changes. API E2E specs require PostgreSQL/Redis and could not run because Windows denied local Docker port binds. No frontend test runner, browser test suite, or accessibility scanner is configured. No k6 scenario is present. No verified production bundle analyzer is configured.

## Reliability observations

Booking holds use a PostgreSQL row lock and half-open `[checkIn, checkOut)` logic; migrations include a PostgreSQL exclusion constraint. Redis is used for rate limiting/cache/presence and is not the booking source of truth. Webhook inbox records are stored before queue dispatch. Queue recovery is still operationally manual when enqueue fails; provider retries are now requested via 503, but there is no transactional outbox relay. `health/ready` checks PostgreSQL and Redis; liveness is process-only. The current health response exposes only up/down state.

## Unresolved issues

- **MEDIUM — frontend CSP permits `unsafe-inline` for scripts and styles.** Existing Next hydration and Razorpay integration work with this policy; a nonce-based policy requires a production-like Next runtime test and is deferred. Current CSP is not a strict XSS defense.
- **MEDIUM — image dimension/decompression bounds are not enforced in application code.** Byte/file-count limits and signatures exist; add a decoder-based dimension cap before considering uploads production-hardened.
- **MEDIUM — resource protection is uneven.** Several operations use Redis-backed limits, while message service limits fail open and public mutation endpoints require endpoint-by-endpoint review. Do a complete route inventory and enforce consistent limits for registration, listing creation/upload, and AI/chat flows.
- **MEDIUM — webhook inbox recovery is not automatic.** Persisted RECEIVED/FAILED events can be inspected and retried; add an operational recovery command or bounded queue sweeper.
- **MEDIUM — current tests do not prove real PostgreSQL lock/exclusion behavior or browser authorization journeys.** Dedicated disposable infrastructure and E2E credentials are needed.
- **LOW — Prisma schema/migrations and indexes were reviewed statically only; query plans and index write overhead are unmeasured.**
- **LOW — repository-wide Prettier check reports 98 pre-existing files out of format.** CI is scoped to formatting checks for Phase 11 touched files; formatting the whole application was intentionally avoided during this hardening pass.
- **LOW — source lint passes with 37 warnings (20 API, 17 web).** API lint rules for unsafe legacy casts/returns and several type assertions are visible as warnings to keep CI usable; the backlog includes admin JSON handling, Express request typing, and React effect dependencies.

## Production readiness

**NOT READY FOR PRODUCTION** despite remediation of audited critical/high dependency issues and production configuration checks. PostgreSQL-backed concurrency/E2E and browser verification remain unavailable, Prisma client regeneration failed because Windows denied replacing a locked query-engine DLL (also failed when elevated), 37 lint warnings remain, secret scanning has not run because Gitleaks is unavailable, and no load/accessibility measurements exist. No production deployment or customer data was touched.

## Phase 12 recommendations

1. Make production startup fail when provider keys are placeholders and ensure mock provider paths are test-only.
2. Run migrations and API integration/E2E suites against a disposable Postgres 16 + Redis environment; add a two-client overlapping booking race test.
3. Add Next.js nonce-based CSP and verify checkout, maps, hydration, and Socket.IO in a production build.
4. Add image decoder dimension limits, endpoint-specific abuse limits, and recoverable webhook/refund reconciliation procedures.
5. Run dependency and secret scans, bundle analysis, Lighthouse lab measurements, axe scans, and k6 against staging; record results before deployment approval.
