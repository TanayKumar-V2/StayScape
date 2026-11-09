import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderResponseDto } from './dto/payment-order-response.dto';
import { PaymentStatusResponseDto } from './dto/payment-status-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingReference')
export class BookingPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/order')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'payment_order',
    limit: 15,
    windowSeconds: 60,
    byUser: true,
    failClosed: true,
  })
  @ApiOperation({
    summary: 'Generate or retrieve Razorpay payment order for an active booking hold',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment order generated successfully',
    type: CreatePaymentOrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Booking expired, already paid, or cancelled',
  })
  @ApiResponse({
    status: 403,
    description: 'Booking does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async createPaymentOrder(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('bookingReference') bookingReference: string,
  ): Promise<CreatePaymentOrderResponseDto> {
    return this.paymentsService.createPaymentOrder(user.id, bookingReference);
  }

  @Get('payment-status')
  @ApiOperation({
    summary: 'Get sanitized payment status and transaction summary for a booking',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async getPaymentStatus(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('bookingReference') bookingReference: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.getPaymentStatus(user.id, bookingReference);
  }
}
