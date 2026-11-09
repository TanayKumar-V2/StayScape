import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard, AuthenticatedAdminUser } from '../guards/admin.guard';
import { AdminUser } from '../decorators/admin-user.decorator';
import { AdminReviewsService } from '../services/admin-reviews.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';
import { RequiredModerationActionDto } from '../dto/admin-actions.dto';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReviewsController {
  constructor(private readonly reviewsService: AdminReviewsService) {}

  @Get()
  async getReviews(
    @Query() query: AdminPaginationQueryDto & { rating?: number; propertyId?: string },
  ) {
    return this.reviewsService.getReviews(query);
  }

  @Post(':reviewId/hide')
  async hideReview(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('reviewId') reviewId: string,
    @Body() dto: RequiredModerationActionDto,
  ) {
    return this.reviewsService.hideReview(admin.id, reviewId, dto);
  }

  @Post(':reviewId/restore')
  async restoreReview(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('reviewId') reviewId: string,
    @Body() dto: RequiredModerationActionDto,
  ) {
    return this.reviewsService.restoreReview(admin.id, reviewId, dto);
  }
}

