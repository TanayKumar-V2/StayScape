import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityCheckDto } from './dto/availability-check.dto';
import { BookingStatus, PropertyStatus, HostStatus, PropertyModerationStatus } from '@prisma/client';
import {
  formatIsoDate,
  getTodayIsoDate,
  parseIsoDate,
  validateBookingDates,
} from '../common/utils/date.utils';

export interface UnavailableRange {
  checkIn: string;
  checkOut: string;
}

export interface PropertyAvailabilityResponse {
  propertySlug: string;
  startDate: string;
  endDate: string;
  unavailableRanges: UnavailableRange[];
}

export interface PriceBreakdown {
  pricePerNightPaise: number;
  nightlySubtotalPaise: number;
  cleaningFeePaise: number;
  totalAmountPaise: number;
  currency: string;
}

export interface AvailabilityCheckResponse {
  available: boolean;
  reason?:
    | 'PROPERTY_NOT_AVAILABLE'
    | 'INVALID_DATE_RANGE'
    | 'GUEST_CAPACITY_EXCEEDED'
    | 'DATES_UNAVAILABLE'
    | 'INVALID_REQUEST';
  property?: {
    slug: string;
    title: string;
  };
  stay?: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guestCount: number;
  };
  priceBreakdown?: PriceBreakdown;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);
  private readonly CACHE_TTL_SECONDS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Retrieves unavailable date ranges for a published property calendar.
   * Results are cached in Redis with short TTL (30s) and versioned keys.
   */
  async getUnavailableRanges(
    slug: string,
    query: AvailabilityQueryDto,
  ): Promise<PropertyAvailabilityResponse> {
    const today = getTodayIsoDate();
    const startDateStr = query.startDate || today;

    // Default window: 90 days if endDate is omitted
    let endDateStr = query.endDate;
    if (!endDateStr) {
      const startObj = parseIsoDate(startDateStr);
      const endObj = new Date(startObj.getTime() + 90 * 86_400_000);
      endDateStr = formatIsoDate(endObj);
    }

    if (startDateStr >= endDateStr) {
      throw new BadRequestException('endDate must be later than startDate');
    }

    // Bound the calendar window so a caller cannot request unrelated
    // multi-year scans of bookings for this property.
    const startMs = parseIsoDate(startDateStr).getTime();
    const endMs = parseIsoDate(endDateStr).getTime();
    if (endMs - startMs > 180 * 86_400_000) {
      throw new BadRequestException(
        'Availability calendar supports a maximum window of 180 days at a time.',
      );
    }

    // Try Redis Cache
    let cacheVersion = 1;
    try {
      const v = await this.redis.get(`cache:availability:${slug}:version`);
      if (v) cacheVersion = parseInt(v, 10);
      const cacheKey = `cache:availability:${slug}:v${cacheVersion}:${startDateStr}:${endDateStr}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as PropertyAvailabilityResponse;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Redis get failed for availability cache: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Database lookup
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        status: true,
        moderationStatus: true,
        hostProfile: { select: { status: true } },
      },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED ||
      property.hostProfile.status !== HostStatus.ACTIVE
    ) {
      throw new NotFoundException(`Property "${slug}" was not found or is not available.`);
    }

    const startUtc = parseIsoDate(startDateStr);
    const endUtc = parseIsoDate(endDateStr);
    const now = new Date();

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        propertyId: property.id,
        status: {
          in: [BookingStatus.HOLD, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED],
        },
        checkIn: { lt: endUtc },
        checkOut: { gt: startUtc },
      },
      select: {
        id: true,
        status: true,
        checkIn: true,
        checkOut: true,
        holdExpiresAt: true,
      },
      orderBy: { checkIn: 'asc' },
    });

    // Filter out expired temporary holds (even before background processor executes)
    const validBookings = activeBookings.filter((b) => {
      if (b.status === BookingStatus.HOLD || b.status === BookingStatus.PAYMENT_PENDING) {
        if (b.holdExpiresAt && b.holdExpiresAt <= now) {
          return false;
        }
      }
      return true;
    });

    const unavailableRanges: UnavailableRange[] = validBookings.map((b) => ({
      checkIn: formatIsoDate(b.checkIn),
      checkOut: formatIsoDate(b.checkOut),
    }));

    const result: PropertyAvailabilityResponse = {
      propertySlug: property.slug,
      startDate: startDateStr,
      endDate: endDateStr,
      unavailableRanges,
    };

    // Save to Redis Cache (30s TTL)
    try {
      const cacheKey = `cache:availability:${slug}:v${cacheVersion}:${startDateStr}:${endDateStr}`;
      await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);
    } catch (err: unknown) {
      this.logger.warn(
        `Redis set failed for availability cache: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  /**
   * Public informational check & price quote.
   * Performs validation, checks overlapping bookings, and returns exact integer paise breakdown.
   */
  async checkAvailabilityAndQuote(
    slug: string,
    dto: AvailabilityCheckDto,
  ): Promise<AvailabilityCheckResponse> {
    // 1. Validate date arithmetic
    let checkIn: Date;
    let checkOut: Date;
    let nights: number;

    try {
      const validated = validateBookingDates(dto.checkIn, dto.checkOut);
      checkIn = validated.checkIn;
      checkOut = validated.checkOut;
      nights = validated.nights;
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        return {
          available: false,
          reason: 'INVALID_DATE_RANGE',
        };
      }
      throw err;
    }

    // 2. Fetch property and host profile
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        hostProfile: {
          select: {
            status: true,
          },
        },
      },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED ||
      property.hostProfile.status !== HostStatus.ACTIVE
    ) {
      return {
        available: false,
        reason: 'PROPERTY_NOT_AVAILABLE',
      };
    }

    // 3. Validate guest capacity
    if (dto.guestCount < 1 || dto.guestCount > property.maxGuests) {
      return {
        available: false,
        reason: 'GUEST_CAPACITY_EXCEEDED',
      };
    }

    // 4. Check for overlapping active bookings in DB
    const now = new Date();
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        propertyId: property.id,
        status: {
          in: [BookingStatus.HOLD, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED],
        },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          { status: BookingStatus.CONFIRMED },
          { holdExpiresAt: null },
          { holdExpiresAt: { gt: now } },
        ],
      },
      select: { id: true },
    });

    if (overlapping) {
      return {
        available: false,
        reason: 'DATES_UNAVAILABLE',
      };
    }

    // 5. Calculate integer paise price breakdown
    const pricePerNightPaise = property.pricePerNightPaise;
    const nightlySubtotalPaise = pricePerNightPaise * nights;
    const cleaningFeePaise = property.cleaningFeePaise;
    const totalAmountPaise = nightlySubtotalPaise + cleaningFeePaise;

    return {
      available: true,
      property: {
        slug: property.slug,
        title: property.title,
      },
      stay: {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        nights,
        guestCount: dto.guestCount,
      },
      priceBreakdown: {
        pricePerNightPaise,
        nightlySubtotalPaise,
        cleaningFeePaise,
        totalAmountPaise,
        currency: property.currency,
      },
    };
  }

  /**
   * Invalidates availability cache for a property by incrementing its version key.
   */
  async invalidateAvailabilityCache(slug: string): Promise<void> {
    try {
      const key = `cache:availability:${slug}:version`;
      const client = this.redis.getClient();
      await client.incr(key);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to increment availability cache version for "${slug}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
