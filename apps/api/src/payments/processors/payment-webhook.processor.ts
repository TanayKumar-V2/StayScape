import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentReconciliationService } from '../services/payment-reconciliation.service';
import { WebhookProcessingStatus } from '@prisma/client';
import { RazorpayPaymentResult } from '../razorpay.service';

export interface WebhookJobData {
  eventId: string;
  event: string;
  payload: {
    entity?: string;
    event?: string;
    payload?: {
      payment?: {
        entity?: Record<string, unknown>;
      };
      order?: {
        entity?: Record<string, unknown>;
      };
      refund?: {
        entity?: Record<string, unknown>;
      };
    };
  };
}

@Processor('payment-webhooks')
export class PaymentWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliationService: PaymentReconciliationService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { eventId, event, payload } = job.data;
    this.logger.log(`Processing webhook job for event "${event}" (ID: ${eventId})...`);

    // Mark as PROCESSING in inbox
    await this.prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: {
        status: WebhookProcessingStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });

    try {
      const eventPayload = payload?.payload;

      if (event === 'payment.captured' || event === 'payment.failed') {
        const paymentEntity = eventPayload?.payment?.entity;
        if (paymentEntity) {
          const razorpayOrderId = (paymentEntity['order_id'] as string) || '';
          const razorpayPaymentId = (paymentEntity['id'] as string) || '';

          if (razorpayOrderId && razorpayPaymentId) {
            await this.reconciliationService.reconcilePayment({
              razorpayOrderId,
              razorpayPaymentId,
              paymentDetails: paymentEntity as unknown as RazorpayPaymentResult,
              source: 'WEBHOOK',
            });
          } else {
            this.logger.warn(
              `Missing order_id or id in payment webhook payload for event ${eventId}`,
            );
          }
        }
      } else if (event === 'refund.processed') {
        const refundEntity = eventPayload?.refund?.entity;
        if (refundEntity) {
          const refundId = (refundEntity['id'] as string) || '';
          this.logger.log(`Refund processed webhook received for refund ID: ${refundId}`);
          await this.prisma.paymentRefund.updateMany({
            where: { razorpayRefundId: refundId },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
            },
          });
        }
      } else {
        this.logger.log(`Unhandled webhook event type "${event}", acknowledged.`);
      }

      // Mark as PROCESSED
      await this.prisma.razorpayWebhookEvent.update({
        where: { eventId },
        data: {
          status: WebhookProcessingStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook processing failed for event "${eventId}": ${errorMessage}`);

      await this.prisma.razorpayWebhookEvent.update({
        where: { eventId },
        data: {
          status: WebhookProcessingStatus.FAILED,
          lastError: errorMessage,
        },
      });

      throw err;
    }
  }
}
