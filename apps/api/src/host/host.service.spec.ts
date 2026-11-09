import { ConflictException, NotFoundException } from '@nestjs/common';
import { HostStatus } from '@prisma/client';
import { HostService } from './host.service';

describe('HostService', () => {
  let hostService: HostService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      hostProfile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      property: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    hostService = new HostService(mockPrisma);
  });

  describe('onboard', () => {
    it('should successfully onboard a user as a host', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        hostProfile: null,
      });

      const mockCreatedProfile = {
        id: 'host-1',
        userId: 'user-1',
        displayName: 'Mountain Retreats',
        bio: 'Cozy cabins in the valley',
        contactPhone: '+919876543210',
        status: HostStatus.ACTIVE,
        termsAcceptedAt: new Date(),
      };

      mockPrisma.hostProfile.create.mockResolvedValue(mockCreatedProfile);

      const result = await hostService.onboard('user-1', {
        displayName: 'Mountain Retreats',
        bio: 'Cozy cabins in the valley',
        contactPhone: '+919876543210',
        termsAccepted: true,
      });

      expect(result).toEqual(mockCreatedProfile);
      expect(mockPrisma.hostProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          displayName: 'Mountain Retreats',
          status: HostStatus.ACTIVE,
        }),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        hostService.onboard('non-existent', {
          displayName: 'Test Host',
          termsAccepted: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already has a host profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        hostProfile: { id: 'host-1' },
      });

      await expect(
        hostService.onboard('user-1', {
          displayName: 'Another Host Name',
          termsAccepted: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return host profile when found', async () => {
      const mockProfile = { id: 'host-1', userId: 'user-1', displayName: 'Host 1' };
      mockPrisma.hostProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await hostService.getProfile('user-1');
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when host profile is not found', async () => {
      mockPrisma.hostProfile.findUnique.mockResolvedValue(null);

      await expect(hostService.getProfile('user-unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update host profile fields', async () => {
      mockPrisma.hostProfile.findUnique.mockResolvedValue({ id: 'host-1', userId: 'user-1' });
      mockPrisma.hostProfile.update.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
        displayName: 'Updated Name',
      });

      const result = await hostService.updateProfile('user-1', { displayName: 'Updated Name' });
      expect(result.displayName).toBe('Updated Name');
      expect(mockPrisma.hostProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { displayName: 'Updated Name' },
      });
    });
  });

  describe('getDashboard', () => {
    it('should return aggregated counts and recent properties', async () => {
      mockPrisma.property.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // published
        .mockResolvedValueOnce(3) // draft
        .mockResolvedValueOnce(1) // paused
        .mockResolvedValueOnce(1); // archived

      mockPrisma.property.findMany.mockResolvedValue([
        {
          id: 'prop-1',
          slug: 'cedar-cabin-xyz',
          title: 'Cedar Cabin',
          propertyType: 'CABIN',
          status: 'PUBLISHED',
          city: 'Manali',
          state: 'HP',
          pricePerNightPaise: 500000,
          cleaningFeePaise: 50000,
          images: [{ secureUrl: 'https://img.test/1.jpg' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const dashboard = await hostService.getDashboard('host-1');

      expect(dashboard.totalProperties).toBe(10);
      expect(dashboard.publishedCount).toBe(5);
      expect(dashboard.draftCount).toBe(3);
      expect(dashboard.pausedCount).toBe(1);
      expect(dashboard.archivedCount).toBe(1);
      expect(dashboard.totalBookings).toBe(0);
      expect(dashboard.totalEarningsPaise).toBe(0);
      expect(dashboard.recentProperties).toHaveLength(1);
      expect(dashboard.recentProperties[0]?.coverImageUrl).toBe('https://img.test/1.jpg');
    });
  });
});
