import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import {
  DestinationSummary,
  PaginatedPublicResponse,
  PublicPropertiesService,
} from './public-properties.service';
import {
  PublicPropertyDetail,
  PublicPropertySummary,
} from './serializers/public-property.serializer';

@ApiTags('public-properties')
@Controller('properties')
@Public()
@UseGuards(RateLimitGuard)
@RateLimit({ keyPrefix: 'public_browser', limit: 120, windowSeconds: 60, failClosed: false })
export class PublicPropertiesController {
  constructor(private readonly publicPropertiesService: PublicPropertiesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search and discover published properties with rich multi-criteria filtering',
  })
  @ApiResponse({ status: 200, description: 'Filtered list of published properties' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async search(
    @Query() dto: SearchPropertiesDto,
  ): Promise<PaginatedPublicResponse<PublicPropertySummary>> {
    return this.publicPropertiesService.search(dto);
  }

  @Get('destinations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get popular destinations aggregated from published properties in database',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Aggregated destinations' })
  async getDestinations(@Query('limit') limit?: number): Promise<{ data: DestinationSummary[] }> {
    return this.publicPropertiesService.getDestinations(limit ? Number(limit) : 8);
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full public details of a published property by slug' })
  @ApiResponse({ status: 200, description: 'Published property details' })
  @ApiResponse({ status: 404, description: 'Property not found or not published' })
  async getBySlug(@Param('slug') slug: string): Promise<PublicPropertyDetail> {
    return this.publicPropertiesService.getBySlug(slug);
  }
}
