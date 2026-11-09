import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { AdminModule } from '../admin/admin.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingExpirationProcessor } from './booking-expiration.processor';
import { BookingCompletionProcessor } from './booking-completion.processor';

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule,
    AdminModule,
    BullModule.registerQueue(
      {
        name: 'booking-expiration',
      },
      {
        name: 'booking-completion',
      },
    ),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationProcessor, BookingCompletionProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
