import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HostStatus, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';
import { ActivateActionDto, SuspendActionDto } from '../dto/admin-actions.dto';

@Injectable()
export class AdminHostsService {
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

  async getHosts(query: AdminPaginationQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.HostProfileWhereInput = {};

    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status && (query.status === 'ACTIVE' || query.status === 'SUSPENDED')) {
      where.status = query.status as HostStatus;
    }

    const [total, hosts] = await Promise.all([
      this.prisma.hostProfile.count({ where }),
      this.prisma.hostProfile.findMany({
        where,
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
          properties: {
            select: {
              id: true,
              status: true,
              moderationStatus: true,
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
      data: hosts.map((h) => {
        const totalProps = h.properties.length;
        const publishedProps = h.properties.filter(
          (p) => p.status === PropertyStatus.PUBLISHED && p.moderationStatus === 'APPROVED',
        ).length;

        return {
          id: h.id,
          userId: h.user.id,
          displayName: h.displayName,
          bio: h.bio,
          status: h.status,
          userEmail: h.user.email,
          userName: `${h.user.firstName} ${h.user.lastName}`.trim(),
          userStatus: h.user.status,
          totalProperties: totalProps,
          publishedProperties: publishedProps,
          createdAt: h.createdAt.toISOString(),
        };
      }),
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

  async getHostDetails(hostProfileId: string) {
    const host = await this.prisma.hostProfile.findUnique({
      where: { id: hostProfileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        properties: {
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            state: true,
            propertyType: true,
            status: true,
            moderationStatus: true,
            pricePerNightPaise: true,
            createdAt: true,
            images: {
              where: { isCover: true },
              take: 1,
              select: { secureUrl: true },
            },
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!host) {
      throw new NotFoundException(`Host profile with ID "${hostProfileId}" not found.`);
    }

    const totalProperties = host.properties.length;
    const publishedProperties = host.properties.filter(
      (p) => p.status === PropertyStatus.PUBLISHED && p.moderationStatus === 'APPROVED',
    ).length;
    const draftProperties = host.properties.filter((p) => p.status === PropertyStatus.DRAFT).length;
    const pausedProperties = host.properties.filter((p) => p.status === PropertyStatus.PAUSED).length;

    return {
      id: host.id,
      displayName: host.displayName,
      bio: host.bio,
      contactPhone: host.contactPhone,
      status: host.status,
      termsAcceptedAt: host.termsAcceptedAt.toISOString(),
      createdAt: host.createdAt.toISOString(),
      user: {
        id: host.user.id,
        email: host.user.email,
        name: `${host.user.firstName} ${host.user.lastName}`.trim(),
        avatarUrl: host.user.avatarUrl,
        status: host.user.status,
        createdAt: host.user.createdAt.toISOString(),
        lastLoginAt: host.user.lastLoginAt ? host.user.lastLoginAt.toISOString() : null,
      },
      stats: {
        totalProperties,
        publishedProperties,
        draftProperties,
        pausedProperties,
      },
      properties: host.properties.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        location: `${p.city}, ${p.state}`,
        propertyType: p.propertyType,
        status: p.status,
        moderationStatus: p.moderationStatus,
        pricePerNightPaise: p.pricePerNightPaise,
        coverImage: p.images[0]?.secureUrl ?? null,
        bookingsCount: p._count.bookings,
        reviewsCount: p._count.reviews,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async suspendHost(adminId: string, hostProfileId: string, dto: SuspendActionDto) {
    const host = await this.prisma.hostProfile.findUnique({
      where: { id: hostProfileId },
      include: {
        user: { select: { email: true } },
        properties: { select: { id: true, title: true } },
      },
    });

    if (!host) {
      throw new NotFoundException(`Host profile with ID "${hostProfileId}" not found.`);
    }

    if (host.status === HostStatus.SUSPENDED) {
      throw new BadRequestException('This host profile is already suspended.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.hostProfile.update({
        where: { id: hostProfileId },
        data: { status: HostStatus.SUSPENDED },
        select: { id: true, status: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'SUSPEND_HOST',
          entityType: 'HostProfile',
          entityId: hostProfileId,
          reason: dto.reason,
          beforeData: { status: host.status },
          afterData: { status: updated.status },
          metadata: {
            affectedPropertiesCount: host.properties.length,
            hostEmail: host.user.email,
          },
        },
        tx,
      );
    });

    await this.invalidatePropertyCache();

    return {
      success: true,
      message: `Host profile "${host.displayName}" has been suspended. All ${host.properties.length} owned properties are now hidden from public discovery.`,
    };
  }

  async activateHost(adminId: string, hostProfileId: string, dto: ActivateActionDto) {
    const host = await this.prisma.hostProfile.findUnique({
      where: { id: hostProfileId },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!host) {
      throw new NotFoundException(`Host profile with ID "${hostProfileId}" not found.`);
    }

    if (host.status === HostStatus.ACTIVE) {
      throw new BadRequestException('This host profile is already active.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.hostProfile.update({
        where: { id: hostProfileId },
        data: { status: HostStatus.ACTIVE },
        select: { id: true, status: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'ACTIVATE_HOST',
          entityType: 'HostProfile',
          entityId: hostProfileId,
          reason: dto.reason,
          beforeData: { status: host.status },
          afterData: { status: updated.status },
        },
        tx,
      );
    });

    await this.invalidatePropertyCache();

    return {
      success: true,
      message: `Host profile "${host.displayName}" has been reactivated.`,
    };
  }
}

