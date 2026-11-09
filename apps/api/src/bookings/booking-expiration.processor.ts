import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { BookingStatus } from '@prisma/client';

export interface BookingExpirationJobData {
  bookingId: string;
  bookingReference: string;
  propertyId: string;
  propertySlug: string;
}

@Processor('booking-expiration')
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {
    super();
  }

  async process(job: Job<BookingExpirationJobData>): Promise<void> {
    const { bookingId, bookingReference, propertyId, propertySlug } = job.data;
    this.logger.log(
      `Processing expiration check for booking ${bookingReference} (${bookingId})...`,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Acquire row lock on the property to serialize with any concurrent hold operations
        await tx.$queryRaw`SELECT id FROM properties WHERE id = ${propertyId} FOR UPDATE`;

        // 2. Fetch the exact booking record
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, status: true, holdExpiresAt: true },
        });

        if (!booking) {
          this.logger.warn(`Booking ${bookingId} not found during expiration processing.`);
          return;
        }

        // 3. Only transition if still in temporary hold/pending state and past expiration time
        const isHoldState =
          booking.status === BookingStatus.HOLD || booking.status === BookingStatus.PAYMENT_PENDING;

        const isExpiredTime = booking.holdExpiresAt !== null && booking.holdExpiresAt <= new Date();

        if (isHoldState && isExpiredTime) {
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.EXPIRED,
              expiredAt: new Date(),
            },
          });
          this.logger.log(`Booking ${bookingReference} transitioned to EXPIRED.`);
        } else {
          this.logger.log(
            `Booking ${bookingReference} was not expired (status: ${booking.status}, holdExpiresAt: ${booking.holdExpiresAt?.toISOString()}).`,
          );
        }
      });

      // 4. Invalidate property availability cache
      await this.availabilityService.invalidateAvailabilityCache(propertySlug);
    } catch (err: unknown) {
      this.logger.error(
        `Error processing expiration for booking ${bookingReference}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
