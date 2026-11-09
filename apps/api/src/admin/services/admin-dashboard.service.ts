import { Injectable, Logger } from '@nestjs/common';
import {
  AccountStatus,
  BookingStatus,
  HostStatus,
  PaymentTransactionStatus,
  PropertyModerationStatus,
  PropertyStatus,
  RefundStatus,
  ReportStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AdminAnalyticsQueryDto, AdminDashboardOverviewQueryDto } from '../dto/admin-query.dto';

export interface DashboardOverviewResponse {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalHosts: number;
    activeHosts: number;
    totalProperties: number;
    publishedProperties: number;
    totalBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    openReports: number;
  };
  payments: {
    grossCapturedPaise: number;
    processedRefundsPaise: number;
    netCapturedPaise: number;
    currency: string;
  };
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Returns high-level platform summary and financial metrics from actual database records.
   */
  async getOverview(query: AdminDashboardOverviewQueryDto): Promise<DashboardOverviewResponse> {
    const fromDate = query.from ? new Date(query.from) : undefined;
    let toDate: Date | undefined;
    if (query.to) {
      toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
    }

    const cacheKey = `cache:admin:overview:${query.from ?? 'all'}:${query.to ?? 'all'}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DashboardOverviewResponse;
      }
    } catch {
      // Redis fallback to DB
    }

    const dateFilter: { gte?: Date; lte?: Date } | undefined =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const [
      totalUsers,
      activeUsers,
      totalHosts,
      activeHosts,
      totalProperties,
      publishedProperties,
      totalBookings,
      confirmedBookings,
      completedBookings,
      openReports,
      capturedTransactions,
      processedRefunds,
    ] = await Promise.all([
      this.prisma.user.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      this.prisma.user.count({
        where: {
          status: AccountStatus.ACTIVE,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.hostProfile.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      this.prisma.hostProfile.count({
        where: {
          status: HostStatus.ACTIVE,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.property.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      this.prisma.property.count({
        where: {
          status: PropertyStatus.PUBLISHED,
          moderationStatus: PropertyModerationStatus.APPROVED,
          hostProfile: { status: HostStatus.ACTIVE },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.booking.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.COMPLETED,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.contentReport.count({
        where: {
          status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          status: PaymentTransactionStatus.CAPTURED,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        _sum: { amountPaise: true },
      }),
      this.prisma.paymentRefund.aggregate({
        where: {
          status: RefundStatus.PROCESSED,
          ...(dateFilter ? { processedAt: dateFilter } : {}),
        },
        _sum: { amountPaise: true },
      }),
    ]);

    const grossCapturedPaise = capturedTransactions._sum.amountPaise ?? 0;
    const processedRefundsPaise = processedRefunds._sum.amountPaise ?? 0;
    const netCapturedPaise = grossCapturedPaise - processedRefundsPaise;

    const result: DashboardOverviewResponse = {
      summary: {
        totalUsers,
        activeUsers,
        totalHosts,
        activeHosts,
        totalProperties,
        publishedProperties,
        totalBookings,
        confirmedBookings,
        completedBookings,
        openReports,
      },
      payments: {
        grossCapturedPaise,
        processedRefundsPaise,
        netCapturedPaise,
        currency: 'INR',
      },
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 60);
    } catch {
      // Redis fallback
    }

    return result;
  }

  /**
   * Returns actual time-series analytics and category distributions.
   */
  async getAnalytics(query: AdminAnalyticsQueryDto) {
    const period = query.period ?? '30d';
    const cacheKey = `cache:admin:analytics:${period}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis fallback
    }

    const now = new Date();
    let startDate: Date;
    let dayCount: number;

    switch (period) {
      case '7d':
        dayCount = 7;
        startDate = new Date(now.getTime() - 7 * 86_400_000);
        break;
      case '90d':
        dayCount = 90;
        startDate = new Date(now.getTime() - 90 * 86_400_000);
        break;
      case '12m':
        dayCount = 365;
        startDate = new Date(now.getTime() - 365 * 86_400_000);
        break;
      case '30d':
      default:
        dayCount = 30;
        startDate = new Date(now.getTime() - 30 * 86_400_000);
        break;
    }

    const [
      users,
      hosts,
      properties,
      bookings,
      transactions,
      refunds,
      bookingStatusGroups,
      propertyTypeGroups,
      topDestinationsByProperties,
      topDestinationsByBookings,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      this.prisma.hostProfile.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      this.prisma.property.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      this.prisma.booking.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: {
          createdAt: { gte: startDate },
          status: PaymentTransactionStatus.CAPTURED,
        },
        select: { createdAt: true, amountPaise: true },
      }),
      this.prisma.paymentRefund.findMany({
        where: {
          processedAt: { gte: startDate },
          status: RefundStatus.PROCESSED,
        },
        select: { processedAt: true, amountPaise: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.property.groupBy({
        by: ['propertyType'],
        _count: { id: true },
      }),
      this.prisma.property.groupBy({
        by: ['city'],
        where: {
          status: PropertyStatus.PUBLISHED,
          moderationStatus: PropertyModerationStatus.APPROVED,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.booking.groupBy({
        by: ['propertyCitySnapshot'],
        where: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Build day-wise date buckets
    const timeSeriesMap = new Map<
      string,
      {
        date: string;
        users: number;
        hosts: number;
        properties: number;
        bookings: number;
        volumePaise: number;
        refundsPaise: number;
      }
    >();

    // Step size for intervals
    const intervalDays = period === '12m' ? 30 : period === '90d' ? 3 : 1;
    const bucketCount = Math.ceil(dayCount / intervalDays);

    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * intervalDays * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      timeSeriesMap.set(key, {
        date: key,
        users: 0,
        hosts: 0,
        properties: 0,
        bookings: 0,
        volumePaise: 0,
        refundsPaise: 0,
      });
    }

    const findClosestBucket = (date: Date) => {
      const dStr = date.toISOString().slice(0, 10);
      if (timeSeriesMap.has(dStr)) return timeSeriesMap.get(dStr);
      let closestKey = '';
      let minDiff = Infinity;
      for (const key of timeSeriesMap.keys()) {
        const diff = Math.abs(new Date(key).getTime() - date.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestKey = key;
        }
      }
      return closestKey ? timeSeriesMap.get(closestKey) : undefined;
    };

    for (const u of users) {
      const b = findClosestBucket(u.createdAt);
      if (b) b.users++;
    }
    for (const h of hosts) {
      const b = findClosestBucket(h.createdAt);
      if (b) b.hosts++;
    }
    for (const p of properties) {
      const b = findClosestBucket(p.createdAt);
      if (b) b.properties++;
    }
    for (const bk of bookings) {
      const b = findClosestBucket(bk.createdAt);
      if (b) b.bookings++;
    }
    for (const tx of transactions) {
      const b = findClosestBucket(tx.createdAt);
      if (b) b.volumePaise += tx.amountPaise;
    }
    for (const rf of refunds) {
      if (rf.processedAt) {
        const b = findClosestBucket(rf.processedAt);
        if (b) b.refundsPaise += rf.amountPaise;
      }
    }

    const result = {
      period,
      timeSeries: Array.from(timeSeriesMap.values()),
      bookingStatusDistribution: bookingStatusGroups.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      propertyTypeDistribution: propertyTypeGroups.map((g) => ({
        type: g.propertyType,
        count: g._count.id,
      })),
      topDestinationsByListings: topDestinationsByProperties.map((d) => ({
        city: d.city,
        listingCount: d._count.id,
      })),
      topDestinationsByBookings: topDestinationsByBookings.map((d) => ({
        city: d.propertyCitySnapshot,
        bookingCount: d._count.id,
      })),
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 120);
    } catch {
      // Redis fallback
    }

    return result;
  }
}
