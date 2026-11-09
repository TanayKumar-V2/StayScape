# Database performance audit

## Reviewed

Reviewed Prisma schema and migrations through `20261109030000_admin_moderation_platform`, service query patterns for discovery/detail, availability, bookings, payments, reviews, wishlist, messaging, and admin aggregation, plus Prisma connection lifecycle.

## Findings

- Property search uses database filtering and pagination; schema includes indexes for status/moderation/location/type/price and common host/property access. Detail is by unique slug and includes selected public relations.
- Booking overlap checks use tagged parameterized raw SQL under a PostgreSQL property row lock. The migration contains a GiST exclusion constraint for active overlapping ranges. Date interval use is half-open in hold logic.
- Refresh rotation uses a transaction and conditional update. Payment reconciliation locks the booking row and changes state transactionally.
- Message history and admin lists use bounded query DTOs. Prisma models have foreign-key and lookup indexes.
- No `Unsafe` raw SQL calls were found in source scans. Database query logging emits query events but this service does not register a query event listener.

## Measurement and limitations

No disposable database with representative synthetic data was supplied, so EXPLAIN ANALYZE and actual latency/connection-pool measurements were not performed. No indexes were added without query-plan evidence. Prisma 6 config maps runtime `DATABASE_URL` and migration `DIRECT_URL`; production validation now requires the runtime hostname to include `-pooler` and migration hostname to be direct. The ignored local env values were not printed or validated. Neon documents using the pooled host for application traffic and direct host for Prisma CLI schema operations ([Prisma integration](https://neon.com/docs/guides/prisma)); the pooler is transaction-mode, so avoid session-scoped SQL features with it ([pooling guide](https://neon.com/docs/connect/connection-pooling)).

## Follow-up

Use a staging/test Neon-compatible schema and representative data to run `EXPLAIN (ANALYZE, BUFFERS)` on property search, availability overlap, booking history, conversation pagination, and dashboard aggregates. Record row counts, plans, and write impact before adding indexes. Keep external provider calls outside interactive DB transactions. Validate pool size and transaction timeouts against the actual Neon compute/plan rather than generic connection-limit assumptions.
