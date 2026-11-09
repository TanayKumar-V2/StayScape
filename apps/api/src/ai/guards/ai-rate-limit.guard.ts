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
import { RedisService } from '../../redis/redis.service';
import { extractClientIp } from '../../common/utils/client-ip';
import { ConfigService } from '@nestjs/config';

export interface AiRateLimitOptions {
  keyPrefix: string;
  limit: number;
  ttlSeconds: number;
  byUser?: boolean;
  /** Additional hard quota over a full UTC day (cost protection). */
  dailyLimit?: number;
  /**
   * When Redis is unreachable:
   *  - true  -> reject the request (503). Used on expensive LLM endpoints:
   *             uncounted Groq calls are an unbounded direct cost.
   *  - false -> serve the request (feature availability beats rate precision).
   */
  failClosed?: boolean;
}

export const AI_RATE_LIMIT_KEY = 'ai_rate_limit';
export const AiRateLimit = (options: AiRateLimitOptions) => SetMetadata(AI_RATE_LIMIT_KEY, options);

/**
 * Atomic sliding-window-capable counter: INCR plus EXPIRE only on first
 * increment, evaluated in a single server-side Lua script so a crash between
 * the two calls can never leave a rate-limit key without a TTL.
 */
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

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiRateLimitGuard.name);
  private readonly trustedProxies: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.trustedProxies = (configService.get<string[]>('app.trustedProxies') ?? []).slice();
  }

  private async attempt(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<{ current: number; ttl: number } | null> {
    const client = this.redisService.getClient();
    if (!client) return null;
    const res = (await client.eval(RATE_LIMIT_LUA, 1, key, ttlSeconds)) as [number, number];
    return { current: res[0], ttl: res[1] };
  }

  private exceed(res: Response, ttl: number, fallbackTtl: number, messageKey: string) {
    const retryAfter = ttl > 0 ? ttl : fallbackTtl;
    res.setHeader('Retry-After', retryAfter.toString());
    this.logger.warn(`AI rate limit exceeded for ${messageKey}: retry after ${retryAfter}s`);
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Rate limit exceeded for AI request. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<AiRateLimitOptions | undefined>(
      AI_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request & { user?: { sub?: string; id?: string } }>();
    const res = httpContext.getResponse<Response>();

    // Determine identifier (user ID if authenticated and byUser enabled, else a
    // trusted-proxy-aware client IP — never a spoofable X-Forwarded-For value).
    let identifier = extractClientIp(req, this.trustedProxies);
    if (options.byUser && req.user) {
      identifier = req.user.sub || req.user.id || identifier;
    }

    const shortKey = `ratelimit:ai:${options.keyPrefix}:${identifier}`;

    try {
      const bucket = await this.attempt(shortKey, options.limit, options.ttlSeconds);
      if (!bucket) {
        // Redis unavailable.
        if (options.failClosed) {
          throw new HttpException(
            {
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              message: 'AI service temporarily unavailable. Please try again shortly.',
              error: 'Service Unavailable',
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        return true;
      }

      if (bucket.current > options.limit) {
        this.exceed(res, bucket.ttl, options.ttlSeconds, shortKey);
      }

      if (options.dailyLimit) {
        const dayKey = `ratelimit:ai:${options.keyPrefix}:${identifier}:day`;
        const dayBucket = await this.attempt(dayKey, options.dailyLimit, 86400);
        if (dayBucket && dayBucket.current > options.dailyLimit) {
          this.exceed(res, dayBucket.ttl, 3600, dayKey);
        }
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.warn(
        `Redis rate limit error: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (options.failClosed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'AI service temporarily unavailable. Please try again shortly.',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return true;
    }
  }
}
