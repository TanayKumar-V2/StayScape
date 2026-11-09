import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PaymentReconciliationService } from './services/payment-reconciliation.service';
import { BookingStatus, PaymentOrderStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrisma: any;
  let mockRazorpayService: any;
  let mockReconciliationService: any;

  beforeEach(async () => {
    mockRazorpayService = {
      createOrder: jest.fn(),
      getKeyId: jest.fn().mockReturnValue('rzp_test_key123'),
      verifyPaymentSignature: jest.fn(),
      fetchPayment: jest.fn(),
    };

    mockReconciliationService = {
      reconcilePayment: jest.fn(),
    };

    mockPrisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentOrder: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpayService },
        { provide: PaymentReconciliationService, useValue: mockReconciliationService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createPaymentOrder', () => {
    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentOrder('user_1', 'BK-NONE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if booking belongs to different user', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b_1',
        userId: 'different_user',
        bookingReference: 'BK-1',
      });

      await expect(service.createPaymentOrder('user_1', 'BK-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if booking is already confirmed', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b_1',
        userId: 'user_1',
        bookingReference: 'BK-1',
        status: BookingStatus.CONFIRMED,
      });

      await expect(service.createPaymentOrder('user_1', 'BK-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if temporary hold has expired', async () => {
      const pastDate = new Date(Date.now() - 60000);
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b_1',
        userId: 'user_1',
        bookingReference: 'BK-1',
        status: BookingStatus.HOLD,
        holdExpiresAt: pastDate,
      });

      await expect(service.createPaymentOrder('user_1', 'BK-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new Razorpay order and update booking to PAYMENT_PENDING', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b_1',
        userId: 'user_1',
        bookingReference: 'BK-1234',
        status: BookingStatus.HOLD,
        holdExpiresAt: futureDate,
        totalAmountPaise: 850000,
        currency: 'INR',
        propertyId: 'prop_1',
        propertyTitleSnapshot: 'Serene Cottage',
        user: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          email: 'ananya@example.com',
        },
        paymentOrder: null,
      });

      mockRazorpayService.createOrder.mockResolvedValue({
        id: 'order_rzp_999',
        amount: 850000,
        currency: 'INR',
        receipt: 'BK-1234',
        status: 'created',
        notes: { bookingReference: 'BK-1234' },
      });

      const response = await service.createPaymentOrder('user_1', 'BK-1234');

      expect(response.orderId).toBe('order_rzp_999');
      expect(response.amount).toBe(850000);
      expect(response.currency).toBe('INR');
      expect(response.keyId).toBe('rzp_test_key123');
      expect(response.user.name).toBe('Ananya Sharma');

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b_1' },
          data: { status: BookingStatus.PAYMENT_PENDING },
        }),
      );
    });

    it('should reuse existing active Razorpay order if already created', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b_1',
        userId: 'user_1',
        bookingReference: 'BK-1234',
        status: BookingStatus.PAYMENT_PENDING,
        holdExpiresAt: futureDate,
        totalAmountPaise: 850000,
        currency: 'INR',
        propertyTitleSnapshot: 'Serene Cottage',
        user: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          email: 'ananya@example.com',
        },
        paymentOrder: {
          razorpayOrderId: 'order_existing_123',
          status: PaymentOrderStatus.CREATED,
        },
      });

      const response = await service.createPaymentOrder('user_1', 'BK-1234');

      expect(response.orderId).toBe('order_existing_123');
      expect(mockRazorpayService.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('should throw ForbiddenException when the order does not exist', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPayment('user_1', {
          razorpayOrderId: 'order_unknown',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'sig',
        }),
      ).rejects.toThrow(ForbiddenException);

      // Existence is not verified after a failed ownership check
      expect(mockRazorpayService.verifyPaymentSignature).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the order belongs to another user (IDOR guard)', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        booking: { userId: 'user_other', bookingReference: 'BK-OTHER' },
      });

      await expect(
        service.verifyPayment('user_1', {
          razorpayOrderId: 'order_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'sig',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRazorpayService.fetchPayment).not.toHaveBeenCalled();
      expect(mockReconciliationService.reconcilePayment).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid cryptographic signature', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        booking: { userId: 'user_1', bookingReference: 'BK-1234' },
      });
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(false);

      await expect(
        service.verifyPayment('user_1', {
          razorpayOrderId: 'order_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'bad_sig',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fetch payment and call reconciliation when signature is valid', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        booking: { userId: 'user_1', bookingReference: 'BK-1234' },
      });
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockRazorpayService.fetchPayment.mockResolvedValue({
        id: 'pay_1',
        order_id: 'order_1',
        status: 'captured',
        amount: 850000,
      });

      mockReconciliationService.reconcilePayment.mockResolvedValue({
        success: true,
        bookingReference: 'BK-1234',
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.verifyPayment('user_1', {
        razorpayOrderId: 'order_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'valid_sig',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockReconciliationService.reconcilePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpayOrderId: 'order_1',
          razorpayPaymentId: 'pay_1',
          source: 'CLIENT_CALLBACK',
        }),
      );
    });
  });
});
