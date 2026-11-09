import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentTransactionStatus, Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundService } from '../../payments/services/refund.service';
import { AdminAuditService } from './admin-audit.service';

function getFailureDescription(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const error = (payload as Record<string, unknown>)['error'];
  if (typeof error !== 'object' || error === null || Array.isArray(error)) return null;
  const description = (error as Record<string, unknown>)['description'];
  return typeof description === 'string' ? description : null;
}
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundService: RefundService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getPayments(
    query: AdminPaginationQueryDto & { bookingReference?: string; providerPaymentId?: string },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentTransactionWhereInput = {};

    if (query.search) {
      where.OR = [
        { razorpayPaymentId: { contains: query.search, mode: 'insensitive' } },
        { paymentOrder: { razorpayOrderId: { contains: query.search, mode: 'insensitive' } } },
        {
          paymentOrder: {
            booking: { bookingReference: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    if (query.bookingReference) {
      where.paymentOrder = {
        booking: { bookingReference: query.bookingReference },
      };
    }

    if (query.providerPaymentId) {
      where.razorpayPaymentId = query.providerPaymentId;
    }

    if (
      query.status &&
      Object.values(PaymentTransactionStatus).includes(query.status as PaymentTransactionStatus)
    ) {
      where.status = query.status as PaymentTransactionStatus;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [total, transactions] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          paymentOrder: {
            include: {
              booking: {
                select: {
                  bookingReference: true,
                  propertyTitleSnapshot: true,
                  user: {
                    select: { email: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
          refunds: {
            select: {
              id: true,
              razorpayRefundId: true,
              status: true,
              amountPaise: true,
            },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: transactions.map((t) => ({
        id: t.id,
        providerPaymentId: t.razorpayPaymentId,
        providerOrderId: t.paymentOrder.razorpayOrderId,
        bookingReference: t.paymentOrder.booking.bookingReference,
        propertyTitle: t.paymentOrder.booking.propertyTitleSnapshot,
        customerName:
          `${t.paymentOrder.booking.user.firstName} ${t.paymentOrder.booking.user.lastName}`.trim(),
        customerEmail: t.paymentOrder.booking.user.email,
        amountPaise: t.amountPaise,
        currency: t.currency,
        status: t.status,
        method: t.method,
        bank: t.bank,
        wallet: t.wallet,
        vpa: t.vpa,
        capturedAt: t.capturedAt ? t.capturedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        refundsCount: t.refunds.length,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getRefunds(query: AdminPaginationQueryDto & { bookingReference?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRefundWhereInput = {};

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { razorpayRefundId: { contains: query.search, mode: 'insensitive' } },
        {
          paymentTransaction: {
            paymentOrder: {
              booking: { bookingReference: { contains: query.search, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    if (query.bookingReference) {
      where.paymentTransaction = {
        paymentOrder: {
          booking: { bookingReference: query.bookingReference },
        },
      };
    }

    if (query.status && Object.values(RefundStatus).includes(query.status as RefundStatus)) {
      where.status = query.status as RefundStatus;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [total, refunds] = await Promise.all([
      this.prisma.paymentRefund.count({ where }),
      this.prisma.paymentRefund.findMany({
        where,
        include: {
          paymentTransaction: {
            include: {
              paymentOrder: {
                include: {
                  booking: {
                    select: {
                      bookingReference: true,
                      propertyTitleSnapshot: true,
                      user: { select: { email: true, firstName: true, lastName: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: refunds.map((rf) => ({
        id: rf.id,
        refundReference: rf.razorpayRefundId ?? rf.id,
        razorpayRefundId: rf.razorpayRefundId,
        paymentTransactionId: rf.paymentTransactionId,
        providerPaymentId: rf.paymentTransaction.razorpayPaymentId,
        bookingReference: rf.paymentTransaction.paymentOrder.booking.bookingReference,
        propertyTitle: rf.paymentTransaction.paymentOrder.booking.propertyTitleSnapshot,
        customerEmail: rf.paymentTransaction.paymentOrder.booking.user.email,
        amountPaise: rf.amountPaise,
        currency: rf.currency,
        status: rf.status,
        reason: rf.reason,
        failureReason: getFailureDescription(rf.rawPayload),
        createdAt: rf.createdAt.toISOString(),
        processedAt: rf.processedAt ? rf.processedAt.toISOString() : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Operational retry of an existing failed refund via the payment refund service.
   */
  async retryRefund(adminId: string, refundId: string) {
    const refund = await this.prisma.paymentRefund.findUnique({
      where: { id: refundId },
      include: {
        paymentTransaction: {
          include: {
            paymentOrder: {
              include: { booking: { select: { bookingReference: true } } },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID "${refundId}" not found.`);
    }

    if (refund.status === RefundStatus.PROCESSED) {
      throw new BadRequestException(
        'This refund has already been successfully processed by Razorpay.',
      );
    }

    if (refund.status === RefundStatus.PROCESSING) {
      throw new BadRequestException('This refund is currently being processed.');
    }

    // Execute refund via existing RefundService
    await this.refundService.executeRefund(refundId);

    // Record audit log
    await this.auditService.log({
      adminUserId: adminId,
      action: 'RETRY_REFUND',
      entityType: 'PaymentRefund',
      entityId: refundId,
      reason: 'Admin operational retry for failed or pending refund',
      beforeData: { status: refund.status, razorpayRefundId: refund.razorpayRefundId },
      afterData: { action: 'EXECUTED_RETRY' },
      metadata: {
        bookingReference: refund.paymentTransaction.paymentOrder.booking.bookingReference,
        amountPaise: refund.amountPaise,
      },
    });

    return {
      success: true,
      message: `Refund "${refund.razorpayRefundId ?? refund.id}" has been queued and re-executed.`,
    };
  }
}
