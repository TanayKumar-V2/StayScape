import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const mockRedisService = {
    ping: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('liveness()', () => {
    it('should return ok status', () => {
      const result = controller.liveness();
      expect(result).toEqual({ status: 'ok', service: 'stayscape-api' });
    });
  });

  describe('readiness()', () => {
    const createMockResponse = () => ({
      status: jest.fn().mockReturnThis(),
    });

    it('should return ok when all checks pass', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockRedisService.ping.mockResolvedValueOnce(true);
      const res = createMockResponse();

      const result = await controller.readiness(res as never);

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('up');
      expect(result.checks.redis).toBe('up');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return error and set 503 when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      mockRedisService.ping.mockResolvedValueOnce(true);
      const res = createMockResponse();

      const result = await controller.readiness(res as never);

      expect(result.status).toBe('error');
      expect(result.checks.database).toBe('down');
      expect(result.checks.redis).toBe('up');
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return error and set 503 when redis is down', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockRedisService.ping.mockResolvedValueOnce(false);
      const res = createMockResponse();

      const result = await controller.readiness(res as never);

      expect(result.status).toBe('error');
      expect(result.checks.database).toBe('up');
      expect(result.checks.redis).toBe('down');
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});
