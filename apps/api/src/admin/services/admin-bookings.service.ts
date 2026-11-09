import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Injectable()
export class AdminBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBookings(query: AdminPaginationQueryDto & { propertyId?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (query.search) {
      where.OR = [
        { bookingReference: { contains: query.search, mode: 'insensitive' } },
        { propertyTitleSnapshot: { contains: query.search, mode: 'insensitive' } },
        { propertyCitySnapshot: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (
      query.status &&
      Object.values(BookingStatus).includes(query.status as BookingStatus)
    ) {
      where.status = query.status as BookingStatus;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
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

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          property: {
            select: {
              id: true,
              slug: true,
              hostProfile: {
                select: { id: true, displayName: true, user: { select: { email: true } } },
              },
            },
          },
          paymentOrder: {
            include: {
              transactions: {
                select: {
                  id: true,
                  status: true,
                  method: true,
                  amountPaise: true,
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
      data: bookings.map((b) => {
        const capturedTx = b.paymentOrder?.transactions?.find((t) => t.status === 'CAPTURED');

        return {
          id: b.id,
          bookingReference: b.bookingReference,
          status: b.status,
          checkIn: b.checkIn.toISOString().slice(0, 10),
          checkOut: b.checkOut.toISOString().slice(0, 10),
          nights: b.nights,
          guestCount: b.guestCount,
          totalAmountPaise: b.totalAmountPaise,
          currency: b.currency,
          createdAt: b.createdAt.toISOString(),
          confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
          property: {
            id: b.propertyId,
            slug: b.propertySlugSnapshot,
            title: b.propertyTitleSnapshot,
            city: b.propertyCitySnapshot,
            host: b.property?.hostProfile
              ? {
                  id: b.property.hostProfile.id,
                  name: b.property.hostProfile.displayName,
                  email: b.property.hostProfile.user.email,
                }
              : null,
          },
          guest: {
            id: b.user.id,
            name: `${b.user.firstName} ${b.user.lastName}`.trim(),
            email: b.user.email,
          },
          paymentSummary: {
            hasCapturedPayment: Boolean(capturedTx),
            paymentMethod: capturedTx?.method ?? null,
            transactionCount: b.paymentOrder?.transactions?.length ?? 0,
          },
        };
      }),
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

  async getBookingDetails(bookingReference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            status: true,
          },
        },
        property: {
          include: {
            hostProfile: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
            images: { where: { isCover: true }, take: 1, select: { secureUrl: true } },
          },
        },
        paymentOrder: {
          include: {
            transactions: {
              include: {
                refunds: {
                  select: {
                    id: true,
                    razorpayRefundId: true,
                    amountPaise: true,
                    status: true,
                    reason: true,
                    createdAt: true,
                    processedAt: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          select: {
            id: true,
            overallRating: true,
            comment: true,
            status: true,
            createdAt: true,
          },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference "${bookingReference}" not found.`);
    }

    const transactions = booking.paymentOrder?.transactions ?? [];
    const refunds = transactions.flatMap((t) => t.refunds ?? []);

    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      checkIn: booking.checkIn.toISOString().slice(0, 10),
      checkOut: booking.checkOut.toISOString().slice(0, 10),
      nights: booking.nights,
      guestCount: booking.guestCount,
      pricing: {
        pricePerNightPaise: booking.pricePerNightPaise,
        cleaningFeePaise: booking.cleaningFeePaise,
        nightlySubtotalPaise: booking.nightlySubtotalPaise,
        totalAmountPaise: booking.totalAmountPaise,
        currency: booking.currency,
      },
      timestamps: {
        createdAt: booking.createdAt.toISOString(),
        holdExpiresAt: booking.holdExpiresAt ? booking.holdExpiresAt.toISOString() : null,
        confirmedAt: booking.confirmedAt ? booking.confirmedAt.toISOString() : null,
        cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
        expiredAt: booking.expiredAt ? booking.expiredAt.toISOString() : null,
        completedAt: booking.completedAt ? booking.completedAt.toISOString() : null,
      },
      property: {
        id: booking.propertyId,
        slug: booking.propertySlugSnapshot,
        title: booking.propertyTitleSnapshot,
        city: booking.propertyCitySnapshot,
        coverImage: booking.propertyCoverImageSnapshot,
        host: booking.property?.hostProfile
          ? {
              id: booking.property.hostProfile.id,
              displayName: booking.property.hostProfile.displayName,
              user: {
                id: booking.property.hostProfile.user.id,
                name: `${booking.property.hostProfile.user.firstName} ${booking.property.hostProfile.user.lastName}`.trim(),
                email: booking.property.hostProfile.user.email,
              },
            }
          : null,
      },
      guest: {
        id: booking.user.id,
        name: `${booking.user.firstName} ${booking.user.lastName}`.trim(),
        email: booking.user.email,
        avatarUrl: booking.user.avatarUrl,
        status: booking.user.status,
      },
      paymentOrder: booking.paymentOrder
        ? {
            id: booking.paymentOrder.id,
            providerOrderId: booking.paymentOrder.razorpayOrderId,
            status: booking.paymentOrder.status,
            amountPaise: booking.paymentOrder.amountPaise,
            currency: booking.paymentOrder.currency,
            createdAt: booking.paymentOrder.createdAt.toISOString(),
          }
        : null,
      transactions: transactions.map((t) => ({
        id: t.id,
        providerPaymentId: t.razorpayPaymentId,
        status: t.status,
        amountPaise: t.amountPaise,
        currency: t.currency,
        method: t.method,
        bank: t.bank,
        wallet: t.wallet,
        vpa: t.vpa,
        capturedAt: t.capturedAt ? t.capturedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
      })),
      refunds: refunds.map((rf) => ({
        id: rf.id,
        refundReference: rf.razorpayRefundId ?? rf.id,
        amountPaise: rf.amountPaise,
        status: rf.status,
        reason: rf.reason,
        createdAt: rf.createdAt.toISOString(),
        processedAt: rf.processedAt ? rf.processedAt.toISOString() : null,
      })),
      review: booking.reviews?.[0]
        ? {
            id: booking.reviews[0].id,
            overallRating: booking.reviews[0].overallRating,
            comment: booking.reviews[0].comment,
            status: booking.reviews[0].status,
            createdAt: booking.reviews[0].createdAt.toISOString(),
          }
        : null,
    };
  }
}
