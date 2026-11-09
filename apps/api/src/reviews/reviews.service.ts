import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PropertyModerationStatus,
  PropertyStatus,
  Review,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto, ReviewSortOption } from './dto/review-query.dto';

export interface SerializedReviewResponse {
  id: string;
  overallRating: number;
  title: string | null;
  comment: string;
  categoryRatings: {
    cleanliness: number | null;
    accuracy: number | null;
    checkIn: number | null;
    communication: number | null;
    location: number | null;
    value: number | null;
  };
  guest: {
    displayName: string;
    avatarUrl: string | null;
  };
  verifiedStay: boolean;
  hostResponse: string | null;
  hostRespondedAt: string | null;
  createdAt: string;
}

export interface ReviewAggregateSummary {
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: {
    5: { count: number; percentage: number };
    4: { count: number; percentage: number };
    3: { count: number; percentage: number };
    2: { count: number; percentage: number };
    1: { count: number; percentage: number };
  };
  categoryAverages: {
    cleanliness: number | null;
    accuracy: number | null;
    checkIn: number | null;
    communication: number | null;
    location: number | null;
    value: number | null;
  };
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Generates safe guest display name ("John D." or "Alice") to protect guest privacy.
   */
  private formatGuestDisplayName(firstName: string, lastName?: string | null): string {
    const cleanFirst = firstName?.trim() || 'Guest';
    if (!lastName || lastName.trim().length === 0) {
      return cleanFirst;
    }
    const lastInitial = lastName.trim().charAt(0).toUpperCase();
    return `${cleanFirst} ${lastInitial}.`;
  }

  /**
   * Sanitizes and serializes a review for client responses.
   */
  private serializeReview(
    review: Review & {
      guestUser?: { firstName: string; lastName: string; avatarUrl: string | null } | null;
    },
  ): SerializedReviewResponse {
    const guestName = review.guestUser
      ? this.formatGuestDisplayName(review.guestUser.firstName, review.guestUser.lastName)
      : 'Verified Guest';

    return {
      id: review.id,
      overallRating: review.overallRating,
      title: review.title,
      comment: review.comment,
      categoryRatings: {
        cleanliness: review.cleanlinessRating,
        accuracy: review.accuracyRating,
        checkIn: review.checkInRating,
        communication: review.communicationRating,
        location: review.locationRating,
        value: review.valueRating,
      },
      guest: {
        displayName: guestName,
        avatarUrl: review.guestUser?.avatarUrl ?? null,
      },
      verifiedStay: true,
      hostResponse: review.hostResponse,
      hostRespondedAt: review.hostRespondedAt ? review.hostRespondedAt.toISOString() : null,
      createdAt: review.createdAt.toISOString(),
    };
  }

  /**
   * Invalidates property list and AI review summary caches.
   */
  async invalidatePropertyReviewCaches(propertyId: string, propertySlug?: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (client) {
        await client.incr('cache:properties:version');
        if (propertySlug) {
          await this.redisService.scanAndDelete(`cache:review-summary:${propertySlug}:*`);
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to invalidate review caches: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Checks if a user is eligible to review a completed booking.
   */
  async checkEligibility(userId: string, bookingReference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        property: {
          select: { id: true, title: true, slug: true },
        },
        reviews: {
          select: { id: true, status: true, createdAt: true },
        },
      },
    });

    if (!booking || booking.userId !== userId) {
      return {
        eligible: false,
        reason: 'BOOKING_NOT_FOUND',
        message: 'Booking not found or does not belong to your account.',
      };
    }

    // Check status: only CONFIRMED or COMPLETED bookings qualify
    const validStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];
    if (!validStatuses.includes(booking.status)) {
      return {
        eligible: false,
        reason: 'INVALID_STATUS',
        message: `Bookings with status "${booking.status}" are not eligible for review. Only paid, confirmed completed stays qualify.`,
      };
    }

    // Check date: checkout date in UTC must be in the past
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setUTCHours(0, 0, 0, 0);

    if (checkOutDate >= todayUtc) {
      return {
        eligible: false,
        reason: 'STAY_NOT_COMPLETED',
        message: 'Your stay has not yet concluded. Reviews can only be submitted after checkout.',
      };
    }

    // Check existing review
    if (booking.reviews && booking.reviews.length > 0) {
      return {
        eligible: false,
        reason: 'ALREADY_REVIEWED',
        message: 'A review has already been submitted for this reservation.',
        existingReviewId: booking.reviews[0].id,
      };
    }

    // Auto-transition to COMPLETED if still CONFIRMED
    if (booking.status === BookingStatus.CONFIRMED) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: booking.completedAt ?? new Date(),
        },
      });
    }

    return {
      eligible: true,
      booking: {
        bookingReference: booking.bookingReference,
        propertyTitle: booking.propertyTitleSnapshot,
        propertySlug: booking.propertySlugSnapshot,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        checkOut: booking.checkOut.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Submits a verified guest review for a completed stay.
   */
  async createReview(userId: string, dto: CreateReviewDto): Promise<SerializedReviewResponse> {
    const eligibility = await this.checkEligibility(userId, dto.bookingReference);
    if (!eligibility.eligible) {
      if (eligibility.reason === 'ALREADY_REVIEWED') {
        throw new ConflictException(eligibility.message);
      }
      throw new BadRequestException(eligibility.message);
    }

    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference: dto.bookingReference },
      include: {
        property: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          bookingId: booking.id,
          propertyId: booking.propertyId,
          guestUserId: userId,
          overallRating: dto.overallRating,
          cleanlinessRating: dto.cleanlinessRating,
          accuracyRating: dto.accuracyRating,
          checkInRating: dto.checkInRating,
          communicationRating: dto.communicationRating,
          locationRating: dto.locationRating,
          valueRating: dto.valueRating,
          title: dto.title?.trim() || null,
          comment: dto.comment.trim(),
          status: ReviewStatus.PUBLISHED,
        },
        include: {
          guestUser: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });

      // Invalidate caches
      await this.invalidatePropertyReviewCaches(booking.propertyId, booking.property.slug);

      return this.serializeReview(review);
    } catch (err: unknown) {
      // Handle unique constraint violation (P2002 on bookingId)
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new ConflictException('A review has already been submitted for this booking.');
      }
      throw err;
    }
  }

  /**
   * Edits an existing review (only original author).
   */
  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto): Promise<SerializedReviewResponse> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { id: true, slug: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.guestUserId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews.');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        overallRating: dto.overallRating ?? review.overallRating,
        cleanlinessRating: dto.cleanlinessRating !== undefined ? dto.cleanlinessRating : review.cleanlinessRating,
        accuracyRating: dto.accuracyRating !== undefined ? dto.accuracyRating : review.accuracyRating,
        checkInRating: dto.checkInRating !== undefined ? dto.checkInRating : review.checkInRating,
        communicationRating: dto.communicationRating !== undefined ? dto.communicationRating : review.communicationRating,
        locationRating: dto.locationRating !== undefined ? dto.locationRating : review.locationRating,
        valueRating: dto.valueRating !== undefined ? dto.valueRating : review.valueRating,
        title: dto.title !== undefined ? dto.title.trim() : review.title,
        comment: dto.comment !== undefined ? dto.comment.trim() : review.comment,
      },
      include: {
        guestUser: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    await this.invalidatePropertyReviewCaches(review.property.id, review.property.slug);

    return this.serializeReview(updated);
  }

  /**
   * Hides a review (soft delete by author).
   */
  async hideReview(userId: string, reviewId: string): Promise<{ success: boolean }> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { id: true, slug: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.guestUserId !== userId) {
      throw new ForbiddenException('You can only hide your own reviews.');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.HIDDEN },
    });

    await this.invalidatePropertyReviewCaches(review.property.id, review.property.slug);

    return { success: true };
  }

  /**
   * Adds or updates a host response to a published guest review.
   */
  async respondAsHost(userId: string, reviewId: string, responseContent: string): Promise<SerializedReviewResponse> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: {
          include: {
            hostProfile: true,
          },
        },
        guestUser: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.property.hostProfile.userId !== userId) {
      throw new ForbiddenException('You can only respond to reviews on properties you host.');
    }

    if (review.status !== ReviewStatus.PUBLISHED) {
      throw new BadRequestException('You can only respond to published reviews.');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: responseContent.trim(),
        hostRespondedAt: new Date(),
      },
      include: {
        guestUser: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return this.serializeReview(updated);
  }

  /**
   * Public: paginated reviews for a property slug.
   */
  async getPublicReviews(slug: string, query: ReviewQueryDto) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: { id: true, status: true, moderationStatus: true },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED
    ) {
      throw new NotFoundException(`Property "${slug}" was not found.`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    let orderBy: Record<string, string>[] = [{ createdAt: 'desc' }];
    if (query.sort === ReviewSortOption.HIGHEST_RATING) {
      orderBy = [{ overallRating: 'desc' }, { createdAt: 'desc' }];
    } else if (query.sort === ReviewSortOption.LOWEST_RATING) {
      orderBy = [{ overallRating: 'asc' }, { createdAt: 'desc' }];
    }

    const where = {
      propertyId: property.id,
      status: ReviewStatus.PUBLISHED,
    };

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          guestUser: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: reviews.map((r) => this.serializeReview(r)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Public: aggregates statistics for published reviews on a property.
   */
  async getReviewSummary(slug: string): Promise<ReviewAggregateSummary> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: { id: true, status: true, moderationStatus: true },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED
    ) {
      throw new NotFoundException(`Property "${slug}" was not found.`);
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        propertyId: property.id,
        status: ReviewStatus.PUBLISHED,
      },
      select: {
        overallRating: true,
        cleanlinessRating: true,
        accuracyRating: true,
        checkInRating: true,
        communicationRating: true,
        locationRating: true,
        valueRating: true,
      },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: null,
        ratingDistribution: {
          5: { count: 0, percentage: 0 },
          4: { count: 0, percentage: 0 },
          3: { count: 0, percentage: 0 },
          2: { count: 0, percentage: 0 },
          1: { count: 0, percentage: 0 },
        },
        categoryAverages: {
          cleanliness: null,
          accuracy: null,
          checkIn: null,
          communication: null,
          location: null,
          value: null,
        },
      };
    }

    const distCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumOverall = 0;

    let sumCleanliness = 0, countCleanliness = 0;
    let sumAccuracy = 0, countAccuracy = 0;
    let sumCheckIn = 0, countCheckIn = 0;
    let sumCommunication = 0, countCommunication = 0;
    let sumLocation = 0, countLocation = 0;
    let sumValue = 0, countValue = 0;

    for (const r of reviews) {
      const rating = Math.min(5, Math.max(1, r.overallRating));
      distCounts[rating] = (distCounts[rating] || 0) + 1;
      sumOverall += rating;

      if (r.cleanlinessRating) { sumCleanliness += r.cleanlinessRating; countCleanliness++; }
      if (r.accuracyRating) { sumAccuracy += r.accuracyRating; countAccuracy++; }
      if (r.checkInRating) { sumCheckIn += r.checkInRating; countCheckIn++; }
      if (r.communicationRating) { sumCommunication += r.communicationRating; countCommunication++; }
      if (r.locationRating) { sumLocation += r.locationRating; countLocation++; }
      if (r.valueRating) { sumValue += r.valueRating; countValue++; }
    }

    const averageRating = Number((sumOverall / totalReviews).toFixed(1));

    const roundAvg = (sum: number, count: number): number | null =>
      count > 0 ? Number((sum / count).toFixed(1)) : null;

    return {
      totalReviews,
      averageRating,
      ratingDistribution: {
        5: { count: distCounts[5], percentage: Math.round((distCounts[5] / totalReviews) * 100) },
        4: { count: distCounts[4], percentage: Math.round((distCounts[4] / totalReviews) * 100) },
        3: { count: distCounts[3], percentage: Math.round((distCounts[3] / totalReviews) * 100) },
        2: { count: distCounts[2], percentage: Math.round((distCounts[2] / totalReviews) * 100) },
        1: { count: distCounts[1], percentage: Math.round((distCounts[1] / totalReviews) * 100) },
      },
      categoryAverages: {
        cleanliness: roundAvg(sumCleanliness, countCleanliness),
        accuracy: roundAvg(sumAccuracy, countAccuracy),
        checkIn: roundAvg(sumCheckIn, countCheckIn),
        communication: roundAvg(sumCommunication, countCommunication),
        location: roundAvg(sumLocation, countLocation),
        value: roundAvg(sumValue, countValue),
      },
    };
  }
}
