import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('app.redisUrl', 'redis://localhost:6379');

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts until user triggers action
        }
        return Math.min(times * 1000, 3000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connection established.');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client is ready.');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed.');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection...');
    try {
      if (this.client) {
        await this.client.quit();
      }
    } catch {
      if (this.client) {
        this.client.disconnect();
      }
    }
    this.logger.log('Redis connection closed.');
  }

  /** Returns the underlying ioredis client for advanced usage. */
  getClient(): Redis {
    return this.client;
  }

  /** Sends a PING to Redis and returns true if the response is PONG. */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  /** Convenience get. */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Convenience set with optional TTL in seconds. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Delete one or more keys. */
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /** Increment integer key. */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Deletes every key matching a glob pattern using SCAN iteration instead of
   * KEYS, so cache invalidation never blocks the Redis event loop on large
   * keyspaces. Returns how many keys were deleted.
   */
  async scanAndDelete(pattern: string): Promise<number> {
    const client = this.client;
    let deleted = 0;
    const stream = client.scanStream({ match: pattern, count: 200 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
    }
    return deleted;
  }
}
