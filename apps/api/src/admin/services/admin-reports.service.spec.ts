import { NotFoundException } from '@nestjs/common';
import { ReportReason, ReportStatus } from '@prisma/client';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      contentReport: {
        create: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findUnique: jest.fn(),
      },
      review: {
        findUnique: jest.fn(),
      },
      message: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminReportsService(prisma, auditService);
  });

  describe('createReport', () => {
    it('should throw NotFoundException if reported property target does not exist', async () => {
      prisma.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport('reporter-1', {
          targetType: 'PROPERTY',
          targetId: 'non-existent-prop-id',
          reason: ReportReason.MISLEADING_LISTING,
          description: 'Listing does not exist',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create a content report for a valid property', async () => {
      prisma.property.findUnique.mockResolvedValue({ id: 'prop-1' });
      prisma.contentReport.create.mockResolvedValue({
        id: 'rep-1',
        reporterUserId: 'reporter-1',
        propertyId: 'prop-1',
        reason: ReportReason.MISLEADING_LISTING,
        description: 'Photos do not match the real place',
        status: ReportStatus.OPEN,
        createdAt: new Date(),
      });

      const report = await service.createReport('reporter-1', {
        targetType: 'PROPERTY',
        targetId: 'prop-1',
        reason: ReportReason.MISLEADING_LISTING,
        description: 'Photos do not match the real place',
      });

      expect(report.success).toBe(true);
      expect(report.reportId).toBe('rep-1');
      expect(prisma.contentReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterUserId: 'reporter-1',
            propertyId: 'prop-1',
            reason: ReportReason.MISLEADING_LISTING,
          }),
        }),
      );
    });
  });

  describe('updateReportStatus', () => {
    it('should throw NotFoundException if report is not found', async () => {
      prisma.contentReport.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReportStatus('admin-1', 'rep-404', {
          status: ReportStatus.RESOLVED,
          resolutionNote: 'Listing was taken down',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status to RESOLVED, save notes, and write audit log', async () => {
      const mockReport = {
        id: 'rep-10',
        status: ReportStatus.UNDER_REVIEW,
        assignedAdminId: 'admin-1',
        propertyId: 'prop-5',
        reviewId: null,
        messageId: null,
        reportedUserId: null,
      };

      prisma.contentReport.findUnique.mockResolvedValue(mockReport);
      prisma.contentReport.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RESOLVED,
        resolutionNotes: 'Host has been suspended and property unlisted.',
      });

      const updated = await service.updateReportStatus('admin-1', 'rep-10', {
        status: ReportStatus.RESOLVED,
        resolutionNote: 'Host has been suspended and property unlisted.',
      });

      expect(updated.success).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: 'admin-1',
          action: 'UPDATE_REPORT_STATUS',
          entityType: 'ContentReport',
          entityId: 'rep-10',
        }),
        prisma,
      );
    });
  });
});
