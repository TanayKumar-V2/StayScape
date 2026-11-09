import { NotFoundException } from '@nestjs/common';
import { PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { AdminPropertiesService } from './admin-properties.service';

describe('AdminPropertiesService', () => {
  let service: AdminPropertiesService;
  let prisma: any;
  let redis: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      property: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminPropertiesService(prisma, redis, auditService);
  });

  describe('rejectProperty', () => {
    it('should throw NotFoundException if property does not exist', async () => {
      prisma.property.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectProperty('admin-1', 'prop-999', {
          reason: 'Inappropriate listing content',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update moderation status to REJECTED, invalidate cache, and log audit action', async () => {
      const mockProperty = {
        id: 'prop-1',
        title: 'Dubious Penthouse',
        slug: 'dubious-penthouse',
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
        hostProfile: {
          id: 'host-1',
          displayName: 'John Doe',
          user: { email: 'host@example.com' },
        },
      };

      prisma.property.findUnique.mockResolvedValue(mockProperty);
      prisma.property.update.mockResolvedValue({
        ...mockProperty,
        moderationStatus: PropertyModerationStatus.REJECTED,
      });

      const result = await service.rejectProperty('admin-1', 'prop-1', {
        reason: 'Misleading property photos and fake address reported by multiple guests',
      });

      expect(result.success).toBe(true);
      expect(prisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: expect.objectContaining({ moderationStatus: PropertyModerationStatus.REJECTED }),
        }),
      );
      expect(redis.incr).toHaveBeenCalledWith('cache:properties:version');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: 'admin-1',
          action: 'REJECT_PROPERTY',
          entityType: 'Property',
          entityId: 'prop-1',
        }),
        prisma,
      );
    });
  });

  describe('approveProperty', () => {
    it('should update moderation status to APPROVED and invalidate cache', async () => {
      const mockProperty = {
        id: 'prop-2',
        title: 'Hilltop Villa',
        slug: 'hilltop-villa',
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.FLAGGED,
        hostProfile: {
          id: 'host-2',
          displayName: 'Jane Doe',
          user: { email: 'jane@example.com' },
        },
      };

      prisma.property.findUnique.mockResolvedValue(mockProperty);
      prisma.property.update.mockResolvedValue({
        ...mockProperty,
        moderationStatus: PropertyModerationStatus.APPROVED,
      });

      const result = await service.approveProperty('admin-1', 'prop-2', {
        reason: 'Host submitted proof of utility bill and correct location details',
      });

      expect(result.success).toBe(true);
      expect(prisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-2' },
          data: expect.objectContaining({ moderationStatus: PropertyModerationStatus.APPROVED }),
        }),
      );
      expect(redis.incr).toHaveBeenCalledWith('cache:properties:version');
    });
  });
});
