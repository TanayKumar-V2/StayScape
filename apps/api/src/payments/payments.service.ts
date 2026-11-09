import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import {
  PaymentReconciliationService,
  ReconcilePaymentResult,
} from './services/payment-reconciliation.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CreatePaymentOrderResponseDto } from './dto/payment-order-response.dto';
import { PaymentStatusResponseDto } from './dto/payment-status-response.dto';
import { BookingStatus, PaymentOrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly reconciliationService: PaymentReconciliationService,
  ) {}

  /**
   * Generates or retrieves an existing Razorpay Order for a valid booking hold.
   */
  async createPaymentOrder(
    userId: string,
    bookingReference: string,
  ): Promise<CreatePaymentOrderResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        paymentOrder: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference "${bookingReference}" was not found.`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to pay for this booking.');
    }

    // Check status
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking has already been confirmed and paid for.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking reservation was cancelled.');
    }

    // Check hold expiration
    const now = new Date();
    if (booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= now.getTime()) {
      if (
        booking.status === BookingStatus.HOLD ||
        booking.status === BookingStatus.PAYMENT_PENDING
      ) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.EXPIRED,
            expiredAt: now,
          },
        });
      }
      throw new BadRequestException(
        'The temporary reservation hold has expired. Please create a new booking.',
      );
    }

    // Reuse existing order if already generated and active
    let razorpayOrderId: string;

    if (booking.paymentOrder && booking.paymentOrder.status === PaymentOrderStatus.CREATED) {
      razorpayOrderId = booking.paymentOrder.razorpayOrderId;
      this.logger.log(
        `Reusing existing Razorpay order "${razorpayOrderId}" for booking "${bookingReference}".`,
      );
    } else {
      // Create new Razorpay order
      const rzpOrder = await this.razorpayService.createOrder({
        amountPaise: booking.totalAmountPaise,
        currency: booking.currency,
        receipt: booking.bookingReference,
        notes: {
          bookingReference: booking.bookingReference,
          bookingId: booking.id,
          userId: booking.userId,
          propertyId: booking.propertyId,
        },
      });

      razorpayOrderId = rzpOrder.id;

      // Upsert PaymentOrder in database
      await this.prisma.paymentOrder.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          razorpayOrderId: rzpOrder.id,
          receipt: booking.bookingReference,
          amountPaise: booking.totalAmountPaise,
          currency: booking.currency,
          status: PaymentOrderStatus.CREATED,
          notes: rzpOrder.notes,
        },
        update: {
          razorpayOrderId: rzpOrder.id,
          amountPaise: booking.totalAmountPaise,
          status: PaymentOrderStatus.CREATED,
          notes: rzpOrder.notes,
        },
      });

      // Advance booking from HOLD to PAYMENT_PENDING
      if (booking.status === BookingStatus.HOLD) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.PAYMENT_PENDING,
          },
        });
      }
    }

    const userName = `${booking.user.firstName} ${booking.user.lastName}`.trim();

    return {
      orderId: razorpayOrderId,
      amount: booking.totalAmountPaise,
      currency: booking.currency,
      keyId: this.razorpayService.getKeyId(),
      bookingReference: booking.bookingReference,
      propertyTitle: booking.propertyTitleSnapshot,
      user: {
        name: userName || 'Guest',
        email: booking.user.email,
      },
    };
  }

  /**
   * Verifies payment callback signature, retrieves payment details from Razorpay,
   * and routes through atomic transactional reconciliation.
   */
  async verifyPayment(userId: string, dto: VerifyPaymentDto): Promise<ReconcilePaymentResult> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    this.logger.log(
      `Verifying payment "${razorpayPaymentId}" for order "${razorpayOrderId}" by user "${userId}"`,
    );

    // 0. The caller must own the booking this Razorpay order belongs to.
    //    Signature validity alone does not establish authorization to confirm
    //    another user's reservation.
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { razorpayOrderId },
      select: { booking: { select: { userId: true, bookingReference: true } } },
    });

    if (!paymentOrder || paymentOrder.booking.userId !== userId) {
      throw new ForbiddenException('You do not own a booking for this payment order.');
    }

    // 1. Verify cryptographic signature
    const isSignatureValid = this.razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isSignatureValid) {
      this.logger.warn(
        `Invalid payment signature received for order "${razorpayOrderId}" and payment "${razorpayPaymentId}".`,
      );
      throw new BadRequestException('Invalid cryptographic payment signature.');
    }

    // 2. Fetch payment details from Razorpay
    const paymentDetails = await this.razorpayService.fetchPayment(razorpayPaymentId);

    // 3. Delegate to shared atomic reconciliation service
    return await this.reconciliationService.reconcilePayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentDetails,
      source: 'CLIENT_CALLBACK',
    });
  }

  /**
   * Retrieves sanitized payment status for a booking.
   */
  async getPaymentStatus(
    userId: string,
    bookingReference: string,
  ): Promise<PaymentStatusResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        paymentOrder: {
          include: {
            transactions: {
              include: {
                refunds: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking "${bookingReference}" was not found.`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view payment status for this booking.',
      );
    }

    const order = booking.paymentOrder;
    const latestTx = order?.transactions?.[0];
    const latestRefund = latestTx?.refunds?.[0];

    const isPaid = booking.status === BookingStatus.CONFIRMED || latestTx?.status === 'CAPTURED';

    return {
      bookingReference: booking.bookingReference,
      bookingStatus: booking.status,
      isPaid,
      order: order
        ? {
            orderId: order.razorpayOrderId,
            amountPaise: order.amountPaise,
            currency: order.currency,
            status: order.status,
          }
        : null,
      transaction: latestTx
        ? {
            razorpayPaymentId: latestTx.razorpayPaymentId,
            status: latestTx.status,
            method: latestTx.method,
            bank: latestTx.bank,
            wallet: latestTx.wallet,
            vpa: latestTx.vpa,
            cardLast4: latestTx.cardLast4,
            cardNetwork: latestTx.cardNetwork,
            capturedAt: latestTx.capturedAt,
            errorCode: latestTx.errorCode,
            errorDescription: latestTx.errorDescription,
          }
        : null,
      refund: latestRefund
        ? {
            id: latestRefund.id,
            razorpayRefundId: latestRefund.razorpayRefundId,
            amountPaise: latestRefund.amountPaise,
            status: latestRefund.status,
            reason: latestRefund.reason,
            processedAt: latestRefund.processedAt,
          }
        : null,
    };
  }
}
