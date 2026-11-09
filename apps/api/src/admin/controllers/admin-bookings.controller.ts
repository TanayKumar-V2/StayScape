import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminBookingsService } from '../services/admin-bookings.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBookingsController {
  constructor(private readonly bookingsService: AdminBookingsService) {}

  @Get()
  async getBookings(@Query() query: AdminPaginationQueryDto & { propertyId?: string }) {
    return this.bookingsService.getBookings(query);
  }

  @Get(':bookingReference')
  async getBookingDetails(@Param('bookingReference') bookingReference: string) {
    return this.bookingsService.getBookingDetails(bookingReference);
  }
}

