import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateBookingHoldDto } from './dto/create-booking-hold.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { Booking, BookingStatus, HostStatus, PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  formatIsoDate,
  generateBookingReference,
  validateBookingDates,
} from '../common/utils/date.utils';
import { BookingExpirationJobData } from './booking-expiration.processor';

export interface SerializedBookingResponse {
  bookingReference: string;
  status: BookingStatus;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  property: {
    title: string;
    slug: string;
    city: string;
    coverImage: string | null;
  };
  stay: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guestCount: number;
  };
  priceBreakdown: {
    pricePerNightPaise: number;
    nightlySubtotalPaise: number;
    cleaningFeePaise: number;
    totalAmountPaise: number;
    currency: string;
  };
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    @InjectQueue('booking-expiration')
    private readonly expirationQueue: Queue<BookingExpirationJobData>,
  ) {}

  /**
   * Serializes a Booking Prisma model into the standardized public DTO.
   */
  private serializeBooking(b: Booking): SerializedBookingResponse {
    return {
      bookingReference: b.bookingReference,
      status: b.status,
      holdExpiresAt: b.holdExpiresAt ? b.holdExpiresAt.toISOString() : null,
      confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      expiredAt: b.expiredAt ? b.expiredAt.toISOString() : null,
      completedAt: b.completedAt ? b.completedAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      property: {
        title: b.propertyTitleSnapshot,
        slug: b.propertySlugSnapshot,
        city: b.propertyCitySnapshot,
        coverImage: b.propertyCoverImageSnapshot,
      },
      stay: {
        checkIn: formatIsoDate(b.checkIn),
        checkOut: formatIsoDate(b.checkOut),
        nights: b.nights,
        guestCount: b.guestCount,
      },
      priceBreakdown: {
        pricePerNightPaise: b.pricePerNightPaise,
        nightlySubtotalPaise: b.nightlySubtotalPaise,
        cleaningFeePaise: b.cleaningFeePaise,
        totalAmountPaise: b.totalAmountPaise,
        currency: b.currency,
      },
    };
  }

  /**
   * Creates a 10-minute temporary booking hold with strict PostgreSQL row-level locking
   * to guarantee that concurrent requests serialize and cannot double-book the same dates.
   */
  async createHold(userId: string, dto: CreateBookingHoldDto): Promise<SerializedBookingResponse> {
    // 1. Initial date validation
    const { checkIn, checkOut, nights } = validateBookingDates(dto.checkIn, dto.checkOut);

    // 2. Interactive PostgreSQL transaction with property row lock
    // eslint-disable-next-line prefer-const
    let txResult!: { booking: Booking; propertySlug: string };
    try {
      txResult = await this.prisma.$transaction(
      async (tx) => {
        // Step A: Acquire row lock on the property record
        const properties = await tx.$queryRaw<
          {
            id: string;
            host_profile_id: string;
            slug: string;
            title: string;
            city: string;
            status: PropertyStatus;
            moderation_status: PropertyModerationStatus;
            max_guests: number;
            price_per_night_paise: number;
            cleaning_fee_paise: number;
            currency: string;
          }[]
        >`
        SELECT id, host_profile_id, slug, title, city, status, moderation_status, max_guests, price_per_night_paise, cleaning_fee_paise, currency
        FROM properties
        WHERE slug = ${dto.propertySlug}
        FOR UPDATE
      `;

        if (properties.length === 0) {
          throw new NotFoundException(`Property "${dto.propertySlug}" was not found.`);
        }

        const property = properties[0];

        // Step B: Validate property is published and approved
        if (
          property.status !== PropertyStatus.PUBLISHED ||
          property.moderation_status !== PropertyModerationStatus.APPROVED
        ) {
          throw new BadRequestException('Only published and approved properties can be reserved.');
        }

        // Step C: Validate host is active and prevent hosts from booking their own property
        const hostProfiles = await tx.$queryRaw<{ user_id: string; status: HostStatus }[]>`
        SELECT user_id, status FROM host_profiles WHERE id = ${property.host_profile_id}
      `;

        if (hostProfiles.length === 0 || hostProfiles[0].status !== HostStatus.ACTIVE) {
          throw new BadRequestException('This property is not currently accepting bookings.');
        }

        if (hostProfiles[0].user_id === userId) {
          throw new ForbiddenException('You cannot book your own property.');
        }

        // Step D: Validate guest capacity
        if (dto.guestCount < 1 || dto.guestCount > property.max_guests) {
          throw new BadRequestException(
            `Guest count must be between 1 and ${property.max_guests} for this property.`,
          );
        }

        // Step E: Expire stale holds for this property under the transaction
        await tx.$executeRaw`
        UPDATE bookings
        SET status = 'EXPIRED', expired_at = CURRENT_TIMESTAMP
        WHERE property_id = ${property.id}
          AND status IN ('HOLD', 'PAYMENT_PENDING')
          AND hold_expires_at <= CURRENT_TIMESTAMP
      `;

        // Step F: Check for overlapping active reservations in [checkIn, checkOut)
        const overlaps = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bookings
        WHERE property_id = ${property.id}
          AND (
            status = 'CONFIRMED'
            OR (status IN ('HOLD', 'PAYMENT_PENDING') AND (hold_expires_at IS NULL OR hold_expires_at > CURRENT_TIMESTAMP))
          )
          AND check_in < ${checkOut}::date
          AND check_out > ${checkIn}::date
        LIMIT 1
      `;

        if (overlaps.length > 0) {
          throw new ConflictException(
            'The selected dates are no longer available for this property.',
          );
        }

        // Step G: Calculate exact pricing snapshot using integer paise
        const pricePerNightPaise = property.price_per_night_paise;
        const nightlySubtotalPaise = pricePerNightPaise * nights;
        const cleaningFeePaise = property.cleaning_fee_paise;
        const totalAmountPaise = nightlySubtotalPaise + cleaningFeePaise;

        // Fetch cover image for snapshot
        const coverImages = await tx.$queryRaw<{ secure_url: string }[]>`
        SELECT secure_url FROM property_images
        WHERE property_id = ${property.id}
        ORDER BY is_cover DESC, sort_order ASC
        LIMIT 1
      `;
        const coverImageUrl = coverImages[0]?.secure_url || null;

        // Step H: Generate unique reference and 10-minute hold expiration
        const bookingReference = generateBookingReference();
        const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const booking = await tx.booking.create({
          data: {
            bookingReference,
            userId,
            propertyId: property.id,
            checkIn,
            checkOut,
            nights,
            guestCount: dto.guestCount,
            propertyTitleSnapshot: property.title,
            propertySlugSnapshot: property.slug,
            propertyCitySnapshot: property.city,
            propertyCoverImageSnapshot: coverImageUrl,
            pricePerNightPaise,
            cleaningFeePaise,
            nightlySubtotalPaise,
            totalAmountPaise,
            currency: property.currency,
            status: BookingStatus.HOLD,
            holdExpiresAt,
          },
        });

        return { booking, propertySlug: property.slug };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
    } catch (err: unknown) {
      // PostgreSQL exclusion constraint violation (23P01) surfaces as
      // PrismaClientUnknownRequestError — convert it to a friendly 409.
      if (
        err instanceof Prisma.PrismaClientUnknownRequestError &&
        (err.message.includes('23P01') ||
          err.message.includes('no_overlapping_active_bookings'))
      ) {
        throw new ConflictException(
          'The selected dates are no longer available. Please choose different dates.',
        );
      }
      throw err;
    }

    // 3. Post-transaction tasks (Queue delayed BullMQ job & invalidate cache)
    try {
      await this.expirationQueue.add(
        'expire-booking-hold',
        {
          bookingId: txResult.booking.id,
          bookingReference: txResult.booking.bookingReference,
          propertyId: txResult.booking.propertyId,
          propertySlug: txResult.propertySlug,
        },
        {
          delay: 10 * 60 * 1000,
          jobId: `expire-${txResult.booking.id}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to schedule BullMQ expiration job: ${err instanceof Error ? err.message : String(err)}. Database lazy expiration will handle fallback.`,
      );
    }

    await this.availabilityService.invalidateAvailabilityCache(txResult.propertySlug);

    return this.serializeBooking(txResult.booking);
  }

  /**
   * Retrieves sanitized details for a booking owned exclusively by the authenticated user.
   */
  async getBookingByReference(
    userId: string,
    bookingReference: string,
  ): Promise<SerializedBookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
    });

    if (!booking || booking.userId !== userId) {
      throw new NotFoundException(`Booking "${bookingReference}" was not found.`);
    }

    // Lazy expiration if past holdExpiresAt
    if (
      (booking.status === BookingStatus.HOLD || booking.status === BookingStatus.PAYMENT_PENDING) &&
      booking.holdExpiresAt &&
      booking.holdExpiresAt <= new Date()
    ) {
      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.EXPIRED,
          expiredAt: new Date(),
        },
      });
      return this.serializeBooking(updated);
    }

    // Lazy completion if confirmed and checkout date has passed
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    if (booking.status === BookingStatus.CONFIRMED && booking.checkOut < todayUtc) {
      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: booking.completedAt ?? new Date(),
        },
      });
      return this.serializeBooking(updated);
    }

    return this.serializeBooking(booking);
  }

  /**
   * Cancels an active temporary hold owned by the authenticated user.
   */
  async cancelHold(userId: string, bookingReference: string): Promise<SerializedBookingResponse> {
    const updatedBooking = await this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { bookingReference },
        });

        if (!booking || booking.userId !== userId) {
          throw new NotFoundException(`Booking "${bookingReference}" was not found.`);
        }

        if (booking.status !== BookingStatus.HOLD) {
          throw new BadRequestException('Only active temporary holds can be cancelled.');
        }

        // Check if already expired
        if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.EXPIRED,
              expiredAt: new Date(),
            },
          });
          throw new BadRequestException('This temporary hold has already expired.');
        }

        // Lock property row and cancel hold
        await tx.$queryRaw`SELECT id FROM properties WHERE id = ${booking.propertyId} FOR UPDATE`;

        const cancelled = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        return cancelled;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    // Invalidate availability cache
    await this.availabilityService.invalidateAvailabilityCache(updatedBooking.propertySlugSnapshot);

    return this.serializeBooking(updatedBooking);
  }

  /**
   * Returns paginated booking history belonging exclusively to the authenticated user.
   */
  async getUserBookings(
    userId: string,
    query: BookingQueryDto,
  ): Promise<{
    items: SerializedBookingResponse[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: { userId: string; status?: BookingStatus } = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, rawBookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Lazy expiration on stale holds & lazy completion on past checkouts
    const now = new Date();
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const items = await Promise.all(
      rawBookings.map(async (b) => {
        if (
          (b.status === BookingStatus.HOLD || b.status === BookingStatus.PAYMENT_PENDING) &&
          b.holdExpiresAt &&
          b.holdExpiresAt <= now
        ) {
          const updated = await this.prisma.booking.update({
            where: { id: b.id },
            data: {
              status: BookingStatus.EXPIRED,
              expiredAt: new Date(),
            },
          });
          return this.serializeBooking(updated);
        }

        if (b.status === BookingStatus.CONFIRMED && b.checkOut < todayUtc) {
          const updated = await this.prisma.booking.update({
            where: { id: b.id },
            data: {
              status: BookingStatus.COMPLETED,
              completedAt: b.completedAt ?? new Date(),
            },
          });
          return this.serializeBooking(updated);
        }

        return this.serializeBooking(b);
      }),
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Reconciliation sweep: transitions any abandoned/missed holds past expiry time to EXPIRED.
   */
  async cleanupExpiredHolds(): Promise<number> {
    const result = await this.prisma.$executeRaw`
      UPDATE bookings
      SET status = 'EXPIRED', expired_at = CURRENT_TIMESTAMP
      WHERE status IN ('HOLD', 'PAYMENT_PENDING')
        AND hold_expires_at <= CURRENT_TIMESTAMP
    `;
    return result;
  }

  /**
   * Scheduled completion sweep: transitions CONFIRMED bookings whose checkout date has passed to COMPLETED.
   * Compares UTC calendar dates, sets completedAt once, and never touches cancelled/expired/refunded bookings.
   */
  async completePastConfirmedBookings(): Promise<number> {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const eligibleBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        checkOut: {
          lt: todayUtc,
        },
      },
      select: { id: true },
    });

    if (eligibleBookings.length === 0) {
      return 0;
    }

    const ids = eligibleBookings.map((b) => b.id);
    const updated = await this.prisma.booking.updateMany({
      where: {
        id: { in: ids },
        status: BookingStatus.CONFIRMED,
      },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Completed ${updated.count} confirmed booking(s) whose checkout date has passed.`);
    return updated.count;
  }
}
