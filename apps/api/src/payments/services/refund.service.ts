import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../razorpay.service';
import { BookingStatus, PaymentTransactionStatus, RefundStatus, Prisma } from '@prisma/client';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

  /**
   * Executes a scheduled refund against the Razorpay API and updates transactional records.
   */
  async executeRefund(refundId: string): Promise<void> {
    this.logger.log(`Executing refund for PaymentRefund ID "${refundId}"`);

    const refund = await this.prisma.paymentRefund.findUnique({
      where: { id: refundId },
      include: {
        paymentTransaction: {
          include: {
            paymentOrder: {
              include: {
                booking: true,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`PaymentRefund with ID "${refundId}" was not found.`);
    }

    // Idempotency: if already processed, no-op
    if (refund.status === RefundStatus.PROCESSED) {
      this.logger.log(`Refund "${refundId}" has already been processed.`);
      return;
    }

    const paymentTransaction = refund.paymentTransaction;
    const booking = paymentTransaction.paymentOrder.booking;

    // Claim the refund atomically: only ONE worker may transition a REQUESTED
    // or previously FAILED refund into PROCESSING. A duplicate/delayed job
    // (e.g. BullMQ at-least-once delivery) sees updateMany count === 0 and
    // bails out instead of issuing a second Razorpay refund.
    const claim = await this.prisma.paymentRefund.updateMany({
      where: {
        id: refundId,
        status: { in: [RefundStatus.REQUESTED, RefundStatus.FAILED] },
      },
      data: {
        status: RefundStatus.PROCESSING,
      },
    });

    if (claim.count === 0) {
      this.logger.warn(
        `Refund "${refundId}" is already being processed (status: ${refund.status}). Skipping duplicate execution.`,
      );
      return;
    }

    try {
      // (Status was atomically set to PROCESSING before this call above.)

      // 2. Call Razorpay Refund API
      const rzpRefund = await this.razorpayService.createRefund(refund.razorpayPaymentId, {
        amountPaise: refund.amountPaise,
        receipt: refund.idempotencyKey || `ref-${refund.id.slice(0, 8)}`,
        notes: {
          bookingReference: booking.bookingReference,
          refundId: refund.id,
          reason: refund.reason || 'Automatic cancellation/expiration refund',
        },
      });

      // 3. Persist success state atomically
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentRefund.update({
          where: { id: refundId },
          data: {
            razorpayRefundId: rzpRefund.id,
            status: RefundStatus.PROCESSED,
            processedAt: new Date(),
            rawPayload: rzpRefund as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: PaymentTransactionStatus.REFUNDED,
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.REFUNDED,
          },
        });
      });

      this.logger.log(
        `Refund "${refundId}" successfully processed with Razorpay refund ID "${rzpRefund.id}".`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to process refund "${refundId}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      await this.prisma.paymentRefund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.FAILED,
        },
      });

      throw err;
    }
  }
}
