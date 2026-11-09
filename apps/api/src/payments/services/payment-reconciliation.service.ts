import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../../availability/availability.service';
import {
  BookingStatus,
  PaymentOrderStatus,
  PaymentTransactionStatus,
  RefundStatus,
  Prisma,
} from '@prisma/client';
import { RazorpayPaymentResult } from '../razorpay.service';

export interface ReconcilePaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  paymentDetails: RazorpayPaymentResult;
  source: 'CLIENT_CALLBACK' | 'WEBHOOK' | 'RECONCILIATION_JOB';
}

export interface ReconcilePaymentResult {
  success: boolean;
  bookingReference: string;
  status: BookingStatus;
  message?: string;
  error?: string;
}

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    @InjectQueue('payment-refunds') private readonly refundQueue: Queue,
  ) {}

  /**
   * Atomically reconciles a payment event against a booking and payment order.
   * Single transactional source of truth for both browser verification callbacks and webhook events.
   */
  async reconcilePayment(input: ReconcilePaymentInput): Promise<ReconcilePaymentResult> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDetails, source } = input;

    this.logger.log(
      `Reconciling payment "${razorpayPaymentId}" for order "${razorpayOrderId}" from source "${source}" (payment status: ${paymentDetails.status})`,
    );

    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Locate PaymentOrder
        const paymentOrder = await tx.paymentOrder.findUnique({
          where: { razorpayOrderId },
          include: {
            booking: true,
            transactions: true,
          },
        });

        if (!paymentOrder) {
          throw new NotFoundException(
            `PaymentOrder with Razorpay order ID "${razorpayOrderId}" was not found.`,
          );
        }

        const bookingId = paymentOrder.bookingId;

        // 2. Lock the target booking row with SELECT ... FOR UPDATE to eliminate race conditions
        const lockedRows = await tx.$queryRaw<
          Array<{
            id: string;
            booking_reference: string;
            status: BookingStatus;
            hold_expires_at: Date | null;
            property_id: string;
            property_slug_snapshot: string;
            total_amount_paise: number;
          }>
        >`
          SELECT id, booking_reference, status, hold_expires_at, property_id, property_slug_snapshot, total_amount_paise
          FROM bookings
          WHERE id = ${bookingId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundException(`Booking with id "${bookingId}" was not found.`);
        }

        const lockedBooking = lockedRows[0];
        const isPaymentCaptured =
          paymentDetails.status === 'captured' ||
          (paymentDetails.status === 'authorized' && paymentDetails.captured === true);
        const isPaymentFailed = paymentDetails.status === 'failed';

        // ── PROVIDER BINDING CHECK (defense in depth) ────────────────────────
        // The stored Razorpay order ID is authoritative. Never reconcile a
        // payment that was issued for a different order.
        if (paymentDetails.order_id && paymentDetails.order_id !== razorpayOrderId) {
          this.logger.error(
            `Payment "${razorpayPaymentId}" belongs to order "${paymentDetails.order_id}" but reconciliation was invoked for order "${razorpayOrderId}". Rejecting mismatched order binding.`,
          );
          await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.FAILED,
            paymentDetails,
          );
          await tx.booking.update({
            where: { id: lockedBooking.id },
            data: { status: BookingStatus.PAYMENT_FAILED },
          });
          return {
            success: false,
            bookingReference: lockedBooking.booking_reference,
            status: BookingStatus.PAYMENT_FAILED,
            error: 'Payment does not belong to this order.',
          };
        }

        // ── AMOUNT / CURRENCY BINDING CHECKS ─────────────────────────────────
        // A captured payment whose amount or currency does not match the stored
        // order may never confirm a reservation. It is recorded and scheduled
        // for a full compensation refund instead.
        const storedAmountPaise = paymentOrder.amountPaise;
        const storedCurrency = paymentOrder.currency;
        const providerAmount = paymentDetails.amount ?? 0;
        const amountMatches = providerAmount === storedAmountPaise;
        const currencyMatches = paymentDetails.currency === storedCurrency;

        if (isPaymentCaptured && (!amountMatches || !currencyMatches)) {
          this.logger.error(
            `Payment "${razorpayPaymentId}" captured with mismatched binding (provider ${providerAmount} ${paymentDetails.currency ?? 'n/a'} vs stored ${storedAmountPaise} ${storedCurrency}) for booking "${lockedBooking.booking_reference}". Scheduling full refund.`,
          );

          const txRecord = await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.REFUND_PENDING,
            paymentDetails,
          );

          const refund = await tx.paymentRefund.create({
            data: {
              paymentTransactionId: txRecord.id,
              razorpayPaymentId,
              amountPaise: providerAmount || storedAmountPaise,
              currency: paymentDetails.currency || storedCurrency || 'INR',
              status: RefundStatus.REQUESTED,
              reason: 'Payment amount/currency does not match the reserved order',
              idempotencyKey: `binding-refund-${razorpayPaymentId}`,
              rawPayload: paymentDetails as unknown as Prisma.InputJsonValue,
            },
          });

          await this.enqueueRefundJob(
            refund.id,
            txRecord.id,
            refund.amountPaise,
            refund.reason ?? '',
          );

          return {
            success: false,
            bookingReference: lockedBooking.booking_reference,
            status: lockedBooking.status,
            message:
              'Payment amount was inconsistent with the reservation. A refund has been initiated.',
          };
        }

        // 3. Check for existing transaction record
        const existingTx = await tx.paymentTransaction.findUnique({
          where: { razorpayPaymentId },
        });

        // ── SCENARIO A: Booking is already CONFIRMED ─────────────────────────────
        if (lockedBooking.status === BookingStatus.CONFIRMED) {
          if (existingTx && existingTx.status === PaymentTransactionStatus.CAPTURED) {
            this.logger.log(
              `Idempotent reconciliation: Booking "${lockedBooking.booking_reference}" is already CONFIRMED with payment "${razorpayPaymentId}".`,
            );
            return {
              success: true,
              bookingReference: lockedBooking.booking_reference,
              status: BookingStatus.CONFIRMED,
              message: 'Booking is already confirmed.',
            };
          }

          // If a DIFFERENT captured payment arrives for an already confirmed booking, initiate immediate compensation refund
          if (
            isPaymentCaptured &&
            (!existingTx || existingTx.status !== PaymentTransactionStatus.CAPTURED)
          ) {
            this.logger.warn(
              `Duplicate captured payment "${razorpayPaymentId}" received for already CONFIRMED booking "${lockedBooking.booking_reference}". Initiating compensation refund.`,
            );

            const txRecord = await this.upsertTransaction(
              tx,
              paymentOrder.id,
              razorpayPaymentId,
              razorpayOrderId,
              razorpaySignature,
              PaymentTransactionStatus.REFUND_PENDING,
              paymentDetails,
            );

            const refund = await tx.paymentRefund.create({
              data: {
                paymentTransactionId: txRecord.id,
                razorpayPaymentId,
                amountPaise: paymentDetails.amount || lockedBooking.total_amount_paise,
                currency: paymentDetails.currency || 'INR',
                status: RefundStatus.REQUESTED,
                reason: 'Duplicate payment for already confirmed booking',
                idempotencyKey: `dup-refund-${razorpayPaymentId}`,
                rawPayload: paymentDetails as unknown as Prisma.InputJsonValue,
              },
            });

            await this.enqueueRefundJob(
              refund.id,
              txRecord.id,
              refund.amountPaise,
              refund.reason || '',
            );

            return {
              success: false,
              bookingReference: lockedBooking.booking_reference,
              status: BookingStatus.CONFIRMED,
              message: 'Duplicate payment detected. A full automatic refund has been queued.',
            };
          }
        }

        // ── SCENARIO B: Payment Failed ──────────────────────────────────────────
        if (isPaymentFailed) {
          this.logger.warn(
            `Payment "${razorpayPaymentId}" failed for booking "${lockedBooking.booking_reference}": ${paymentDetails.error_description}`,
          );

          await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.FAILED,
            paymentDetails,
          );

          return {
            success: false,
            bookingReference: lockedBooking.booking_reference,
            status: lockedBooking.status,
            error: paymentDetails.error_description || 'Payment failed.',
          };
        }

        // ── SCENARIO C: Payment Captured on Expired Hold ─────────────────────────
        const now = new Date();
        const isHoldExpired =
          lockedBooking.hold_expires_at !== null &&
          new Date(lockedBooking.hold_expires_at).getTime() <= now.getTime();

        if (isHoldExpired && isPaymentCaptured) {
          this.logger.warn(
            `Payment "${razorpayPaymentId}" was captured after hold expired at ${lockedBooking.hold_expires_at?.toISOString()} for booking "${lockedBooking.booking_reference}". Initiating automatic compensation refund.`,
          );

          // Update booking status to REFUND_PENDING
          await tx.booking.update({
            where: { id: lockedBooking.id },
            data: {
              status: BookingStatus.REFUND_PENDING,
            },
          });

          // Record transaction in status REFUND_PENDING
          const txRecord = await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.REFUND_PENDING,
            paymentDetails,
          );

          // Create PaymentRefund record
          const refund = await tx.paymentRefund.create({
            data: {
              paymentTransactionId: txRecord.id,
              razorpayPaymentId,
              amountPaise: paymentDetails.amount || lockedBooking.total_amount_paise,
              currency: paymentDetails.currency || 'INR',
              status: RefundStatus.REQUESTED,
              reason: 'Hold expired before payment completed',
              idempotencyKey: `expired-refund-${razorpayPaymentId}`,
              rawPayload: paymentDetails as unknown as Prisma.InputJsonValue,
            },
          });

          // Dispatch BullMQ refund job
          await this.enqueueRefundJob(
            refund.id,
            txRecord.id,
            refund.amountPaise,
            refund.reason || 'Hold expired',
          );

          return {
            success: false,
            bookingReference: lockedBooking.booking_reference,
            status: BookingStatus.REFUND_PENDING,
            message:
              'The 10-minute reservation hold expired before payment was completed. A full automatic refund has been initiated to your original payment method.',
          };
        }

        // ── SCENARIO D: Payment Captured on Valid Active Hold ────────────────────
        if (isPaymentCaptured) {
          this.logger.log(
            `Payment "${razorpayPaymentId}" captured successfully for active hold "${lockedBooking.booking_reference}". Confirming reservation.`,
          );

          // 1. Confirm booking
          await tx.booking.update({
            where: { id: lockedBooking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: now,
              holdExpiresAt: null,
            },
          });

          // 2. Mark PaymentOrder as CREATED or PAID
          await tx.paymentOrder.update({
            where: { id: paymentOrder.id },
            data: {
              status: PaymentOrderStatus.CREATED,
            },
          });

          // 3. Upsert PaymentTransaction as CAPTURED
          await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.CAPTURED,
            paymentDetails,
          );

          // 4. Invalidate availability cache
          await this.availabilityService.invalidateAvailabilityCache(
            lockedBooking.property_slug_snapshot,
          );

          return {
            success: true,
            bookingReference: lockedBooking.booking_reference,
            status: BookingStatus.CONFIRMED,
            message: 'Reservation confirmed successfully.',
          };
        }

        // ── SCENARIO E: Payment Authorized but not Captured ──────────────────
        // Authorized (two-step) payments stay unconfirmed for fulfilment, but
        // must be recorded so reconciliation can later detect adoption of the
        // payment or a webhook for capture.
        if (paymentDetails.status === 'authorized' && !isPaymentCaptured) {
          this.logger.log(
            `Payment "${razorpayPaymentId}" is authorized (not captured) for booking "${lockedBooking.booking_reference}". Reserving record but not confirming the reservation.`,
          );

          await this.upsertTransaction(
            tx,
            paymentOrder.id,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            PaymentTransactionStatus.AUTHORIZED,
            paymentDetails,
          );

          return {
            success: false,
            bookingReference: lockedBooking.booking_reference,
            status: lockedBooking.status,
            message: `Payment is authorized. The reservation remains unconfirmed until the payment is captured.`,
          };
        }

        // Fallback for pending/other states
        return {
          success: false,
          bookingReference: lockedBooking.booking_reference,
          status: lockedBooking.status,
          message: `Payment status is ${paymentDetails.status}.`,
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }

  private async upsertTransaction(
    tx: Prisma.TransactionClient,
    paymentOrderId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string | undefined,
    status: PaymentTransactionStatus,
    paymentDetails: RazorpayPaymentResult,
  ) {
    const card = paymentDetails.card;
    const isCaptured = status === PaymentTransactionStatus.CAPTURED;

    return await tx.paymentTransaction.upsert({
      where: { razorpayPaymentId },
      create: {
        paymentOrderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature: razorpaySignature ?? null,
        amountPaise: paymentDetails.amount || 0,
        currency: paymentDetails.currency || 'INR',
        status,
        method: paymentDetails.method ?? null,
        bank: paymentDetails.bank ?? null,
        wallet: paymentDetails.wallet ?? null,
        vpa: paymentDetails.vpa ?? null,
        cardId: card?.id ?? null,
        cardNetwork: card?.network ?? null,
        cardLast4: card?.last4 ?? null,
        cardType: card?.type ?? null,
        email: paymentDetails.email ?? null,
        contact: paymentDetails.contact ?? null,
        feePaise: paymentDetails.fee ? Math.round(paymentDetails.fee) : null,
        taxPaise: paymentDetails.tax ? Math.round(paymentDetails.tax) : null,
        errorCode: paymentDetails.error_code ?? null,
        errorDescription: paymentDetails.error_description ?? null,
        errorSource: paymentDetails.error_source ?? null,
        errorStep: paymentDetails.error_step ?? null,
        errorReason: paymentDetails.error_reason ?? null,
        rawPayload: paymentDetails as unknown as Prisma.InputJsonValue,
        verifiedAt: new Date(),
        capturedAt: isCaptured ? new Date() : null,
      },
      update: {
        status,
        method: paymentDetails.method ?? undefined,
        bank: paymentDetails.bank ?? undefined,
        wallet: paymentDetails.wallet ?? undefined,
        vpa: paymentDetails.vpa ?? undefined,
        cardId: card?.id ?? undefined,
        cardNetwork: card?.network ?? undefined,
        cardLast4: card?.last4 ?? undefined,
        cardType: card?.type ?? undefined,
        errorCode: paymentDetails.error_code ?? undefined,
        errorDescription: paymentDetails.error_description ?? undefined,
        rawPayload: paymentDetails as unknown as Prisma.InputJsonValue,
        capturedAt: isCaptured ? new Date() : undefined,
      },
    });
  }

  private async enqueueRefundJob(
    refundId: string,
    paymentTransactionId: string,
    amountPaise: number,
    reason: string,
  ): Promise<void> {
    try {
      await this.refundQueue.add(
        'execute-refund',
        {
          refundId,
          paymentTransactionId,
          amountPaise,
          reason,
        },
        {
          jobId: `refund-${refundId}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue refund job for refund "${refundId}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
