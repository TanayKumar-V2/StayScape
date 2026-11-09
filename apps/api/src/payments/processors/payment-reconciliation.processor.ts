import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../razorpay.service';
import { PaymentReconciliationService } from '../services/payment-reconciliation.service';
import { BookingStatus, PaymentOrderStatus, RefundStatus } from '@prisma/client';

export interface ReconciliationJobData {
  orderId?: string;
  checkWindowMinutes?: number;
  checkRefundRecoveries?: boolean;
}

/**
 * Outbox-style reconciliation sweep:
 *
 * 1. For every payment order of an unresolved booking in the recent window,
 *    asks Razorpay for the payments on that order. Any CAPTURED payment that
 *    never reached the booking (crash after order creation, webhook loss, user
 *    closing the browser before the callback) is reconciled and either
 *    CONFIRMS the booking or schedules a compensation refund.
 *
 * 2. Recovers lost refunds: refund rows stuck in REQUESTED/FAILED whose
 *    provider-side refund actually exists (successful API call whose response
 *    was lost) are marked PROCESSED so a retry never double-refunds.
 *
 * Jobs are idempotent: reconciliation=${orderId} jobIds dedupe; scanning reads
 * produce no state changes unless the provider truth requires one.
 */
@Processor('payment-reconciliation')
export class PaymentReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReconciliationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly reconciliationService: PaymentReconciliationService,
    @InjectQueue('payment-refunds') private readonly refundQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ReconciliationJobData>): Promise<void> {
    this.logger.log(`Running payment reconciliation sweep for job ${job.id ?? '(repeatable)'}`);

    // ── Targeted order reconciliation ───────────────────────────────────────
    if (job.data?.orderId) {
      await this.reconcileSingleOrder(job.data.orderId);
      return;
    }

    const windowMinutes = Math.min(Math.max(job.data?.checkWindowMinutes ?? 60, 5), 24 * 60);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    // ── 1. Reconcile unresolved bookings' orders from provider truth ─────────
    const pendingOrders = await this.prisma.paymentOrder.findMany({
      where: {
        status: { in: [PaymentOrderStatus.CREATED, PaymentOrderStatus.CREATION_UNKNOWN] },
        createdAt: { gte: since },
        booking: { status: { in: [BookingStatus.HOLD, BookingStatus.PAYMENT_PENDING] } },
      },
      select: { razorpayOrderId: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const order of pendingOrders) {
      try {
        await this.reconcileSingleOrder(order.razorpayOrderId);
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to reconcile order ${order.razorpayOrderId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // ── 2. Recover lost refunds (captured→FAILED without provider evidence) ──
    await this.recoverLostRefunds();
  }

  private async reconcileSingleOrder(razorpayOrderId: string): Promise<void> {
    const payments = await this.razorpayService.fetchOrderPayments(razorpayOrderId);

    for (const payment of payments) {
      // Only captured payments may fulfil a booking; failures are recorded by
      // normal reconciliation anyway.
      const isCaptured =
        payment.status === 'captured' || (payment.status === 'authorized' && payment.captured);
      const paymentId = payment.id;

      if (!paymentId) {
        continue;
      }

      let paymentDetails = payment;
      if (isCaptured) {
        // Authoritative payment payload (captures all refund/error metadata)
        try {
          paymentDetails = await this.razorpayService.fetchPayment(paymentId);
        } catch (err: unknown) {
          this.logger.warn(
            `Could not fetch authoritative payment "${paymentId}" during reconciliation: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          continue;
        }
      }

      const result = await this.reconciliationService.reconcilePayment({
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        paymentDetails,
        source: 'RECONCILIATION_JOB',
      });

      if (result.success) {
        this.logger.log(
          `Reconciled missed captured payment "${paymentId}" for order "${razorpayOrderId}": booking confirmed.`,
        );
        return; // order resolved — no need to process further payments
      }
    }
  }

  /**
   * Detects refunds whose Razorpay call actually succeeded but whose response
   * was lost before persistence. Their DB row is stuck in PROCESSING/FAILED;
   * the provider has the authoritative refund created_at > this row's
   * updatedAt. Those rows are marked PROCESSED instead of being retried,
   * preventing duplicate refunds on provider retry.
   */
  private async recoverLostRefunds(): Promise<void> {
    const stuckRefunds = await this.prisma.paymentRefund.findMany({
      where: {
        status: { in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING, RefundStatus.FAILED] },
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        paymentTransaction: true,
      },
      take: 50,
      orderBy: { updatedAt: 'asc' },
    });

    if (stuckRefunds.length === 0) return;

    for (const refund of stuckRefunds) {
      try {
        // Razorpay refund IDs present on the provider payment that are not
        // recorded locally indicate a lost response for this payment.
        const providerRefunds = await this.razorpayService.fetchRefundsFromPayment(
          refund.razorpayPaymentId,
        );
        const recordedIds = await this.prisma.paymentRefund.findMany({
          where: { razorpayPaymentId: refund.razorpayPaymentId },
          select: { razorpayRefundId: true },
        });
        const recordedIdSet = new Set(recordedIds.map((r) => r.razorpayRefundId).filter(Boolean));
        const unrecorded = providerRefunds.find(
          (r) => r.status === 'processed' && !recordedIdSet.has(r.id),
        );

        if (unrecorded) {
          this.logger.warn(
            `Recovering lost refund for payment "${refund.razorpayPaymentId}": provider refund "${unrecorded.id}" exists but is unrecorded. Marking refund "${refund.id}" PROCESSED.`,
          );
          await this.prisma.paymentRefund.update({
            where: { id: refund.id },
            data: {
              status: RefundStatus.PROCESSED,
              processedAt: new Date(),
              razorpayRefundId: unrecorded.id,
              rawPayload: unrecorded as unknown as import('@prisma/client').Prisma.InputJsonValue,
            },
          });
        } else if (refund.status === RefundStatus.REQUESTED) {
          // REQUESTED rows never claimed by a processor get re-enqueued
          await this.refundQueue.add(
            'execute-refund',
            {
              refundId: refund.id,
              paymentTransactionId: refund.paymentTransactionId,
              amountPaise: refund.amountPaise,
              reason: refund.reason ?? 'Reconciliation requeue',
            },
            {
              jobId: `refund-${refund.id}-requeue`,
              attempts: 3,
              backoff: { type: 'exponential', delay: 15000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Refund recovery check failed for "${refund.id}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
