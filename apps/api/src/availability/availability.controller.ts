import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityCheckDto } from './dto/availability-check.dto';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';

@ApiTags('Property Availability')
@Controller('properties')
@UseGuards(RateLimitGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get(':slug/availability')
  @RateLimit({ keyPrefix: 'availability_calendar', limit: 120, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Get public property availability calendar and blocked date intervals',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar unavailable date intervals retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found or is not published',
  })
  async getAvailability(@Param('slug') slug: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getUnavailableRanges(slug, query);
  }

  @Public()
  @Post(':slug/availability/check')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ keyPrefix: 'availability_check', limit: 60, windowSeconds: 60 })
  @ApiOperation({
    summary: 'Check dates availability and get an exact price quote for a stay',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability check and price quote calculated successfully',
  })
  async checkAvailability(@Param('slug') slug: string, @Body() dto: AvailabilityCheckDto) {
    return this.availabilityService.checkAvailabilityAndQuote(slug, dto);
  }
}
