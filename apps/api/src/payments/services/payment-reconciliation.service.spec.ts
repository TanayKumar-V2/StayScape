import { Test, TestingModule } from '@nestjs/testing';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../../availability/availability.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BookingStatus, PaymentTransactionStatus, RefundStatus } from '@prisma/client';
import { RazorpayPaymentResult } from '../razorpay.service';

describe('PaymentReconciliationService', () => {
  let service: PaymentReconciliationService;
  let mockPrisma: any;
  let mockAvailabilityService: any;
  let mockRefundQueue: any;

  beforeEach(async () => {
    mockRefundQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    };

    mockAvailabilityService = {
      invalidateAvailabilityCache: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockPrisma);
      }),
      $queryRaw: jest.fn(),
      paymentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      paymentRefund: {
        create: jest.fn(),
      },
      booking: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: getQueueToken('payment-refunds'), useValue: mockRefundQueue },
      ],
    }).compile();

    service = module.get<PaymentReconciliationService>(PaymentReconciliationService);
  });

  it('should confirm an active booking hold when payment is captured', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 mins in future

    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-1234',
        status: BookingStatus.HOLD,
        hold_expires_at: futureDate,
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.booking.update.mockResolvedValue({ id: 'b_1', status: BookingStatus.CONFIRMED });
    mockPrisma.paymentTransaction.upsert.mockResolvedValue({
      id: 'tx_1',
      status: PaymentTransactionStatus.CAPTURED,
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 500000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      captured: true,
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      paymentDetails,
      source: 'CLIENT_CALLBACK',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b_1' },
        data: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
      }),
    );
    expect(mockAvailabilityService.invalidateAvailabilityCache).toHaveBeenCalledWith(
      'tranquil-villa',
    );
  });

  it('should initiate automatic refund when payment is captured for an expired hold', async () => {
    const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 mins in past

    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-EXPIRED',
        status: BookingStatus.HOLD,
        hold_expires_at: pastDate,
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.upsert.mockResolvedValue({
      id: 'tx_expired_1',
      status: PaymentTransactionStatus.REFUND_PENDING,
    });
    mockPrisma.paymentRefund.create.mockResolvedValue({
      id: 'ref_1',
      amountPaise: 500000,
      status: RefundStatus.REQUESTED,
      reason: 'Hold expired before payment completed',
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_late',
      order_id: 'order_123',
      amount: 500000,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_late',
      paymentDetails,
      source: 'WEBHOOK',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(BookingStatus.REFUND_PENDING);
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b_1' },
        data: { status: BookingStatus.REFUND_PENDING },
      }),
    );
    expect(mockPrisma.paymentRefund.create).toHaveBeenCalled();
    expect(mockRefundQueue.add).toHaveBeenCalledWith(
      'execute-refund',
      expect.objectContaining({
        refundId: 'ref_1',
        amountPaise: 500000,
      }),
      expect.any(Object),
    );
  });

  it('should be idempotent if booking is already CONFIRMED with the same payment', async () => {
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-CONFIRMED',
        status: BookingStatus.CONFIRMED,
        hold_expires_at: new Date(),
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx_existing',
      razorpayPaymentId: 'pay_123',
      status: PaymentTransactionStatus.CAPTURED,
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 500000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      captured: true,
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      paymentDetails,
      source: 'WEBHOOK',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    // Booking should NOT be updated again
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('should reject a payment whose order_id does not match the reconciled order', async () => {
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-MISMATCH',
        status: BookingStatus.HOLD,
        hold_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.upsert.mockResolvedValue({
      id: 'tx_mismatch',
      status: PaymentTransactionStatus.FAILED,
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_foreign',
      order_id: 'order_OTHER', // binding mismatch
      amount: 500000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      captured: true,
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_foreign',
      paymentDetails,
      source: 'WEBHOOK',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(BookingStatus.PAYMENT_FAILED);
    expect(result.error).toContain('does not belong to this order');
    // Transaction recorded as FAILED, booking marked PAYMENT_FAILED, no confirmation
    expect(mockPrisma.paymentTransaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: PaymentTransactionStatus.FAILED }),
        update: expect.objectContaining({ status: PaymentTransactionStatus.FAILED }),
      }),
    );
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b_1' },
        data: expect.objectContaining({ status: BookingStatus.PAYMENT_FAILED }),
      }),
    );
    // No confirmation and no refund
    expect(mockPrisma.paymentRefund.create).not.toHaveBeenCalled();
    expect(mockRefundQueue.add).not.toHaveBeenCalled();
  });

  it('should record and refund a captured payment with mismatched amount on a valid order', async () => {
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-BINDING',
        status: BookingStatus.HOLD,
        hold_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.upsert.mockResolvedValue({
      id: 'tx_binding',
      status: PaymentTransactionStatus.REFUND_PENDING,
    });
    mockPrisma.paymentRefund.create.mockResolvedValue({
      id: 'ref_binding',
      amountPaise: 250000,
      status: RefundStatus.REQUESTED,
      reason: 'Payment amount/currency does not match the reserved order',
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_short',
      order_id: 'order_123',
      amount: 250000, // captured 2,500 INR instead of 5,000 INR
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_short',
      paymentDetails,
      source: 'WEBHOOK',
    });

    expect(result.success).toBe(false);
    // Booking stays in its prior status: an underpaid capture never confirms
    expect(result.status).toBe(BookingStatus.HOLD);
    // REFUND is REQUESTED with the binding idempotency key and queued
    expect(mockPrisma.paymentRefund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RefundStatus.REQUESTED,
          idempotencyKey: 'binding-refund-pay_short',
          amountPaise: 250000,
        }),
      }),
    );
    expect(mockRefundQueue.add).toHaveBeenCalledWith(
      'execute-refund',
      expect.objectContaining({ refundId: 'ref_binding', amountPaise: 250000 }),
      expect.any(Object),
    );
    // Booking must NOT be confirmed
    expect(mockPrisma.booking.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
      }),
    );
  });

  it('should record an authorized-not-captured payment without confirming (Scenario E)', async () => {
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'po_1',
      bookingId: 'b_1',
      razorpayOrderId: 'order_123',
      amountPaise: 500000,
      currency: 'INR',
    });

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'b_1',
        booking_reference: 'BK-AUTH',
        status: BookingStatus.HOLD,
        hold_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        property_id: 'prop_1',
        property_slug_snapshot: 'tranquil-villa',
        total_amount_paise: 500000,
      },
    ]);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.paymentTransaction.upsert.mockResolvedValue({
      id: 'tx_auth',
      status: PaymentTransactionStatus.AUTHORIZED,
    });

    const paymentDetails: RazorpayPaymentResult = {
      id: 'pay_auth',
      order_id: 'order_123',
      amount: 500000,
      currency: 'INR',
      status: 'authorized',
      method: 'card',
      created_at: 1234567890,
    };

    const result = await service.reconcilePayment({
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_auth',
      paymentDetails,
      source: 'WEBHOOK',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(BookingStatus.HOLD);
    expect(mockPrisma.paymentTransaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: PaymentTransactionStatus.AUTHORIZED }),
        update: expect.objectContaining({ status: PaymentTransactionStatus.AUTHORIZED }),
      }),
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});
