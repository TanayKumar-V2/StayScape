import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { PropertyStatus } from '@prisma/client';

describe('WishlistService', () => {
  let service: WishlistService;

  const mockPrisma = {
    wishlistItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    review: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
  });

  describe('addToWishlist', () => {
    it('throws NotFoundException if property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.addToWishlist('user-1', 'prop-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('upserts wishlist entry when property is published', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        title: 'Mountain Chalet',
        status: PropertyStatus.PUBLISHED,
      });

      mockPrisma.wishlistItem.upsert.mockResolvedValue({
        id: 'wish-1',
        userId: 'user-1',
        propertyId: 'prop-1',
        createdAt: new Date(),
      });

      const res = await service.addToWishlist('user-1', 'prop-1');
      expect(res.propertyId).toBe('prop-1');
      expect(res.isSaved).toBe(true);
      expect(mockPrisma.wishlistItem.upsert).toHaveBeenCalled();
    });
  });

  describe('removeFromWishlist', () => {
    it('deletes wishlistItem successfully', async () => {
      mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.removeFromWishlist('user-1', 'prop-1');
      expect(res.isSaved).toBe(false);
      expect(res.propertyId).toBe('prop-1');
      expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns isSaved true when item exists', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({
        id: 'wish-1',
      });

      const res = await service.getStatus('user-1', 'prop-1');
      expect(res.isSaved).toBe(true);
    });

    it('returns isSaved false when item does not exist', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);

      const res = await service.getStatus('user-1', 'prop-1');
      expect(res.isSaved).toBe(false);
    });
  });
});
