#!/usr/bin/env node
/**
 * StayScape Production & Staging Smoke Test Suite
 *
 * Safe, non-destructive health and functional validation of:
 * - Backend API health probes (liveness, readiness)
 * - Public data endpoints (search, destinations, property details, amenities, reviews)
 * - Webhook security gate (verifying signature enforcement)
 * - Frontend web routes (homepage, discovery, login, host onboarding)
 * - Optional authenticated guest/host lifecycle checks (when test credentials supplied)
 *
 * Usage:
 *   npx ts-node scripts/production-smoke-test.ts [--api-url <url>] [--web-url <url>]
 *   pnpm smoke-test --api-url https://api.stayscape.example/api/v1 --web-url https://www.stayscape.example
 */

interface CheckResult {
  name: string;
  category: 'BACKEND' | 'FRONTEND' | 'INTEGRATION' | 'AUTH';
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  details?: string;
  error?: string;
}

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

const API_BASE = (
  getArg('--api-url') ??
  process.env['API_URL'] ??
  'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

const WEB_BASE = (
  getArg('--web-url') ??
  process.env['WEB_URL'] ??
  'http://localhost:3000'
).replace(/\/+$/, '');

const TEST_EMAIL = getArg('--email') ?? process.env['SMOKE_TEST_EMAIL'];
const TEST_PASSWORD = getArg('--password') ?? process.env['SMOKE_TEST_PASSWORD'];

const results: CheckResult[] = [];

async function runCheck(
  name: string,
  category: CheckResult['category'],
  fn: () => Promise<string | void>,
): Promise<void> {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({
      name,
      category,
      status: 'PASSED',
      durationMs: Date.now() - start,
      details: details || undefined,
    });
    console.log(`  [PASS] ${name} (${Date.now() - start}ms)${details ? ` - ${details}` : ''}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      name,
      category,
      status: 'FAILED',
      durationMs: Date.now() - start,
      error: message,
    });
    console.error(`  [FAIL] ${name} (${Date.now() - start}ms): ${message}`);
  }
}

function skipCheck(name: string, category: CheckResult['category'], reason: string): void {
  results.push({
    name,
    category,
    status: 'SKIPPED',
    durationMs: 0,
    details: reason,
  });
  console.log(`  [SKIP] ${name} - ${reason}`);
}

async function main(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' STAYSCAPE PRODUCTION & STAGING SMOKE TEST');
  console.log('======================================================================');
  console.log(`API Base URL:      ${API_BASE}`);
  console.log(`Web Base URL:      ${WEB_BASE}`);
  console.log(`Authenticated:     ${TEST_EMAIL ? `Enabled (${TEST_EMAIL})` : 'Disabled (no credentials supplied)'}`);
  console.log(`Execution Time:    ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------------\n');

  let samplePropertySlug: string | null = null;
  let samplePropertyId: string | null = null;

  // ── 1. Backend Probes ───────────────────────────────────────────────────────
  console.log('>>> 1. BACKEND HEALTH & READINESS');
  await runCheck('API Process Liveness (GET /health/live)', 'BACKEND', async () => {
    const res = await fetch(`${API_BASE}/health/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as { status: string };
    if (data.status !== 'ok') throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    return 'Process responsive';
  });

  await runCheck('Database & Redis Readiness (GET /health/ready)', 'BACKEND', async () => {
    const res = await fetch(`${API_BASE}/health/ready`);
    if (!res.ok) throw new Error(`HTTP ${res.status} (service degraded): ${res.statusText}`);
    const data = (await res.json()) as { status: string; checks: { database: string; redis: string } };
    if (data.status !== 'ok' || data.checks?.database !== 'up' || data.checks?.redis !== 'up') {
      throw new Error(`Degraded dependency state: ${JSON.stringify(data)}`);
    }
    return `DB: ${data.checks.database}, Redis: ${data.checks.redis}`;
  });

  // ── 2. Public Catalog & Discovery Endpoints ─────────────────────────────────
  console.log('\n>>> 2. PUBLIC CATALOG & DISCOVERY');
  await runCheck('Public Amenities Catalogue (GET /amenities)', 'BACKEND', async () => {
    const res = await fetch(`${API_BASE}/amenities`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Amenities catalog empty or malformed');
    }
    return `${data.length} standard amenities catalogued`;
  });

  await runCheck('Public Destinations Directory (GET /properties/destinations)', 'BACKEND', async () => {
    const res = await fetch(`${API_BASE}/properties/destinations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as any[];
    return `Found ${Array.isArray(data) ? data.length : 0} destination clusters`;
  });

  await runCheck('Public Property Search (GET /properties)', 'BACKEND', async () => {
    const res = await fetch(`${API_BASE}/properties?limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const body = (await res.json()) as { data: any[]; pagination?: any };
    if (!body || !Array.isArray(body.data)) throw new Error('Search response missing data array');
    if (body.data.length > 0) {
      samplePropertySlug = body.data[0].slug;
      samplePropertyId = body.data[0].id;
    }
    return `${body.data.length} listings returned (total: ${body.pagination?.total ?? 'N/A'})`;
  });

  if (samplePropertySlug) {
    await runCheck(`Property Details (GET /properties/${samplePropertySlug})`, 'BACKEND', async () => {
      const res = await fetch(`${API_BASE}/properties/${samplePropertySlug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const prop = (await res.json()) as { id: string; title: string; pricePerNightPaise: number };
      if (!prop.id || !prop.title) throw new Error('Property detail response incomplete');
      return `Loaded "${prop.title}" (₹${(prop.pricePerNightPaise / 100).toLocaleString('en-IN')}/night)`;
    });

    await runCheck(`Property Reviews (GET /reviews/properties/${samplePropertyId ?? samplePropertySlug})`, 'BACKEND', async () => {
      const target = samplePropertyId ?? samplePropertySlug;
      const res = await fetch(`${API_BASE}/reviews/properties/${target}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const reviews = (await res.json()) as any;
      const count = Array.isArray(reviews) ? reviews.length : reviews.data?.length ?? 0;
      return `${count} verified review(s) fetched`;
    });
  } else {
    skipCheck('Property Details & Reviews', 'BACKEND', 'No published properties returned in search');
  }

  // ── 3. Security & Webhook Integrations ───────────────────────────────────────
  console.log('\n>>> 3. INTEGRATION & SECURITY GATES');
  await runCheck('Razorpay Webhook Signature Rejection (POST /webhooks/razorpay)', 'INTEGRATION', async () => {
    // Probe with missing or forged signature — must reject with 400 or 401
    const res = await fetch(`${API_BASE}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'forged_smoke_test_signature_hex_invalid',
      },
      body: JSON.stringify({ event: 'payment.captured', test: true }),
    });
    if (res.status === 200) {
      throw new Error('SECURITY VIOLATION: Endpoint accepted forged signature without rejecting!');
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return `Correctly rejected forged webhook with HTTP ${res.status}`;
    }
    throw new Error(`Unexpected HTTP status: ${res.status}`);
  });

  // ── 4. Frontend Web Routes ─────────────────────────────────────────────────
  console.log('\n>>> 4. FRONTEND APPLICATION PAGES');
  await runCheck('Frontend Landing Page (GET /)', 'FRONTEND', async () => {
    const res = await fetch(`${WEB_BASE}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    if (!text.includes('StayScape') && !text.includes('<!DOCTYPE html>')) {
      throw new Error('Landing page content missing or incomplete');
    }
    const hasCsp = res.headers.has('content-security-policy');
    const hasXcto = res.headers.get('x-content-type-options') === 'nosniff';
    return `HTML delivered, CSP: ${hasCsp ? 'Active' : 'Missing'}, nosniff: ${hasXcto ? 'Active' : 'Missing'}`;
  });

  await runCheck('Property Discovery Page (GET /stays)', 'FRONTEND', async () => {
    const res = await fetch(`${WEB_BASE}/stays`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return 'Discovery page resolved (200)';
  });

  await runCheck('Authentication Login Page (GET /login)', 'FRONTEND', async () => {
    const res = await fetch(`${WEB_BASE}/login`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return 'Login page resolved (200)';
  });

  await runCheck('Host Onboarding Portal (GET /host/onboarding)', 'FRONTEND', async () => {
    const res = await fetch(`${WEB_BASE}/host/onboarding`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return 'Host portal route resolved (200)';
  });

  // ── 5. Authenticated Flows (Optional) ───────────────────────────────────────
  console.log('\n>>> 5. AUTHENTICATED USER SESSIONS');
  if (TEST_EMAIL && TEST_PASSWORD) {
    let authCookie = '';
    await runCheck('Guest Authentication (POST /auth/login)', 'AUTH', async () => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      });
      if (!res.ok) throw new Error(`Login failed with HTTP ${res.status}`);
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) authCookie = setCookie;
      return 'Authenticated successfully, session cookie received';
    });

    if (authCookie) {
      await runCheck('Active User Profile (GET /auth/me)', 'AUTH', async () => {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Cookie: authCookie },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const user = (await res.json()) as { id: string; email: string; role: string };
        return `Identity: ${user.email} (Role: ${user.role})`;
      });

      await runCheck('Wishlist Retrieval (GET /wishlist)', 'AUTH', async () => {
        const res = await fetch(`${API_BASE}/wishlist`, {
          headers: { Cookie: authCookie },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return 'Wishlist retrieved successfully';
      });

      await runCheck('Session Logout (POST /auth/logout)', 'AUTH', async () => {
        const res = await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Cookie: authCookie },
        });
        if (!res.ok) throw new Error(`Logout failed with HTTP ${res.status}`);
        return 'Session terminated and cookies cleared';
      });
    }
  } else {
    skipCheck('Guest Login, Profile, Wishlist & Logout', 'AUTH', 'Supply --email and --password to test authenticated paths');
  }

  // ── Summary Report ──────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(' SMOKE TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const skipped = results.filter((r) => r.status === 'SKIPPED').length;

  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed}`);
  console.log(`SKIPPED:      ${skipped}`);

  if (failed > 0) {
    console.error('\nFAILURES DETECTED:');
    for (const r of results.filter((r) => r.status === 'FAILED')) {
      console.error(`- ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\nALL CHECKED PRODUCTION CAPABILITIES VERIFIED SUCCESSFULLY.');
    process.exit(0);
  }
}

void main();

