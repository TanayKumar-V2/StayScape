import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';

interface RateLimitResult {
  current: number;
  ttl: number;
}

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
  }

  /**
   * Hashes an identifier (such as email) with SHA-256 to avoid leaking sensitive data into Redis keys.
   */
  private hashIdentifier(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Executes atomic Lua script to increment counter and apply TTL.
   */
  private async incrementAtomic(key: string, ttlSeconds: number): Promise<RateLimitResult | null> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        return null;
      }
      const res = (await client.eval(RATE_LIMIT_LUA, 1, key, ttlSeconds)) as [number, number];
      return { current: res[0], ttl: res[1] };
    } catch (error) {
      this.logger.warn(`Redis rate-limit evaluation failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Enforces registration limit: 5 attempts per IP per hour (3600s).
   */
  async checkRegisterLimit(ip: string): Promise<void> {
    const key = `rl:auth:register:${ip}`;
    const result = await this.incrementAtomic(key, 3600);

    if (!result) {
      if (this.isProduction) {
        this.logger.error('Rate limiting degraded: Redis unreachable during registration');
      }
      return;
    }

    if (result.current > 5) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many registration attempts. Please try again later.',
          retryAfter: result.ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Checks failed login attempt count: 5 attempts per IP + hashed email per 15 minutes (900s).
   */
  async checkLoginLimit(ip: string, email: string): Promise<void> {
    const key = `rl:auth:login:${ip}:${this.hashIdentifier(email)}`;
    try {
      const currentVal = await this.redisService.get(key);
      const count = currentVal ? parseInt(currentVal, 10) : 0;
      if (count >= 5) {
        const client = this.redisService.getClient();
        const ttl = client ? await client.ttl(key) : 900;
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many failed login attempts. Please try again later.',
            retryAfter: Math.max(ttl, 1),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.warn(`Redis rate-limit check failed: ${(error as Error).message}`);
    }
  }

  /**
   * Records a failed login attempt for the IP + hashed email combination.
   */
  async recordFailedLogin(ip: string, email: string): Promise<void> {
    const key = `rl:auth:login:${ip}:${this.hashIdentifier(email)}`;
    await this.incrementAtomic(key, 900);
  }

  /**
   * Clears failed login counter upon successful authentication.
   */
  async resetLoginAttempts(ip: string, email: string): Promise<void> {
    const key = `rl:auth:login:${ip}:${this.hashIdentifier(email)}`;
    try {
      await this.redisService.del(key);
    } catch {
      // Non-critical cleanup
    }
  }

  /**
   * Enforces refresh limit: 30 requests per IP per minute (60s).
   */
  async checkRefreshLimit(ip: string): Promise<void> {
    const key = `rl:auth:refresh:${ip}`;
    const result = await this.incrementAtomic(key, 60);

    if (!result) {
      if (this.isProduction) {
        this.logger.error('Rate limiting degraded: Redis unreachable during refresh');
      }
      return;
    }

    if (result.current > 30) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many token refresh requests. Please slow down.',
          retryAfter: result.ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
