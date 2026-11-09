import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BookingStatus, ReviewStatus } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisClient = {
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('checkEligibility', () => {
    it('returns BOOKING_NOT_FOUND if booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const res = await service.checkEligibility('user-1', 'BK-UNKNOWN');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('BOOKING_NOT_FOUND');
    });

    it('returns BOOKING_NOT_FOUND if booking belongs to another user', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'other-user',
        status: BookingStatus.COMPLETED,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2026-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        reviews: [],
      });

      const res = await service.checkEligibility('user-1', 'BK-123');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('BOOKING_NOT_FOUND');
    });

    it('returns ineligible if booking status is neither CONFIRMED nor COMPLETED', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'user-1',
        status: BookingStatus.HOLD,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2026-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        reviews: [],
      });

      const res = await service.checkEligibility('user-1', 'BK-123');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('INVALID_STATUS');
    });

    it('returns ineligible if check_out date is still in the future', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'user-1',
        status: BookingStatus.CONFIRMED,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2099-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        reviews: [],
      });

      const res = await service.checkEligibility('user-1', 'BK-123');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('STAY_NOT_COMPLETED');
    });

    it('returns ineligible if review has already been submitted', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'user-1',
        status: BookingStatus.COMPLETED,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2026-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        reviews: [{ id: 'rev-1', status: ReviewStatus.PUBLISHED, createdAt: new Date() }],
      });

      const res = await service.checkEligibility('user-1', 'BK-123');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('ALREADY_REVIEWED');
    });

    it('returns eligible when booking is valid, completed, and unreviewed', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'user-1',
        propertyId: 'prop-1',
        status: BookingStatus.COMPLETED,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2026-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        reviews: [],
      });

      const res = await service.checkEligibility('user-1', 'BK-123');
      expect(res.eligible).toBe(true);
      expect(res.booking?.bookingReference).toBe('BK-123');
    });
  });

  describe('createReview', () => {
    it('creates review and marks booking completed if it was confirmed', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'bk-1',
        bookingReference: 'BK-123',
        userId: 'user-1',
        propertyId: 'prop-1',
        status: BookingStatus.CONFIRMED,
        checkIn: new Date('2026-01-01'),
        checkOut: new Date('2026-01-05'),
        propertyTitleSnapshot: 'Villa',
        propertySlugSnapshot: 'villa',
        property: { id: 'prop-1', title: 'Villa', slug: 'villa' },
        reviews: [],
      });

      const createdReview = {
        id: 'rev-1',
        bookingId: 'bk-1',
        propertyId: 'prop-1',
        guestUserId: 'user-1',
        overallRating: 5,
        cleanlinessRating: 5,
        accuracyRating: 5,
        communicationRating: 5,
        locationRating: 5,
        checkInRating: 5,
        valueRating: 5,
        title: 'Superb stay',
        comment: 'Incredible stay with stunning views and flawless service.',
        status: ReviewStatus.PUBLISHED,
        hostResponse: null,
        hostRespondedAt: null,
        createdAt: new Date('2026-02-01T10:00:00Z'),
        updatedAt: new Date('2026-02-01T10:00:00Z'),
        guestUser: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          avatarUrl: null,
        },
      };

      mockPrisma.review.create.mockResolvedValue(createdReview);

      const result = await service.createReview('user-1', {
        bookingReference: 'BK-123',
        overallRating: 5,
        cleanlinessRating: 5,
        accuracyRating: 5,
        communicationRating: 5,
        locationRating: 5,
        checkInRating: 5,
        valueRating: 5,
        title: 'Superb stay',
        comment: 'Incredible stay with stunning views and flawless service.',
      });

      expect(result.id).toBe('rev-1');
      expect(result.overallRating).toBe(5);
    });
  });

  describe('respondAsHost', () => {
    it('throws NotFoundException if review does not exist', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.respondAsHost('host-user-1', 'rev-unknown', 'Thank you for staying!'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the host of the property', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        property: {
          hostProfile: {
            userId: 'actual-host-user',
          },
        },
      });

      await expect(
        service.respondAsHost('imposter-host', 'rev-1', 'Thank you for staying!'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('attaches host response when user is the genuine host', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        bookingId: 'bk-1',
        propertyId: 'prop-1',
        guestUserId: 'guest-1',
        overallRating: 5,
        cleanlinessRating: 5,
        accuracyRating: 5,
        communicationRating: 5,
        locationRating: 5,
        checkInRating: 5,
        valueRating: 5,
        title: 'Wonderful stay!',
        comment: 'Wonderful stay!',
        status: ReviewStatus.PUBLISHED,
        hostResponse: null,
        hostRespondedAt: null,
        createdAt: new Date('2026-02-01T10:00:00Z'),
        updatedAt: new Date('2026-02-01T10:00:00Z'),
        guestUser: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          avatarUrl: null,
        },
        property: {
          id: 'prop-1',
          slug: 'villa',
          title: 'Villa',
          hostProfile: {
            userId: 'host-user-1',
          },
        },
      });

      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        bookingId: 'bk-1',
        propertyId: 'prop-1',
        guestUserId: 'guest-1',
        overallRating: 5,
        cleanlinessRating: 5,
        accuracyRating: 5,
        communicationRating: 5,
        locationRating: 5,
        checkInRating: 5,
        valueRating: 5,
        title: 'Wonderful stay!',
        comment: 'Wonderful stay!',
        hostResponse: 'Thank you Ananya, looking forward to welcoming you back!',
        hostRespondedAt: new Date('2026-02-02T10:00:00Z'),
        status: ReviewStatus.PUBLISHED,
        createdAt: new Date('2026-02-01T10:00:00Z'),
        updatedAt: new Date('2026-02-02T10:00:00Z'),
        guestUser: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          avatarUrl: null,
        },
      });

      const res = await service.respondAsHost(
        'host-user-1',
        'rev-1',
        'Thank you Ananya, looking forward to welcoming you back!',
      );

      expect(res.hostResponse).toBeDefined();
      expect(res.hostResponse).toContain('Thank you Ananya');
    });
  });
});
