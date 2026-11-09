# Security threat model

## Assets and trust boundaries

Assets: user/host/admin accounts; password hashes; access and refresh tokens; property and availability data; booking and payment/refund records; guest-host messages; reviews/reports; AI requests and outputs; Cloudinary assets; Razorpay credentials; Groq credentials. Trust boundaries are browser/API, API/PostgreSQL, API/Redis/BullMQ, API/Cloudinary, API/Razorpay, API/Groq, and Socket.IO clients.

Threat actors include unauthenticated attackers, malicious guests/hosts, fraudulent guests, compromised accounts, malicious or compromised administrators, automated bots, and abusive API clients.

## Material scenarios and observed controls

| Scenario                                       | Impact                                        | Existing controls / residual assessment                                                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BOLA: guest guesses another booking/reference  | Private itinerary/payment disclosure          | Booking reads use authenticated owner; admin reads use AdminGuard. Verify all booking reference endpoints with two test accounts before release.                                                                                             |
| BOLA: host edits another host's property/image | Listing takeover or asset deletion            | Host profile comes from authenticated principal and mutations resolve ownership. Upload/delete image additionally takes property ID; ownership is checked in controller before service operation.                                            |
| BOLA: foreign conversation/message ID          | Private message disclosure                    | Message REST service and socket room join verify participants. Socket IDs are length-bounded; membership tests are still needed.                                                                                                             |
| BFLA: user invokes admin endpoint              | Account/financial moderation abuse            | Admin controllers use JWT + database-backed AdminGuard; role is not trusted from request payload. Automated route-wide negative tests are incomplete.                                                                                        |
| Token theft/replay or concurrent refresh       | Account takeover/session disruption           | HTTP-only cookies, access tokenVersion, hashed refresh tokens, conditional transactional rotation, and family reuse revocation. Add concurrent refresh regression test against PostgreSQL.                                                   |
| CSRF via cross-site browser request            | Unauthorized state changes                    | SameSite=Lax cookies, allowlisted credentialed CORS, global unsafe-method Origin middleware, webhook HMAC exception. Requests without Origin are accepted for non-browser clients, so cookie behavior and deployment domains must be tested. |
| Forged payment callback/webhook                | Free stay or false refund                     | HMAC verification, raw webhook bytes, provider order/payment binding, amount/currency checks, captured-state reconciliation, durable inbox and idempotent DB state. Live Razorpay sandbox not exercised.                                     |
| Booking race or stale hold                     | Double booking                                | PostgreSQL row locks and exclusion migration, half-open dates; no actual concurrent DB test in this run.                                                                                                                                     |
| Upload malformed/oversized image               | Storage/resource exhaustion or active content | Ten-file/10MiB cap and signature allowlist; SVG rejected by allowlist. Pixel dimensions/decompression limits are unresolved.                                                                                                                 |
| Prompt injection or provider abuse             | Unsupported claims, spend, leakage            | Groq calls server-side and schema validation services exist; no live provider chaos tests. Avoid sending PII; AI results must not be treated as booking/payment authority.                                                                   |
| Redis outage/abuse bursts                      | Rate-limit bypass or degraded presence/cache  | Rate-limit guard defines fail-closed per sensitive route; cache reads fall back. Message helper is fail-open; reconcile per endpoint before release.                                                                                         |
| Secrets exposed through logs or bundles        | Account/provider compromise                   | API request log now omits query strings; Razorpay errors sanitized; frontend variables are `NEXT_PUBLIC_*` only for public endpoints/key ID. No secret scanner result available yet.                                                         |

## OWASP assessment references

Review mapped to OWASP API Security Top 10 2023: API1 BOLA, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs. Assessment also uses OWASP ASVS 5.0.0 as a verification reference. This is a code-informed threat model, not a completed ASVS certification or penetration test.

## Authorization matrix (observed intended enforcement)

| Resource         | Guest                         | Host                          | Admin                                                 |
| ---------------- | ----------------------------- | ----------------------------- | ----------------------------------------------------- |
| Own profile      | Read/edit                     | Read/edit                     | Controlled admin view                                 |
| Own bookings     | Read/manage allowed lifecycle | Read when participant         | Read                                                  |
| Other bookings   | Denied                        | Denied                        | Controlled read                                       |
| Own properties   | No management                 | Manage owned listings         | Read/moderate                                         |
| Other properties | Public serialized fields      | No management                 | Controlled moderation                                 |
| Own wishlist     | Manage                        | Manage                        | Controlled access                                     |
| Reviews          | Eligible guest submits        | Respond on own property       | Moderate                                              |
| Messages         | Own conversations             | Own conversations             | No routine content access; restricted report workflow |
| Payment records  | Own booking context           | Relevant booking context only | Read/controlled operations                            |
| Reports          | Submit own                    | Submit own                    | Manage                                                |

## Priority follow-up

Reject production placeholder provider keys and mock behavior; add route-wide IDOR tests; exercise CSRF and same-site cookie behavior in browser; test PostgreSQL concurrency; enforce image pixel limits; review limits on every write/AI/socket route; complete secret/dependency scans. Authorization must remain server-side regardless of frontend route guards.
