import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyModerationStatus, PropertyStatus, PropertyType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminPropertyQueryDto } from '../dto/admin-query.dto';
import { ModerationActionDto, RequiredModerationActionDto } from '../dto/admin-actions.dto';

@Injectable()
export class AdminPropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AdminAuditService,
  ) {}

  private async invalidatePropertyCache(): Promise<void> {
    try {
      await this.redisService.incr('cache:properties:version');
    } catch {
      // Redis fallback
    }
  }

  async getProperties(query: AdminPropertyQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { hostProfile: { displayName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status && Object.values(PropertyStatus).includes(query.status as PropertyStatus)) {
      where.status = query.status as PropertyStatus;
    }

    if (
      query.moderationStatus &&
      Object.values(PropertyModerationStatus).includes(
        query.moderationStatus as PropertyModerationStatus,
      )
    ) {
      where.moderationStatus = query.moderationStatus as PropertyModerationStatus;
    }

    if (
      query.propertyType &&
      Object.values(PropertyType).includes(query.propertyType as PropertyType)
    ) {
      where.propertyType = query.propertyType as PropertyType;
    }

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        include: {
          hostProfile: {
            select: {
              id: true,
              displayName: true,
              user: {
                select: { email: true },
              },
            },
          },
          images: {
            where: { isCover: true },
            take: 1,
            select: { secureUrl: true },
          },
          _count: {
            select: {
              reports: true,
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: properties.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        city: p.city,
        state: p.state,
        country: p.country,
        propertyType: p.propertyType,
        status: p.status,
        moderationStatus: p.moderationStatus,
        pricePerNightPaise: p.pricePerNightPaise,
        coverImage: p.images[0]?.secureUrl ?? null,
        host: {
          id: p.hostProfile.id,
          name: p.hostProfile.displayName,
          email: p.hostProfile.user.email,
        },
        reportCount: p._count.reports,
        bookingsCount: p._count.bookings,
        reviewsCount: p._count.reviews,
        createdAt: p.createdAt.toISOString(),
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
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

  async getPropertyDetails(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        hostProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
        },
        moderatedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reports: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            reports: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found.`);
    }

    return {
      id: property.id,
      slug: property.slug,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      status: property.status,
      moderationStatus: property.moderationStatus,
      moderationReason: property.moderationReason,
      moderatedAt: property.moderatedAt ? property.moderatedAt.toISOString() : null,
      moderatedBy: property.moderatedBy
        ? {
            id: property.moderatedBy.id,
            name: `${property.moderatedBy.firstName} ${property.moderatedBy.lastName}`.trim(),
            email: property.moderatedBy.email,
          }
        : null,
      location: {
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2,
        city: property.city,
        state: property.state,
        country: property.country,
        postalCode: property.postalCode,
        latitude: property.latitude ? Number(property.latitude) : null,
        longitude: property.longitude ? Number(property.longitude) : null,
      },
      capacity: {
        maxGuests: property.maxGuests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathrooms: property.bathrooms,
      },
      pricing: {
        pricePerNightPaise: property.pricePerNightPaise,
        cleaningFeePaise: property.cleaningFeePaise,
        currency: property.currency,
      },
      rules: {
        houseRules: property.houseRules,
        checkInFrom: property.checkInFrom,
        checkOutUntil: property.checkOutUntil,
      },
      images: property.images.map((img) => ({
        id: img.id,
        secureUrl: img.secureUrl,
        isCover: img.isCover,
        sortOrder: img.sortOrder,
        altText: img.altText,
      })),
      amenities: property.amenities.map((a) => ({
        id: a.amenity.id,
        name: a.amenity.name,
        category: a.amenity.category,
        icon: a.amenity.icon,
      })),
      host: {
        id: property.hostProfile.id,
        displayName: property.hostProfile.displayName,
        status: property.hostProfile.status,
        user: {
          id: property.hostProfile.user.id,
          name: `${property.hostProfile.user.firstName} ${property.hostProfile.user.lastName}`.trim(),
          email: property.hostProfile.user.email,
          status: property.hostProfile.user.status,
        },
      },
      stats: {
        bookingsCount: property._count.bookings,
        reviewsCount: property._count.reviews,
        reportsCount: property._count.reports,
      },
      recentReports: property.reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: {
          id: r.reporter.id,
          name: `${r.reporter.firstName} ${r.reporter.lastName}`.trim(),
          email: r.reporter.email,
        },
      })),
      createdAt: property.createdAt.toISOString(),
      publishedAt: property.publishedAt ? property.publishedAt.toISOString() : null,
    };
  }

  async approveProperty(adminId: string, propertyId: string, dto: ModerationActionDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, slug: true, title: true, status: true, moderationStatus: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found.`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          moderationStatus: PropertyModerationStatus.APPROVED,
          moderationReason: dto.reason ?? null,
          moderatedAt: now,
          moderatedById: adminId,
          // IMPORTANT: Do NOT automatically publish DRAFT or PAUSED properties!
        },
        select: { id: true, status: true, moderationStatus: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'APPROVE_PROPERTY',
          entityType: 'Property',
          entityId: propertyId,
          reason: dto.reason,
          beforeData: { moderationStatus: property.moderationStatus, status: property.status },
          afterData: { moderationStatus: updated.moderationStatus, status: updated.status },
          metadata: { propertySlug: property.slug, propertyTitle: property.title },
        },
        tx,
      );
    });

    await this.invalidatePropertyCache();

    return {
      success: true,
      message: `Property "${property.title}" has been approved.`,
    };
  }

  async flagProperty(adminId: string, propertyId: string, dto: RequiredModerationActionDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, slug: true, title: true, status: true, moderationStatus: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found.`);
    }

    const now = new Date();
    // If currently PUBLISHED, pause it to immediately remove from public discovery
    const newStatus =
      property.status === PropertyStatus.PUBLISHED ? PropertyStatus.PAUSED : property.status;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          moderationStatus: PropertyModerationStatus.FLAGGED,
          moderationReason: dto.reason,
          moderatedAt: now,
          moderatedById: adminId,
          status: newStatus,
        },
        select: { id: true, status: true, moderationStatus: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'FLAG_PROPERTY',
          entityType: 'Property',
          entityId: propertyId,
          reason: dto.reason,
          beforeData: { moderationStatus: property.moderationStatus, status: property.status },
          afterData: { moderationStatus: updated.moderationStatus, status: updated.status },
          metadata: { propertySlug: property.slug, propertyTitle: property.title },
        },
        tx,
      );
    });

    await this.invalidatePropertyCache();

    return {
      success: true,
      message: `Property "${property.title}" has been flagged and removed from public discovery.`,
    };
  }

  async rejectProperty(adminId: string, propertyId: string, dto: RequiredModerationActionDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, slug: true, title: true, status: true, moderationStatus: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found.`);
    }

    const now = new Date();
    // If currently PUBLISHED, pause it
    const newStatus =
      property.status === PropertyStatus.PUBLISHED ? PropertyStatus.PAUSED : property.status;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          moderationStatus: PropertyModerationStatus.REJECTED,
          moderationReason: dto.reason,
          moderatedAt: now,
          moderatedById: adminId,
          status: newStatus,
        },
        select: { id: true, status: true, moderationStatus: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'REJECT_PROPERTY',
          entityType: 'Property',
          entityId: propertyId,
          reason: dto.reason,
          beforeData: { moderationStatus: property.moderationStatus, status: property.status },
          afterData: { moderationStatus: updated.moderationStatus, status: updated.status },
          metadata: { propertySlug: property.slug, propertyTitle: property.title },
        },
        tx,
      );
    });

    await this.invalidatePropertyCache();

    return {
      success: true,
      message: `Property "${property.title}" has been rejected.`,
    };
  }
}
