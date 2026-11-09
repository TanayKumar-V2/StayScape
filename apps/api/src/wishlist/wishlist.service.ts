import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WishlistQueryDto } from './dto/wishlist-query.dto';

export interface WishlistPropertyItem {
  id: string;
  propertyId: string;
  savedAt: string;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
    state: string;
    country: string;
    propertyType: string;
    coverImageUrl: string | null;
    pricePerNightPaise: number;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    averageRating: number | null;
    reviewCount: number;
  };
}

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns paginated saved properties for the authenticated user.
   * Only includes published listings; excludes private host/address details.
   */
  async getUserWishlist(userId: string, query: WishlistQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      property: {
        status: PropertyStatus.PUBLISHED,
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.wishlistItem.count({ where }),
      this.prisma.wishlistItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              city: true,
              state: true,
              country: true,
              propertyType: true,
              pricePerNightPaise: true,
              maxGuests: true,
              bedrooms: true,
              bathrooms: true,
              images: {
                orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { secureUrl: true },
              },
            },
          },
        },
      }),
    ]);

    // Batch aggregate reviews for all returned properties
    const propertyIds = items.map((i) => i.property.id);
    const reviewStatsMap = await this.getReviewStatsForProperties(propertyIds);

    const totalPages = Math.ceil(total / limit) || 1;

    const formattedData: WishlistPropertyItem[] = items.map((item) => {
      const stats = reviewStatsMap.get(item.property.id) ?? { averageRating: null, reviewCount: 0 };
      return {
        id: item.id,
        propertyId: item.property.id,
        savedAt: item.createdAt.toISOString(),
        property: {
          id: item.property.id,
          title: item.property.title,
          slug: item.property.slug,
          city: item.property.city,
          state: item.property.state,
          country: item.property.country,
          propertyType: item.property.propertyType,
          coverImageUrl: item.property.images[0]?.secureUrl ?? null,
          pricePerNightPaise: item.property.pricePerNightPaise,
          maxGuests: item.property.maxGuests,
          bedrooms: item.property.bedrooms,
          bathrooms: item.property.bathrooms,
          averageRating: stats.averageRating,
          reviewCount: stats.reviewCount,
        },
      };
    });

    return {
      data: formattedData,
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

  /**
   * Adds a published property to the user's wishlist (idempotent via unique constraint).
   */
  async addToWishlist(userId: string, propertyId: string): Promise<{ isSaved: boolean; propertyId: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true },
    });

    if (!property || property.status !== PropertyStatus.PUBLISHED) {
      throw new NotFoundException('Property not found or is not currently available.');
    }

    try {
      await this.prisma.wishlistItem.upsert({
        where: {
          userId_propertyId: {
            userId,
            propertyId,
          },
        },
        create: {
          userId,
          propertyId,
        },
        update: {},
      });
    } catch (err: unknown) {
      // Swallow ONLY the concurrent-duplicate race (unique violation, P2002) --
      // an upsert losing the race still leaves exactly the one saved row the
      // caller expects. Every other failure (network down, FK violation, ...)
      // must surface, otherwise a real outage silently fakes success.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.warn(
          `Concurrent wishlist add resolved idempotently for property ${propertyId}`,
        );
      } else {
        throw err;
      }
    }

    return { isSaved: true, propertyId };
  }

  /**
   * Removes a property from the user's wishlist.
   */
  async removeFromWishlist(userId: string, propertyId: string): Promise<{ isSaved: boolean; propertyId: string }> {
    await this.prisma.wishlistItem.deleteMany({
      where: {
        userId,
        propertyId,
      },
    });

    return { isSaved: false, propertyId };
  }

  /**
   * Returns whether a property is saved in the user's wishlist.
   */
  async getStatus(userId: string, propertyId: string): Promise<{ isSaved: boolean }> {
    const item = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
      select: { id: true },
    });

    return { isSaved: Boolean(item) };
  }

  /**
   * Helper to batch aggregate review stats.
   */
  private async getReviewStatsForProperties(
    propertyIds: string[],
  ): Promise<Map<string, { averageRating: number | null; reviewCount: number }>> {
    const map = new Map<string, { averageRating: number | null; reviewCount: number }>();
    if (propertyIds.length === 0) return map;

    try {
      const stats = await this.prisma.review.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          status: 'PUBLISHED',
        },
        _avg: { overallRating: true },
        _count: { id: true },
      });

      for (const s of stats) {
        map.set(s.propertyId, {
          averageRating: s._avg.overallRating ? Number(s._avg.overallRating.toFixed(1)) : null,
          reviewCount: s._count.id,
        });
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to aggregate review stats in wishlist: ${err instanceof Error ? err.message : String(err)}`);
    }

    return map;
  }
}
