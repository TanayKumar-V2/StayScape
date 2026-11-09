import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditLogQueryDto } from '../dto/admin-query.dto';

export interface AuditLogOptions {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'tokenhash',
  'token_hash',
  'secret',
  'apikey',
  'api_key',
  'webhooksecret',
  'webhook_secret',
  'cardnumber',
  'card_number',
  'cvv',
  'razorpay_signature',
]);

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes sensitive fields recursively before persisting in audit trail.
   */
  private sanitizeData(data: unknown): Prisma.InputJsonValue | undefined {
    if (data === undefined || data === null) {
      return undefined;
    }

    if (typeof data !== 'object') {
      return data as Prisma.InputJsonValue;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item)) as Prisma.InputJsonValue;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes('password') || lower.includes('secret')) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.sanitizeData(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as Prisma.InputJsonValue;
  }

  /**
   * Records an immutable audit log entry.
   * Can be executed within an existing Prisma transaction client or standalone.
   */
  async log(
    options: AuditLogOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.adminAuditLog.create({
        data: {
          adminUserId: options.adminUserId,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId ?? null,
          reason: options.reason ?? null,
          beforeData: this.sanitizeData(options.beforeData),
          afterData: this.sanitizeData(options.afterData),
          metadata: this.sanitizeData(options.metadata),
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to record audit log: ${msg}`);
      throw new Error(`Audit log creation failed: ${msg}`);
    }
  }

  /**
   * Returns paginated audit logs with search, entity filters, and date range.
   */
  async getAuditLogs(query: AdminAuditLogQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (query.adminUserId) {
      where.adminUserId = query.adminUserId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.entityType) {
      where.entityType = { equals: query.entityType, mode: 'insensitive' };
    }
    if (query.entityId) {
      where.entityId = query.entityId;
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

    const [total, items] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
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
      data: items.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        reason: log.reason,
        beforeData: log.beforeData,
        afterData: log.afterData,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
        admin: {
          id: log.adminUser.id,
          name: `${log.adminUser.firstName} ${log.adminUser.lastName}`.trim(),
          email: log.adminUser.email,
        },
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
}

