import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { HostReviewsController } from './host-reviews.controller';
import { PublicReviewsController } from './public-reviews.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ReviewsController, HostReviewsController, PublicReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
