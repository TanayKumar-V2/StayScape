import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Injectable()
export class AdminAiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getAiUsageStats(query: AdminPaginationQueryDto) {
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 86_400_000);
    let toDate = new Date();
    if (query.to) {
      toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
    }

    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      endpointGroups,
      modelGroups,
      tokenAggregates,
      durationAggregate,
      logs,
    ] = await Promise.all([
      this.prisma.aiUsageLog.count({ where }),
      this.prisma.aiUsageLog.count({ where: { ...where, success: true } }),
      this.prisma.aiUsageLog.count({ where: { ...where, success: false } }),
      this.prisma.aiUsageLog.groupBy({
        by: ['endpoint'],
        where,
        _count: { id: true },
        _avg: { durationMs: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['model'],
        where,
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where,
        _sum: {
          inputTokens: true,
          outputTokens: true,
        },
      }),
      this.prisma.aiUsageLog.aggregate({
        where,
        _avg: {
          durationMs: true,
        },
      }),
      this.prisma.aiUsageLog.findMany({
        where,
        select: {
          createdAt: true,
          success: true,
          durationMs: true,
          inputTokens: true,
          outputTokens: true,
        },
      }),
    ]);

    // Build daily trend series
    const dailyMap = new Map<
      string,
      {
        date: string;
        total: number;
        success: number;
        failed: number;
        tokens: number;
        avgDurationMs: number;
        _durations: number[];
      }
    >();

    const daysDiff = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000));
    for (let i = daysDiff; i >= 0; i--) {
      const d = new Date(toDate.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, {
        date: key,
        total: 0,
        success: 0,
        failed: 0,
        tokens: 0,
        avgDurationMs: 0,
        _durations: [],
      });
    }

    for (const log of logs) {
      const dStr = log.createdAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(dStr);
      if (bucket) {
        bucket.total++;
        if (log.success) bucket.success++;
        else bucket.failed++;
        bucket.tokens += (log.inputTokens ?? 0) + (log.outputTokens ?? 0);
        bucket._durations.push(log.durationMs);
      }
    }

    const dailyTrends = Array.from(dailyMap.values()).map((b) => ({
      date: b.date,
      total: b.total,
      success: b.success,
      failed: b.failed,
      tokens: b.tokens,
      avgDurationMs:
        b._durations.length > 0
          ? Math.round(b._durations.reduce((a, c) => a + c, 0) / b._durations.length)
          : 0,
    }));

    return {
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRatePercentage:
          totalRequests > 0
            ? Math.round((successfulRequests / totalRequests) * 1000) / 10
            : 100,
        totalInputTokens: tokenAggregates._sum.inputTokens ?? 0,
        totalOutputTokens: tokenAggregates._sum.outputTokens ?? 0,
        totalTokens:
          (tokenAggregates._sum.inputTokens ?? 0) +
          (tokenAggregates._sum.outputTokens ?? 0),
        averageDurationMs: Math.round(durationAggregate._avg.durationMs ?? 0),
      },
      requestsByFeature: endpointGroups.map((g) => ({
        feature: g.endpoint,
        count: g._count.id,
        averageDurationMs: Math.round(g._avg.durationMs ?? 0),
      })),
      requestsByModel: modelGroups.map((g) => ({
        model: g.model,
        count: g._count.id,
      })),
      dailyTrends,
    };
  }
}

