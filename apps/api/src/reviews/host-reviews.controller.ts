import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { HostResponseDto } from './dto/host-response.dto';

@ApiTags('Host Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('host/reviews')
export class HostReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':reviewId/response')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a published guest review on your property' })
  @ApiResponse({ status: 200, description: 'Host response saved successfully' })
  @ApiResponse({ status: 403, description: 'Not the host of this property' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async createHostResponse(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('reviewId') reviewId: string,
    @Body() dto: HostResponseDto,
  ) {
    return this.reviewsService.respondAsHost(user.id, reviewId, dto.response);
  }

  @Patch(':reviewId/response')
  @ApiOperation({ summary: 'Update host response to a guest review' })
  @ApiResponse({ status: 200, description: 'Host response updated successfully' })
  async updateHostResponse(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('reviewId') reviewId: string,
    @Body() dto: HostResponseDto,
  ) {
    return this.reviewsService.respondAsHost(user.id, reviewId, dto.response);
  }
}
