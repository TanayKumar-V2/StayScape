import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, HostStatus, Prisma, PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PreferenceExtractorService } from './preference-extractor.service';
import { PropertyRankingService } from './property-ranking.service';
import { StayMatchSearchDto } from '../dto/staymatch-search.dto';
import { StayMatchResponseDto } from '../dto/staymatch-response.dto';
import { RawPropertyRecord } from '../../properties/serializers/public-property.serializer';

@Injectable()
export class StayMatchService {
  private readonly logger = new Logger(StayMatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferenceExtractor: PreferenceExtractorService,
    private readonly propertyRanking: PropertyRankingService,
  ) {}

  async search(dto: StayMatchSearchDto): Promise<StayMatchResponseDto> {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? Math.min(dto.limit, 50) : 12;

    // 1. Extract preferences from natural language
    const { preferences, fallbackUsed } = await this.preferenceExtractor.extractPreferences(dto);

    // If query is unsupported, return early
    if (preferences.intentStatus === 'UNSUPPORTED') {
      return {
        interpretedPreferences: preferences,
        summary:
          preferences.summary ||
          'StayScape focuses on discovering and booking accommodation. Please ask about stays, destinations, or travel preferences.',
        clarificationQuestion: preferences.clarificationQuestion || null,
        unresolvedPreferences: preferences.unresolvedPreferences || [],
        results: [],
        totalMatched: 0,
        page,
        limit,
        totalPages: 0,
        fallbackUsed,
      };
    }

    // 2. Build Prisma Where Input
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
      moderationStatus: PropertyModerationStatus.APPROVED,
      hostProfile: {
        status: HostStatus.ACTIVE,
      },
    };

    // Destination filter
    if (preferences.destination && preferences.destination.trim().length > 0) {
      const dest = preferences.destination.trim();
      where.OR = [
        { city: { contains: dest, mode: 'insensitive' } },
        { state: { contains: dest, mode: 'insensitive' } },
        { country: { contains: dest, mode: 'insensitive' } },
      ];
    }

    // Property types filter
    if (preferences.propertyTypes && preferences.propertyTypes.length > 0) {
      where.propertyType = { in: preferences.propertyTypes };
    }

    // Guest capacity filter
    if (preferences.guests?.total) {
      where.maxGuests = { gte: preferences.guests.total };
    }

    // Budget filter: allow up to 25% buffer so ranking engine can show near-budget stays with trade-offs
    if (preferences.budget?.maxPaise) {
      let maxPerNight = preferences.budget.maxPaise;
      if (
        preferences.budget.scope === 'TOTAL_STAY' &&
        preferences.checkIn &&
        preferences.checkOut
      ) {
        const inDate = new Date(preferences.checkIn);
        const outDate = new Date(preferences.checkOut);
        const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000));
        maxPerNight = Math.round(maxPerNight / nights);
      }
      where.pricePerNightPaise = {
        lte: Math.round(maxPerNight * 1.25),
      };
    }

    // 3. Query candidate properties
    let candidates = (await this.prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        hostProfile: {
          select: {
            displayName: true,
          },
        },
      },
      take: 100,
    })) as unknown as RawPropertyRecord[];

    // If strictly filtered candidates resulted in 0 (e.g. over-filtered by type or budget buffer),
    // relax type or budget to find destination alternatives
    if (candidates.length === 0 && (where.propertyType || where.pricePerNightPaise)) {
      const relaxedWhere: Prisma.PropertyWhereInput = {
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
        hostProfile: { status: HostStatus.ACTIVE },
      };
      if (where.OR) relaxedWhere.OR = where.OR;
      if (preferences.guests?.total) relaxedWhere.maxGuests = { gte: preferences.guests.total };

      candidates = (await this.prisma.property.findMany({
        where: relaxedWhere,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { include: { amenity: true } },
          hostProfile: { select: { displayName: true } },
        },
        take: 50,
      })) as unknown as RawPropertyRecord[];
    }

    // If destination yielded 0 because of spelling or unlisted city, load popular published properties as recommendations
    if (candidates.length === 0) {
      candidates = (await this.prisma.property.findMany({
        where: {
          status: PropertyStatus.PUBLISHED,
          moderationStatus: PropertyModerationStatus.APPROVED,
          hostProfile: { status: HostStatus.ACTIVE },
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          amenities: { include: { amenity: true } },
          hostProfile: { select: { displayName: true } },
        },
        take: 24,
      })) as unknown as RawPropertyRecord[];
    }

    // 4. Date-aware availability filtering
    if (preferences.checkIn && preferences.checkOut) {
      const checkInDate = new Date(`${preferences.checkIn}T00:00:00.000Z`);
      const checkOutDate = new Date(`${preferences.checkOut}T00:00:00.000Z`);
      const now = new Date();

      const candidateIds = candidates.map((c) => c.id);
      const activeBookings = await this.prisma.booking.findMany({
        where: {
          propertyId: { in: candidateIds },
          status: {
            in: [BookingStatus.HOLD, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED],
          },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        select: {
          propertyId: true,
          status: true,
          holdExpiresAt: true,
        },
      });

      // Filter out holds that expired
      const unavailablePropertyIds = new Set<string>();
      for (const b of activeBookings) {
        if (b.status === BookingStatus.HOLD || b.status === BookingStatus.PAYMENT_PENDING) {
          if (b.holdExpiresAt && b.holdExpiresAt <= now) {
            continue; // Expired hold does not block
          }
        }
        unavailablePropertyIds.add(b.propertyId);
      }

      candidates = candidates.filter((c) => !unavailablePropertyIds.has(c.id));
    }

    // 5. Deterministic 100-Point Ranking
    const rankedProperties = this.propertyRanking.rankProperties(
      candidates,
      preferences,
      dto.query,
    );

    // 6. Pagination
    const totalMatched = rankedProperties.length;
    const totalPages = Math.ceil(totalMatched / limit) || 1;
    const paginatedResults = rankedProperties.slice((page - 1) * limit, page * limit);

    return {
      interpretedPreferences: preferences,
      summary: preferences.summary,
      clarificationQuestion: preferences.clarificationQuestion || null,
      unresolvedPreferences: preferences.unresolvedPreferences || [],
      results: paginatedResults,
      totalMatched,
      page,
      limit,
      totalPages,
      fallbackUsed,
    };
  }
}
