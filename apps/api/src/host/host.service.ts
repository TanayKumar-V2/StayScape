import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { HostProfile, HostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HostOnboardingDto } from './dto/host-onboarding.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';

export interface HostDashboardStats {
  totalProperties: number;
  publishedCount: number;
  draftCount: number;
  pausedCount: number;
  archivedCount: number;
  totalBookings: number;
  totalEarningsPaise: number;
  recentProperties: Array<{
    id: string;
    slug: string;
    title: string;
    propertyType: string;
    status: string;
    city: string;
    state: string;
    pricePerNightPaise: number;
    cleaningFeePaise: number;
    coverImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@Injectable()
export class HostService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(userId: string, dto: HostOnboardingDto): Promise<HostProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { hostProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.hostProfile) {
      throw new ConflictException('User is already registered as a host');
    }

    const hostProfile = await this.prisma.hostProfile.create({
      data: {
        userId,
        displayName: dto.displayName,
        bio: dto.bio ?? null,
        contactPhone: dto.contactPhone ?? null,
        status: HostStatus.ACTIVE,
        termsAcceptedAt: new Date(),
      },
    });

    return hostProfile;
  }

  async getProfile(userId: string): Promise<HostProfile> {
    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { userId },
    });

    if (!hostProfile) {
      throw new NotFoundException('Host profile not found. Please complete host onboarding.');
    }

    return hostProfile;
  }

  async updateProfile(userId: string, dto: UpdateHostProfileDto): Promise<HostProfile> {
    const existing = await this.prisma.hostProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Host profile not found');
    }

    return this.prisma.hostProfile.update({
      where: { userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      },
    });
  }

  async getDashboard(hostProfileId: string): Promise<HostDashboardStats> {
    const [
      totalProperties,
      publishedCount,
      draftCount,
      pausedCount,
      archivedCount,
      recentProperties,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { hostProfileId },
      }),
      this.prisma.property.count({
        where: { hostProfileId, status: 'PUBLISHED' },
      }),
      this.prisma.property.count({
        where: { hostProfileId, status: 'DRAFT' },
      }),
      this.prisma.property.count({
        where: { hostProfileId, status: 'PAUSED' },
      }),
      this.prisma.property.count({
        where: { hostProfileId, status: 'ARCHIVED' },
      }),
      this.prisma.property.findMany({
        where: { hostProfileId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          images: {
            where: { isCover: true },
            take: 1,
          },
        },
      }),
    ]);

    return {
      totalProperties,
      publishedCount,
      draftCount,
      pausedCount,
      archivedCount,
      totalBookings: 0,
      totalEarningsPaise: 0,
      recentProperties: recentProperties.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        propertyType: p.propertyType,
        status: p.status,
        city: p.city,
        state: p.state,
        pricePerNightPaise: p.pricePerNightPaise,
        cleaningFeePaise: p.cleaningFeePaise,
        coverImageUrl: p.images[0]?.secureUrl ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }
}
