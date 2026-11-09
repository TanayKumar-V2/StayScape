import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminUsersService(prisma, auditService);
  });

  describe('suspendUser', () => {
    it('should throw ForbiddenException when admin attempts to suspend themselves', async () => {
      await expect(
        service.suspendUser('admin-1', 'admin-1', {
          reason: 'Self suspension not allowed',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendUser('admin-1', 'user-404', {
          reason: 'Violated terms',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'suspended@example.com',
        status: AccountStatus.SUSPENDED,
      });

      await expect(
        service.suspendUser('admin-1', 'user-2', {
          reason: 'Suspended again',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully suspend a user, increment tokenVersion, revoke refresh tokens, and write audit log', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'badactor@example.com',
        status: AccountStatus.ACTIVE,
        role: UserRole.USER,
        tokenVersion: 1,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: AccountStatus.SUSPENDED,
        tokenVersion: 2,
      });

      const result = await service.suspendUser('admin-1', 'user-2', {
        reason: 'Payment fraud pattern identified',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: {
          status: AccountStatus.SUSPENDED,
          tokenVersion: { increment: 1 },
        },
        select: { id: true, status: true, tokenVersion: true },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-2' },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: 'admin-1',
          action: 'SUSPEND_USER',
          entityType: 'User',
          entityId: 'user-2',
          reason: 'Payment fraud pattern identified',
        }),
        prisma,
      );
    });
  });

  describe('activateUser', () => {
    it('should throw BadRequestException if user is already active', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'active@example.com',
        status: AccountStatus.ACTIVE,
      });

      await expect(
        service.activateUser('admin-1', 'user-3', {
          reason: 'Reactivate',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully activate a suspended user and log audit record', async () => {
      const mockUser = {
        id: 'user-3',
        email: 'reinstated@example.com',
        status: AccountStatus.SUSPENDED,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: AccountStatus.ACTIVE,
      });

      const result = await service.activateUser('admin-1', 'user-3', {
        reason: 'Identity verified after appeal',
      });

      expect(result.success).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: 'admin-1',
          action: 'ACTIVATE_USER',
          entityType: 'User',
          entityId: 'user-3',
        }),
        prisma,
      );
    });
  });
});
