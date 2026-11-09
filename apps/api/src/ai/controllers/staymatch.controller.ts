import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StayMatchService } from '../services/staymatch.service';
import { PropertyComparisonService } from '../services/property-comparison.service';
import { StayMatchSearchDto } from '../dto/staymatch-search.dto';
import { StayMatchResponseDto } from '../dto/staymatch-response.dto';
import {
  ComparePropertiesDto,
  PropertyComparisonResponseDto,
} from '../dto/property-comparison.dto';
import { AiRateLimit, AiRateLimitGuard } from '../guards/ai-rate-limit.guard';

@ApiTags('ai')
@Controller('ai/staymatch')
export class StayMatchController {
  constructor(
    private readonly stayMatchService: StayMatchService,
    private readonly propertyComparisonService: PropertyComparisonService,
  ) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AiRateLimitGuard)
  @AiRateLimit({
    keyPrefix: 'staymatch_search',
    limit: 10,
    ttlSeconds: 60,
    dailyLimit: 60,
    failClosed: true,
  })
  @ApiOperation({ summary: 'AI-powered natural language stay discovery and ranking' })
  @ApiResponse({ status: 200, type: StayMatchResponseDto })
  async search(@Body() dto: StayMatchSearchDto): Promise<StayMatchResponseDto> {
    return this.stayMatchService.search(dto);
  }

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AiRateLimitGuard)
  @AiRateLimit({
    keyPrefix: 'staymatch_compare',
    limit: 5,
    ttlSeconds: 60,
    dailyLimit: 30,
    failClosed: true,
  })
  @ApiOperation({ summary: 'Compare 2 to 3 properties side-by-side with AI analysis' })
  @ApiResponse({ status: 200, type: PropertyComparisonResponseDto })
  async compare(@Body() dto: ComparePropertiesDto): Promise<PropertyComparisonResponseDto> {
    return this.propertyComparisonService.compare(dto);
  }
}
