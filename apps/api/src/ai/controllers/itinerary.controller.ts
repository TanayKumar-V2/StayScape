import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ItineraryService } from '../services/itinerary.service';
import { GenerateItineraryDto, ItineraryResponseDto } from '../dto/itinerary-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiRateLimit, AiRateLimitGuard } from '../guards/ai-rate-limit.guard';

@ApiTags('ai')
@Controller('ai/itinerary')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AiRateLimitGuard)
  @AiRateLimit({
    keyPrefix: 'itinerary',
    limit: 5,
    ttlSeconds: 60,
    byUser: true,
    dailyLimit: 20,
    failClosed: true,
  })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate personalized day-by-day travel itinerary suggestions' })
  @ApiResponse({ status: 200, type: ItineraryResponseDto })
  async generate(@Body() dto: GenerateItineraryDto): Promise<ItineraryResponseDto> {
    return this.itineraryService.generate(dto);
  }
}

