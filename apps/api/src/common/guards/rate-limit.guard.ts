import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { extractClientIp } from '../utils/client-ip';

export interface RateLimitOptions {
  keyPrefix: string;
  /** Maximum requests per window from one identity. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Use the authenticated user id instead of the client IP as the bucket key. */
  byUser?: boolean;
  /**
   * Policy when Redis is unreachable:
   *  - true  -> reject with 503 (used on financially or write-sensitive
   *             endpoints where an uncounted burst is unacceptable).
   *  - false -> allow the request through (used on public read endpoints where
   *             keeping the feature up beats enforcement precision).
   */
  failClosed?: boolean;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

/**
 * Endpoint-focused Redis rate limiter used on business-sensitive flows
 * (booking holds, payment orders, verification, reviews, reports, availability).
 * Key design points:
 *  - Atomic: increment + expiry evaluated in one Lua call.
 *  - Identity: authenticated user (when byUser) or trusted-proxy-derived IP —
 *    forged X-Forwarded-For values are ignored by construction.
 *  - Deliberate failure policy, chosen per endpoint via failClosed.
 * Runs after JwtAuthGuard when byUser: true.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly trustedProxies: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.trustedProxies = (configService.get<string[]>('app.trustedProxies') ?? []).slice();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request & { user?: { sub?: string; id?: string } }>();
    const res = httpContext.getResponse<Response>();

    const identifier =
      options.byUser && req.user ? req.user.sub || req.user.id : extractClientIp(req, this.trustedProxies);

    const key = `rl:api:${options.keyPrefix}:${identifier}`;

    let result: [number, number] | null = null;
    try {
      const client = this.redisService.getClient();
      if (client) {
        result = (await client.eval(RATE_LIMIT_LUA, 1, key, options.windowSeconds)) as [
          number,
          number,
        ];
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Redis rate limit check failed for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
      result = null;
    }

    if (!result) {
      if (options.failClosed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'Rapid security limits are temporarily unavailable. Please retry in a moment.',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return true;
    }

    const [current, ttl] = result;
    if (current > options.limit) {
      const retryAfter = ttl > 0 ? ttl : options.windowSeconds;
      res.setHeader('Retry-After', retryAfter.toString());
      this.logger.warn(`Rate limit exceeded for ${key}: ${current}/${options.limit}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down and try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
