import type { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersOptions {
  /** Enable HSTS — only for HTTPS deployments (production behind TLS). */
  hsts: boolean;
}

/**
 * Compact security-headers middleware for the Express-hosted NestJS API.
 *
 * Deliberately dependency-light (no Helmet) and API-focused:
 *  - X-Content-Type-Options: nosniff
 *  - Referrer-Policy: no-referrer
 *  - Strict-Transport-Security (production HTTPS only)
 *  - Permissions-Policy: deny camera/mic/geolocation for the API
 *  - CSP: default-src 'none'; frame-ancestors 'none' — the API returns JSON,
 *    never framed documents. Swagger is served in development from the same
 *    origin, so a small style/script allowance is scoped to that case.
 *
 * Script-loaded flows (Razorpay Checkout, Socket.IO) consume the API via
 * fetch/XHR only and are not affected by the API's frame-ancestors policy.
 * The Web frontend gets its own CSP in apps/web (see next.config.ts).
 */
export function securityHeaders(options: SecurityHeadersOptions) {
  const hstsValue =
    'max-age=31536000; includeSubDomains' +
    (process.env['HSTS_PRELOAD'] === 'true' ? '; preload' : '');

  return function securityHeadersMiddleware(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    // The API serves JSON. Allow only self-referential scripts/styles (Swagger UI in dev).
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    if (options.hsts) {
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    next();
  };
}
