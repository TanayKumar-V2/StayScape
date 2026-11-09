import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PropertyAssistantService } from '../services/property-assistant.service';
import { ReviewSummaryService } from '../services/review-summary.service';
import { PropertyAnswerResponseDto, PropertyQuestionDto } from '../dto/property-question.dto';
import { AiRateLimit, AiRateLimitGuard } from '../guards/ai-rate-limit.guard';

@ApiTags('ai')
@Controller('ai/properties')
export class PropertyAssistantController {
  constructor(
    private readonly assistantService: PropertyAssistantService,
    private readonly reviewSummaryService: ReviewSummaryService,
  ) {}

  @Get(':slug/review-summary')
  @UseGuards(AiRateLimitGuard)
  @AiRateLimit({
    keyPrefix: 'review_summary',
    limit: 20,
    ttlSeconds: 60,
    dailyLimit: 200,
    // Public, heavily cached page feature — availability beats rate precision.
  })
  @ApiOperation({ summary: 'Get AI-grounded review summary based on genuine published guest reviews' })
  @ApiResponse({ status: 200, description: 'Review summary or insufficient reviews notification' })
  async getReviewSummary(@Param('slug') slug: string) {
    return this.reviewSummaryService.getReviewSummary(slug);
  }

  @Post(':slug/ask')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AiRateLimitGuard)
  @AiRateLimit({
    keyPrefix: 'property_ask',
    limit: 10,
    ttlSeconds: 60,
    dailyLimit: 60,
    failClosed: true,
  })
  @ApiOperation({ summary: 'Ask grounded questions about a specific listing' })
  @ApiResponse({ status: 200, type: PropertyAnswerResponseDto })
  async askQuestion(
    @Param('slug') slug: string,
    @Body() dto: PropertyQuestionDto,
  ): Promise<PropertyAnswerResponseDto> {
    return this.assistantService.askQuestion(slug, dto);
  }
}

