import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportReason, ReportStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminReportQueryDto } from '../dto/admin-query.dto';
import {
  AssignReportDto,
  CreateReportDto,
  UpdateReportStatusDto,
} from '../dto/admin-actions.dto';

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Public authenticated submission of a content report against an existing entity.
   */
  async createReport(reporterUserId: string, dto: CreateReportDto) {
    let propertyId: string | null = null;
    let reviewId: string | null = null;
    let reportedUserId: string | null = null;
    let messageId: string | null = null;

    // 1. Target existence and authorization checks
    switch (dto.targetType) {
      case 'PROPERTY': {
        const prop = await this.prisma.property.findUnique({
          where: { id: dto.targetId },
          select: { id: true },
        });
        if (!prop) {
          throw new NotFoundException(`Property with ID "${dto.targetId}" not found.`);
        }
        propertyId = prop.id;
        break;
      }
      case 'REVIEW': {
        const rev = await this.prisma.review.findUnique({
          where: { id: dto.targetId },
          select: { id: true, guestUserId: true },
        });
        if (!rev) {
          throw new NotFoundException(`Review with ID "${dto.targetId}" not found.`);
        }
        if (rev.guestUserId === reporterUserId) {
          throw new BadRequestException('You cannot report your own review.');
        }
        reviewId = rev.id;
        break;
      }
      case 'USER': {
        const u = await this.prisma.user.findUnique({
          where: { id: dto.targetId },
          select: { id: true },
        });
        if (!u) {
          throw new NotFoundException(`User with ID "${dto.targetId}" not found.`);
        }
        if (u.id === reporterUserId) {
          throw new BadRequestException('You cannot report your own user account.');
        }
        reportedUserId = u.id;
        break;
      }
      case 'MESSAGE': {
        const msg = await this.prisma.message.findUnique({
          where: { id: dto.targetId },
          include: {
            conversation: {
              select: {
                guestUserId: true,
                hostProfile: { select: { userId: true } },
              },
            },
          },
        });
        if (!msg) {
          throw new NotFoundException(`Message with ID "${dto.targetId}" not found.`);
        }
        // Verify reporter is a participant in this conversation
        const isParticipant =
          msg.conversation.guestUserId === reporterUserId ||
          msg.conversation.hostProfile.userId === reporterUserId;
        if (!isParticipant) {
          throw new ForbiddenException('You cannot report messages from a conversation you are not a party to.');
        }
        if (msg.senderUserId === reporterUserId) {
          throw new BadRequestException('You cannot report your own message.');
        }
        messageId = msg.id;
        break;
      }
      default:
        throw new BadRequestException('Invalid target type.');
    }

    // 2. Prevent duplicate open reports from same user against same target
    const existingOpenReport = await this.prisma.contentReport.findFirst({
      where: {
        reporterUserId,
        status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
        propertyId,
        reviewId,
        reportedUserId,
        messageId,
      },
      select: { id: true },
    });

    if (existingOpenReport) {
      throw new BadRequestException(
        'You have already submitted a pending report for this item. Our moderation team is reviewing it.',
      );
    }

    // 3. Create the report
    const report = await this.prisma.contentReport.create({
      data: {
        reporterUserId,
        propertyId,
        reviewId,
        reportedUserId,
        messageId,
        reason: dto.reason,
        description: dto.description?.trim() ?? null,
        status: ReportStatus.OPEN,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'Report submitted successfully. Thank you for helping keep StayScape safe.',
      reportId: report.id,
      createdAt: report.createdAt.toISOString(),
    };
  }

  /**
   * Admin: List reports with filters and pagination.
   */
  async getReports(query: AdminReportQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ContentReportWhereInput = {};

    if (query.status && Object.values(ReportStatus).includes(query.status as ReportStatus)) {
      where.status = query.status as ReportStatus;
    }

    if (query.reason && Object.values(ReportReason).includes(query.reason as ReportReason)) {
      where.reason = query.reason as ReportReason;
    }

    if (query.targetType) {
      switch (query.targetType) {
        case 'PROPERTY':
          where.propertyId = { not: null };
          break;
        case 'REVIEW':
          where.reviewId = { not: null };
          break;
        case 'USER':
          where.reportedUserId = { not: null };
          break;
        case 'MESSAGE':
          where.messageId = { not: null };
          break;
      }
    }

    if (query.assignedAdminId) {
      where.assignedAdminId = query.assignedAdminId;
    }

    const [total, reports] = await Promise.all([
      this.prisma.contentReport.count({ where }),
      this.prisma.contentReport.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedAdmin: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          property: {
            select: { id: true, slug: true, title: true, city: true },
          },
          review: {
            select: { id: true, overallRating: true, comment: true },
          },
          reportedUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          message: {
            select: { id: true, content: true, senderUserId: true },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: reports.map((r) => {
        let targetType: 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE' = 'PROPERTY';
        let targetSummary: unknown = null;

        if (r.property) {
          targetType = 'PROPERTY';
          targetSummary = r.property;
        } else if (r.review) {
          targetType = 'REVIEW';
          targetSummary = {
            id: r.review.id,
            rating: r.review.overallRating,
            commentPreview: r.review.comment.slice(0, 100),
          };
        } else if (r.reportedUser) {
          targetType = 'USER';
          targetSummary = {
            id: r.reportedUser.id,
            email: r.reportedUser.email,
            name: `${r.reportedUser.firstName} ${r.reportedUser.lastName}`.trim(),
          };
        } else if (r.message) {
          targetType = 'MESSAGE';
          targetSummary = {
            id: r.message.id,
            contentPreview: r.message.content.slice(0, 100),
          };
        }

        return {
          id: r.id,
          targetType,
          targetSummary,
          reason: r.reason,
          description: r.description,
          status: r.status,
          resolutionNote: r.resolutionNote,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
          reporter: {
            id: r.reporter.id,
            name: `${r.reporter.firstName} ${r.reporter.lastName}`.trim(),
            email: r.reporter.email,
          },
          assignedAdmin: r.assignedAdmin
            ? {
                id: r.assignedAdmin.id,
                name: `${r.assignedAdmin.firstName} ${r.assignedAdmin.lastName}`.trim(),
                email: r.assignedAdmin.email,
              }
            : null,
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

  /**
   * Admin: Detailed view of a single report and target evidence.
   */
  async getReportDetails(reportId: string) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
        },
        assignedAdmin: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        property: {
          include: {
            hostProfile: {
              select: { id: true, displayName: true, user: { select: { email: true } } },
            },
            images: { where: { isCover: true }, take: 1, select: { secureUrl: true } },
          },
        },
        review: {
          include: {
            property: { select: { id: true, slug: true, title: true } },
            guestUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
            createdAt: true,
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderUser: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found.`);
    }

    let targetType: 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE' = 'PROPERTY';
    let targetDetails: unknown = null;

    if (report.property) {
      targetType = 'PROPERTY';
      targetDetails = {
        id: report.property.id,
        slug: report.property.slug,
        title: report.property.title,
        status: report.property.status,
        moderationStatus: report.property.moderationStatus,
        city: report.property.city,
        coverImage: report.property.images[0]?.secureUrl ?? null,
        host: {
          id: report.property.hostProfile.id,
          name: report.property.hostProfile.displayName,
          email: report.property.hostProfile.user.email,
        },
      };
    } else if (report.review) {
      targetType = 'REVIEW';
      targetDetails = {
        id: report.review.id,
        rating: report.review.overallRating,
        comment: report.review.comment,
        status: report.review.status,
        property: report.review.property,
        reviewer: {
          id: report.review.guestUser.id,
          name: `${report.review.guestUser.firstName} ${report.review.guestUser.lastName}`.trim(),
          email: report.review.guestUser.email,
        },
      };
    } else if (report.reportedUser) {
      targetType = 'USER';
      targetDetails = {
        id: report.reportedUser.id,
        email: report.reportedUser.email,
        name: `${report.reportedUser.firstName} ${report.reportedUser.lastName}`.trim(),
        status: report.reportedUser.status,
        role: report.reportedUser.role,
        registeredAt: report.reportedUser.createdAt.toISOString(),
      };
    } else if (report.message) {
      targetType = 'MESSAGE';
      targetDetails = {
        id: report.message.id,
        content: report.message.content,
        sentAt: report.message.createdAt.toISOString(),
        sender: {
          id: report.message.senderUser.id,
          name: `${report.message.senderUser.firstName} ${report.message.senderUser.lastName}`.trim(),
          email: report.message.senderUser.email,
        },
      };
    }

    return {
      id: report.id,
      targetType,
      targetDetails,
      reason: report.reason,
      description: report.description,
      status: report.status,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
      reporter: {
        id: report.reporter.id,
        name: `${report.reporter.firstName} ${report.reporter.lastName}`.trim(),
        email: report.reporter.email,
        registeredAt: report.reporter.createdAt.toISOString(),
      },
      assignedAdmin: report.assignedAdmin
        ? {
            id: report.assignedAdmin.id,
            name: `${report.assignedAdmin.firstName} ${report.assignedAdmin.lastName}`.trim(),
            email: report.assignedAdmin.email,
          }
        : null,
    };
  }

  /**
   * Admin: Assign report to an active administrator.
   */
  async assignReport(adminId: string, reportId: string, dto: AssignReportDto) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id: reportId },
      select: { id: true, assignedAdminId: true },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found.`);
    }

    const assignedAdmin = await this.prisma.user.findUnique({
      where: { id: dto.assignedAdminId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (
      !assignedAdmin ||
      assignedAdmin.role !== UserRole.ADMIN ||
      assignedAdmin.status !== 'ACTIVE'
    ) {
      throw new BadRequestException('Target user is not an active platform administrator.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contentReport.update({
        where: { id: reportId },
        data: {
          assignedAdminId: dto.assignedAdminId,
          status: ReportStatus.UNDER_REVIEW,
        },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'ASSIGN_REPORT',
          entityType: 'ContentReport',
          entityId: reportId,
          beforeData: { assignedAdminId: report.assignedAdminId },
          afterData: { assignedAdminId: dto.assignedAdminId, status: ReportStatus.UNDER_REVIEW },
          metadata: { assignedAdminEmail: assignedAdmin.email },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `Report assigned to administrator "${assignedAdmin.email}".`,
    };
  }

  /**
   * Admin: Update report status (UNDER_REVIEW, RESOLVED, DISMISSED) with resolution note.
   */
  async updateReportStatus(
    adminId: string,
    reportId: string,
    dto: UpdateReportStatusDto,
  ) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, resolutionNote: true },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found.`);
    }

    const isResolvedOrDismissed =
      dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;
    const resolvedAt = isResolvedOrDismissed ? new Date() : null;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentReport.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          resolutionNote: dto.resolutionNote ?? report.resolutionNote,
          resolvedAt,
        },
        select: { id: true, status: true, resolutionNote: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'UPDATE_REPORT_STATUS',
          entityType: 'ContentReport',
          entityId: reportId,
          reason: dto.resolutionNote ?? null,
          beforeData: { status: report.status },
          afterData: { status: updated.status, resolutionNote: updated.resolutionNote },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `Report status updated to "${dto.status}".`,
    };
  }
}

