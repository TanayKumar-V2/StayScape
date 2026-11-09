import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GroqService } from './services/groq.service';
import { PreferenceExtractorService } from './services/preference-extractor.service';
import { PropertyRankingService } from './services/property-ranking.service';
import { StayMatchService } from './services/staymatch.service';
import { PropertyAssistantService } from './services/property-assistant.service';
import { PropertyComparisonService } from './services/property-comparison.service';
import { ItineraryService } from './services/itinerary.service';
import { ReviewSummaryService } from './services/review-summary.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { StayMatchController } from './controllers/staymatch.controller';
import { PropertyAssistantController } from './controllers/property-assistant.controller';
import { ItineraryController } from './controllers/itinerary.controller';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [StayMatchController, PropertyAssistantController, ItineraryController],
  providers: [
    GroqService,
    PreferenceExtractorService,
    PropertyRankingService,
    StayMatchService,
    PropertyAssistantService,
    PropertyComparisonService,
    ItineraryService,
    ReviewSummaryService,
    AiRateLimitGuard,
  ],
  exports: [
    GroqService,
    StayMatchService,
    PropertyAssistantService,
    PropertyComparisonService,
    ItineraryService,
    ReviewSummaryService,
  ],
})
export class AiModule {}

