import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { RazorpayService } from './razorpay.service';
import { PaymentReconciliationService } from './services/payment-reconciliation.service';
import { RefundService } from './services/refund.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BookingPaymentsController } from './booking-payments.controller';
import { RazorpayWebhookController } from './webhooks/razorpay-webhook.controller';
import { RazorpayWebhookService } from './webhooks/razorpay-webhook.service';
import { PaymentWebhookProcessor } from './processors/payment-webhook.processor';
import { PaymentRefundProcessor } from './processors/payment-refund.processor';
import { PaymentReconciliationProcessor } from './processors/payment-reconciliation.processor';

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule,
    BullModule.registerQueue(
      { name: 'payment-webhooks' },
      { name: 'payment-refunds' },
      { name: 'payment-reconciliation' },
    ),
  ],
  controllers: [PaymentsController, BookingPaymentsController, RazorpayWebhookController],
  providers: [
    RazorpayService,
    PaymentReconciliationService,
    RefundService,
    PaymentsService,
    RazorpayWebhookService,
    PaymentWebhookProcessor,
    PaymentRefundProcessor,
    PaymentReconciliationProcessor,
  ],
  exports: [PaymentsService, RazorpayService, PaymentReconciliationService, RefundService],
})
export class PaymentsModule {}
