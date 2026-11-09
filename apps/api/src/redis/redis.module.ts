import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule is marked as @Global so RedisService is available
 * throughout the application without re-importing the module.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
