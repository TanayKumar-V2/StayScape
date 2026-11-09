import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';
import { RequiredModerationActionDto } from '../dto/admin-actions.dto';

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AdminAuditService,
  ) {}

  private async invalidateReviewCaches(propertySlug: string): Promise<void> {
    try {
      // Invalidate property list cache & AI review-summary cache for this
      // property. Review summary keys follow
      // `cache:review-summary:${slug}:*` (see ai/services/review-summary.service.ts).
      await this.redisService.scanAndDelete(`cache:review-summary:${propertySlug}:*`);
      await this.redisService.incr('cache:properties:version');
    } catch {
      // Redis fallback
    }
  }

  async getReviews(query: AdminPaginationQueryDto & { rating?: number; propertyId?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (query.search) {
      where.OR = [
        { comment: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { guestUser: { email: { contains: query.search, mode: 'insensitive' } } },
        { guestUser: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { guestUser: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { property: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status && Object.values(ReviewStatus).includes(query.status as ReviewStatus)) {
      where.status = query.status as ReviewStatus;
    }

    if (query.rating && query.rating >= 1 && query.rating <= 5) {
      where.overallRating = Number(query.rating);
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          property: {
            select: { id: true, slug: true, title: true, city: true },
          },
          guestUser: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
          },
          _count: {
            select: { reports: true },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: reviews.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        overallRating: r.overallRating,
        cleanlinessRating: r.cleanlinessRating,
        accuracyRating: r.accuracyRating,
        checkInRating: r.checkInRating,
        communicationRating: r.communicationRating,
        locationRating: r.locationRating,
        valueRating: r.valueRating,
        title: r.title,
        comment: r.comment,
        status: r.status,
        hostResponse: r.hostResponse,
        hostRespondedAt: r.hostRespondedAt ? r.hostRespondedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        property: {
          id: r.property.id,
          slug: r.property.slug,
          title: r.property.title,
          city: r.property.city,
        },
        guest: {
          id: r.guestUser.id,
          name: `${r.guestUser.firstName} ${r.guestUser.lastName}`.trim(),
          email: r.guestUser.email,
          avatarUrl: r.guestUser.avatarUrl,
        },
        reportCount: r._count.reports,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async hideReview(
    adminId: string,
    reviewId: string,
    dto: RequiredModerationActionDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { slug: true, title: true } },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    if (review.status === ReviewStatus.HIDDEN) {
      throw new BadRequestException('This review is already hidden.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { status: ReviewStatus.HIDDEN },
        select: { id: true, status: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'HIDE_REVIEW',
          entityType: 'Review',
          entityId: reviewId,
          reason: dto.reason,
          beforeData: { status: review.status },
          afterData: { status: updated.status },
          metadata: {
            propertySlug: review.property.slug,
            propertyTitle: review.property.title,
            rating: review.overallRating,
          },
        },
        tx,
      );
    });

    await this.invalidateReviewCaches(review.property.slug);

    return {
      success: true,
      message: 'Review has been hidden from public display.',
    };
  }

  async restoreReview(
    adminId: string,
    reviewId: string,
    dto: RequiredModerationActionDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { slug: true, title: true } },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    if (review.status === ReviewStatus.PUBLISHED) {
      throw new BadRequestException('This review is already published.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { status: ReviewStatus.PUBLISHED },
        select: { id: true, status: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'RESTORE_REVIEW',
          entityType: 'Review',
          entityId: reviewId,
          reason: dto.reason,
          beforeData: { status: review.status },
          afterData: { status: updated.status },
          metadata: {
            propertySlug: review.property.slug,
            propertyTitle: review.property.title,
            rating: review.overallRating,
          },
        },
        tx,
      );
    });

    await this.invalidateReviewCaches(review.property.slug);

    return {
      success: true,
      message: 'Review has been restored to public display.',
    };
  }
}

