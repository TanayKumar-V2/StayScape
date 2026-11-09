import { Controller, Get, HttpCode, HttpStatus, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface LiveResponse {
  status: 'ok';
  service: string;
}

interface CheckResult {
  database: 'up' | 'down';
  redis: 'up' | 'down';
}

interface ReadyResponse {
  status: 'ok' | 'error';
  checks: CheckResult;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Liveness probe — only checks that the Node process is running.
   * Does NOT depend on the database or Redis.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Returns OK when the API process is running. No external dependencies checked.',
  })
  @ApiResponse({ status: 200, description: 'Service is alive.' })
  liveness(): LiveResponse {
    return { status: 'ok', service: 'stayscape-api' };
  }

  /**
   * Readiness probe — verifies database and Redis connectivity.
   * Returns 503 when any required dependency is unavailable.
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Checks database and Redis connectivity. Returns 503 if any dependency is down.',
  })
  @ApiResponse({ status: 200, description: 'All dependencies are healthy.' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are unavailable.' })
  async readiness(@Res({ passthrough: true }) res: Response): Promise<ReadyResponse> {
    const [databaseUp, redisUp] = await Promise.all([this.checkDatabase(), this.redis.ping()]);

    const checks: CheckResult = {
      database: databaseUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
    };

    const allHealthy = databaseUp && redisUp;

    if (!allHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: allHealthy ? 'ok' : 'error',
      checks,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      this.logger.warn(`Database health check failed: ${(err as Error).message}`);
      return false;
    }
  }
}
