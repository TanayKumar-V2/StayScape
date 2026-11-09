import { ApiProperty } from '@nestjs/swagger';

export class PaymentOrderSummaryDto {
  @ApiProperty({ example: 'order_EKwxwAgItmmMnv' })
  orderId!: string;

  @ApiProperty({ example: 1250000 })
  amountPaise!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'CREATED' })
  status!: string;
}

export class PaymentTransactionSummaryDto {
  @ApiProperty({ example: 'pay_29MoEsz4rtouPt' })
  razorpayPaymentId!: string;

  @ApiProperty({ example: 'CAPTURED' })
  status!: string;

  @ApiProperty({ example: 'card', nullable: true })
  method?: string | null;

  @ApiProperty({ example: 'HDFC', nullable: true })
  bank?: string | null;

  @ApiProperty({ example: 'wallet', nullable: true })
  wallet?: string | null;

  @ApiProperty({ example: 'user@okhdfcbank', nullable: true })
  vpa?: string | null;

  @ApiProperty({ example: '4242', nullable: true })
  cardLast4?: string | null;

  @ApiProperty({ example: 'Visa', nullable: true })
  cardNetwork?: string | null;

  @ApiProperty({ example: '2026-11-09T10:00:00.000Z', nullable: true })
  capturedAt?: Date | null;

  @ApiProperty({ nullable: true })
  errorCode?: string | null;

  @ApiProperty({ nullable: true })
  errorDescription?: string | null;
}

export class PaymentRefundSummaryDto {
  @ApiProperty({ example: 'rfnd_D01a8s9k7210k', nullable: true })
  id?: string | null;

  @ApiProperty({ example: 'rfnd_D01a8s9k7210k', nullable: true })
  razorpayRefundId?: string | null;

  @ApiProperty({ example: 1250000 })
  amountPaise!: number;

  @ApiProperty({ example: 'PROCESSED' })
  status!: string;

  @ApiProperty({ example: 'Hold expired before payment completed', nullable: true })
  reason?: string | null;

  @ApiProperty({ example: '2026-11-09T10:05:00.000Z', nullable: true })
  processedAt?: Date | null;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: 'BK-20261109-1234' })
  bookingReference!: string;

  @ApiProperty({ example: 'CONFIRMED' })
  bookingStatus!: string;

  @ApiProperty({ example: true })
  isPaid!: boolean;

  @ApiProperty({ type: PaymentOrderSummaryDto, nullable: true })
  order?: PaymentOrderSummaryDto | null;

  @ApiProperty({ type: PaymentTransactionSummaryDto, nullable: true })
  transaction?: PaymentTransactionSummaryDto | null;

  @ApiProperty({ type: PaymentRefundSummaryDto, nullable: true })
  refund?: PaymentRefundSummaryDto | null;
}
