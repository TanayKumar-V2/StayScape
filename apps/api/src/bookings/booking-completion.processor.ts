import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BookingsService } from './bookings.service';

export interface BookingCompletionJobData {
  triggeredAt?: string;
}

@Processor('booking-completion')
export class BookingCompletionProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingCompletionProcessor.name);

  constructor(private readonly bookingsService: BookingsService) {
    super();
  }

  async process(job: Job<BookingCompletionJobData>): Promise<{ transitionedCount: number }> {
    this.logger.log(`Running booking completion processor for job ${job.id}...`);

    try {
      const transitionedCount = await this.bookingsService.completePastConfirmedBookings();
      this.logger.log(
        `Booking completion job ${job.id} finished: transitioned ${transitionedCount} booking(s).`,
      );
      return { transitionedCount };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to complete past confirmed bookings: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
