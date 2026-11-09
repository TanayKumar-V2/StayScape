import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingHoldDto } from './dto/create-booking-hold.dto';
import { BookingQueryDto } from './dto/booking-query.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('holds')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'booking_hold',
    limit: 20,
    windowSeconds: 60,
    byUser: true,
    failClosed: true,
  })
  @ApiOperation({
    summary: 'Create a 10-minute temporary booking hold for a published property',
  })
  @ApiResponse({
    status: 201,
    description: 'Temporary booking hold created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid dates, guest capacity exceeded, or unpublished property',
  })
  @ApiResponse({
    status: 403,
    description: 'Host attempting to book their own property',
  })
  @ApiResponse({
    status: 409,
    description: 'Dates already reserved by another guest (conflict)',
  })
  async createHold(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: CreateBookingHoldDto,
  ) {
    return this.bookingsService.createHold(user.id, dto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get paginated booking history for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User booking history retrieved successfully',
  })
  async getUserBookings(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.getUserBookings(user.id, query);
  }

  @Get(':bookingReference')
  @ApiOperation({
    summary: 'Get detailed booking summary by booking reference',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found or does not belong to user',
  })
  async getBookingDetail(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('bookingReference') bookingReference: string,
  ) {
    return this.bookingsService.getBookingByReference(user.id, bookingReference);
  }

  @Post('complete-past')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Trigger transition of CONFIRMED bookings with past checkout dates to COMPLETED (admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transitioned completed bookings count',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators may trigger the completion sweep',
  })
  async completePastBookings() {
    const count = await this.bookingsService.completePastConfirmedBookings();
    return { count };
  }

  @Delete(':bookingReference/hold')
  @ApiOperation({
    summary: 'Cancel an active temporary booking hold',
  })
  @ApiResponse({
    status: 200,
    description: 'Temporary hold cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Booking is not an active hold or has already expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found or does not belong to user',
  })
  async cancelHold(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('bookingReference') bookingReference: string,
  ) {
    return this.bookingsService.cancelHold(user.id, bookingReference);
  }
}
