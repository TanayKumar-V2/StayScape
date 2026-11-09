import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  let rateLimitService: AuthRateLimitService;
  let mockRedisClient: { eval: jest.Mock; ttl: jest.Mock };
  let mockRedisService: { getClient: jest.Mock; get: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    mockRedisClient = {
      eval: jest.fn(),
      ttl: jest.fn(),
    };
    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      get: jest.fn(),
      del: jest.fn(),
    };
    const configService = {
      get: jest.fn().mockReturnValue('test'),
    } as unknown as ConfigService;

    rateLimitService = new AuthRateLimitService(
      mockRedisService as unknown as RedisService,
      configService,
    );
  });

  it('should allow register request below threshold', async () => {
    mockRedisClient.eval.mockResolvedValue([3, 3500]);
    await expect(rateLimitService.checkRegisterLimit('127.0.0.1')).resolves.not.toThrow();
  });

  it('should block register request above threshold with 429', async () => {
    mockRedisClient.eval.mockResolvedValue([6, 3200]);

    await expect(rateLimitService.checkRegisterLimit('127.0.0.1')).rejects.toThrow(HttpException);

    try {
      await rateLimitService.checkRegisterLimit('127.0.0.1');
    } catch (err: unknown) {
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('should block login when 5 failed attempts are reached', async () => {
    mockRedisService.get.mockResolvedValue('5');
    mockRedisClient.ttl.mockResolvedValue(450);

    await expect(rateLimitService.checkLoginLimit('127.0.0.1', 'user@example.com')).rejects.toThrow(
      HttpException,
    );
  });

  it('should allow login when failed attempts are below 5', async () => {
    mockRedisService.get.mockResolvedValue('2');
    await expect(
      rateLimitService.checkLoginLimit('127.0.0.1', 'user@example.com'),
    ).resolves.not.toThrow();
  });

  it('should allow refresh within rate limit and block above 30', async () => {
    mockRedisClient.eval.mockResolvedValueOnce([15, 45]);
    await expect(rateLimitService.checkRefreshLimit('127.0.0.1')).resolves.not.toThrow();

    mockRedisClient.eval.mockResolvedValueOnce([31, 30]);
    await expect(rateLimitService.checkRefreshLimit('127.0.0.1')).rejects.toThrow(HttpException);
  });
});
