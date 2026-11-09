import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/review-query.dto';

@ApiTags('Public Reviews')
@Controller('properties')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':slug/reviews')
  @ApiOperation({ summary: 'Get paginated published reviews for a property' })
  @ApiResponse({ status: 200, description: 'Paginated reviews list' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getReviews(
    @Param('slug') slug: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getPublicReviews(slug, query);
  }

  @Get(':slug/reviews/summary')
  @ApiOperation({ summary: 'Get rating distribution and category averages for a property' })
  @ApiResponse({ status: 200, description: 'Review aggregates and summary' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getSummary(@Param('slug') slug: string) {
    return this.reviewsService.getReviewSummary(slug);
  }
}
