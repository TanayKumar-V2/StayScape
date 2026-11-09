import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { ReconcilePaymentResult } from './services/payment-reconciliation.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({
    keyPrefix: 'payment_verify',
    limit: 20,
    windowSeconds: 60,
    byUser: true,
    failClosed: true,
  })
  @ApiOperation({
    summary: 'Verify Razorpay payment signature and confirm booking reservation',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment signature verified and transaction reconciled',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or payment verification failed',
  })
  async verifyPayment(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: VerifyPaymentDto,
  ): Promise<ReconcilePaymentResult> {
    return this.paymentsService.verifyPayment(user.id, dto);
  }
}
