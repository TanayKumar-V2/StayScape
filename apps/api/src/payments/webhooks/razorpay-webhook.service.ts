import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../razorpay.service';
import { WebhookProcessingStatus, Prisma } from '@prisma/client';

export interface WebhookProcessingResult {
  received: boolean;
  status: string;
  eventId: string;
}

@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    @InjectQueue('payment-webhooks') private readonly webhookQueue: Queue,
  ) {}

  /**
   * Ingests, authenticates and enqueues a Razorpay webhook event for asynchronous processing.
   */
  async handleWebhook(
    rawBody: Buffer | string | undefined,
    signature: string | undefined,
    eventId: string | undefined,
    body: Record<string, unknown>,
  ): Promise<WebhookProcessingResult> {
    if (!signature) {
      this.logger.warn('Webhook request rejected: missing X-Razorpay-Signature header.');
      throw new BadRequestException('Missing X-Razorpay-Signature header.');
    }

    if (!rawBody) {
      this.logger.warn('Webhook request rejected: raw body unavailable.');
      throw new BadRequestException('Raw request body unavailable for signature verification.');
    }

    // 1. Verify HMAC-SHA256 signature
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Webhook request rejected: invalid cryptographic signature.');
      throw new BadRequestException('Invalid webhook signature.');
    }

    // Generate a deterministic fallback event ID when Razorpay omits the
    // X-Razorpay-Event-Id header: event type + entity id + entity timestamps
    // make a stable identity for deduplication. Purely random fallbacks would
    // silently defeat the inbox dedupe on redelivered webhooks.
    const paymentEntityId = (
      (body['payload'] as Record<string, unknown> | undefined)?.['payment'] as
        | Record<string, unknown>
        | undefined
    )?.['id'];
    const refundEntityId = (
      (body['payload'] as Record<string, unknown> | undefined)?.['refund'] as
        | Record<string, unknown>
        | undefined
    )?.['id'];
    const eventName = (body['event'] as string) || 'unknown';

    const entityCandidate = paymentEntityId || refundEntityId;
    const entityKey = typeof entityCandidate === 'string' ? entityCandidate : 'unknown';
    const resolvedEventId =
      eventId || (body['event_id'] as string) || `${eventName}_${entityKey}_fallback`;

    this.logger.log(`Webhook received: "${eventName}" with event ID "${resolvedEventId}"`);

    // 2. Check deduplication inbox
    const existing = await this.prisma.razorpayWebhookEvent.findUnique({
      where: { eventId: resolvedEventId },
    });

    if (existing && existing.status === WebhookProcessingStatus.PROCESSED) {
      this.logger.log(
        `Webhook event "${resolvedEventId}" has already been processed. Returning duplicate acknowledgement.`,
      );
      return {
        received: true,
        status: 'already_processed',
        eventId: resolvedEventId,
      };
    }

    // 3. Persist event in durable inbox
    if (!existing) {
      await this.prisma.razorpayWebhookEvent.create({
        data: {
          eventId: resolvedEventId,
          event: eventName,
          status: WebhookProcessingStatus.RECEIVED,
          payload: body as unknown as Prisma.InputJsonValue,
          signature,
        },
      });
    }

    // 4. Dispatch to BullMQ for asynchronous processing
    try {
      await this.webhookQueue.add(
        'process-webhook',
        {
          eventId: resolvedEventId,
          event: eventName,
          payload: body,
        },
        {
          jobId: `webhook-${resolvedEventId}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue webhook job for event "${resolvedEventId}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // The inbox row is durable, but acknowledge failure so Razorpay retries;
      // a repeated delivery will enqueue this same idempotent event again.
      throw new ServiceUnavailableException('Webhook temporarily unavailable; retry delivery.');
    }

    return {
      received: true,
      status: 'enqueued',
      eventId: resolvedEventId,
    };
  }
}
