import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('eligibility/:bookingReference')
  @ApiOperation({ summary: 'Check if the authenticated user is eligible to review a completed booking' })
  @ApiResponse({ status: 200, description: 'Eligibility status returned' })
  async checkEligibility(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('bookingReference') bookingReference: string,
  ) {
    return this.reviewsService.checkEligibility(user.id, bookingReference);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'review_create', limit: 5, windowSeconds: 60, byUser: true, failClosed: true })
  @ApiOperation({ summary: 'Submit a verified review for a completed stay' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Not eligible or invalid ratings/comment' })
  @ApiResponse({ status: 409, description: 'Review already exists for this booking' })
  @ApiResponse({ status: 429, description: 'Too many review submissions; slow down' })
  async createReview(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Patch(':reviewId')
  @ApiOperation({ summary: 'Edit an existing review (original reviewer only)' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Cannot edit reviews created by another user' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateReview(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(user.id, reviewId, dto);
  }

  @Delete(':reviewId')
  @ApiOperation({ summary: 'Hide a review (soft delete by reviewer)' })
  @ApiResponse({ status: 200, description: 'Review hidden successfully' })
  @ApiResponse({ status: 403, description: 'Cannot hide reviews created by another user' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async hideReview(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.hideReview(user.id, reviewId);
  }
}
