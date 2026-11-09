import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

/** HTTP methods that cannot mutate state and skip CSRF origin validation. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that do raw-body signature verification and are not browser-originated. */
const WEBHOOK_PATH = /^\/api\/v1\/webhooks\/razorpay\/?(?:\?.*)?$/;

/**
 * Global CSRF hardening for cookie-authenticated state-changing requests:
 * when an Origin header is present on an unsafe method, it MUST match one of
 * the configured web origins. Browsers always attach Origin to unsafe
 * requests; plain server-to-server callers (Razorpay webhook) are instead
 * authenticated by HMAC signature verification and are exempted below.
 *
 * This is deliberately distinct from CORS: CORS stops browsers from reading
 * responses, not from sending requests. Same-site form posts (which CORS does
 * not block) are rejected here because their Origin will not match.
 */
export function originValidator(getAllowedOrigins: () => string[]) {
  const log = new Logger('OriginValidation');

  return function originValidationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const originHeader: string | string[] | undefined = req.headers['origin'];
    if (!originHeader) {
      // Non-browser clients (curl, tests, server-to-server callers) do not
      // send Origin. These rely on their own authenticators (JWT cookie,
      // webhook HMAC). CORS configured origins remain authoritative for
      // credential-bearing browser fetches.
      next();
      return;
    }

    if (WEBHOOK_PATH.test(req.originalUrl || req.url)) {
      // Webhook deliveries are authenticated by raw-body HMAC signature, not
      // by browser origin. Never reject based on Origin here.
      next();
      return;
    }

    const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader).trim();
    const allowed = getAllowedOrigins();
    if (allowed.length > 0 && !allowed.includes(origin)) {
      log.warn(
        `Rejected untrusted origin on ${req.method} ${req.originalUrl}: "${origin}" (allowed: ${allowed.join(', ')})`,
      );
      res.status(403).json({
        statusCode: 403,
        message: 'Invalid request origin',
        error: 'Forbidden',
      });
      return;
    }

    next();
  };
}

/**
 * Per-request correlation ID + structured access-log middleware.
 * Always sets an `X-Request-Id` response header and emits exactly one
 * structured JSON line per finished request. Query strings, tokens,
 * passwords and payment signatures are never logged.
 */
export function requestLoggingMiddleware() {
  const logger = new Logger('Http');

  return function requestLogging(req: Request, res: Response, next: NextFunction): void {
    const headerValue = req.headers['x-request-id'];
    const incoming = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const id =
      incoming && /^[a-zA-Z0-9._-]{1,64}$/.test(incoming)
        ? incoming
        : randomBytes(8).toString('hex');

    res.setHeader('X-Request-Id', id);
    (req as Request & { requestId?: string }).requestId = id;

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs =
        Math.round((Number(process.hrtime.bigint() - start) / 1_000_000) * 100) / 100;
      const line = JSON.stringify({
        reqId: id,
        method: req.method,
        // Avoid query strings: callers sometimes place sensitive identifiers in them.
        route: (req as Request & { route?: { path?: string } }).route?.path
          ? `${req.baseUrl}${(req as Request & { route?: { path?: string } }).route?.path}`
          : req.path,
        status: res.statusCode,
        durationMs,
      });

      if (res.statusCode >= 500) {
        logger.error(line);
      } else if (res.statusCode >= 400) {
        logger.warn(line);
      } else {
        logger.log(line);
      }
    });

    next();
  };
}
