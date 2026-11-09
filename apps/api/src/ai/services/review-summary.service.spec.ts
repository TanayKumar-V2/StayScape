import { Test, TestingModule } from '@nestjs/testing';
import { ReviewSummaryService } from './review-summary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { GroqService } from './groq.service';
import { NotFoundException } from '@nestjs/common';
import { PropertyStatus, PropertyModerationStatus } from '@prisma/client';

describe('ReviewSummaryService', () => {
  let service: ReviewSummaryService;

  const mockPrisma = {
    property: {
      findUnique: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue(['cache:review-summary:manali-cabin:1:llama3']),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    scanAndDelete: jest.fn().mockResolvedValue(1),
  };

  const mockGroqService = {
    isAvailable: jest.fn().mockReturnValue(true),
    getModel: jest.fn().mockReturnValue('llama-3.3-70b-versatile'),
    createJsonCompletion: jest.fn(),
    chatCompletionJson: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewSummaryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: GroqService, useValue: mockGroqService },
      ],
    }).compile();

    service = module.get<ReviewSummaryService>(ReviewSummaryService);
  });

  describe('getReviewSummary', () => {
    it('throws NotFoundException if property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(service.getReviewSummary('unknown-slug')).rejects.toThrow(NotFoundException);
    });

    it('returns available: false when property has fewer than 3 reviews', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        slug: 'manali-cabin',
        title: 'Manali Cabin',
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { overallRating: 5, comment: 'Nice', updatedAt: new Date() },
        { overallRating: 4, comment: 'Good', updatedAt: new Date() },
      ]);

      const result = await service.getReviewSummary('manali-cabin');
      expect(result.available).toBe(false);
      if (!result.available) {
        expect(result.reason).toBe('INSUFFICIENT_REVIEWS');
      }
      expect(mockGroqService.chatCompletionJson).not.toHaveBeenCalled();
    });

    it('generates AI summary when property has 3 or more published reviews', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        slug: 'manali-cabin',
        title: 'Manali Cabin',
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
      });

      mockRedisClient.get.mockResolvedValue(null); // No cache hit
      mockPrisma.review.findMany.mockResolvedValue([
        {
          overallRating: 5,
          cleanlinessRating: 5,
          accuracyRating: 5,
          communicationRating: 5,
          locationRating: 5,
          checkInRating: 5,
          valueRating: 5,
          title: 'Great',
          comment: 'Breathtaking sunrise views and great hosts.',
          updatedAt: new Date('2026-01-01'),
        },
        {
          overallRating: 5,
          cleanlinessRating: 5,
          accuracyRating: 5,
          communicationRating: 5,
          locationRating: 5,
          checkInRating: 5,
          valueRating: 5,
          title: 'Peaceful',
          comment: 'Super peaceful place with reliable Wi-Fi.',
          updatedAt: new Date('2026-01-05'),
        },
        {
          overallRating: 4,
          cleanlinessRating: 4,
          accuracyRating: 4,
          communicationRating: 5,
          locationRating: 4,
          checkInRating: 5,
          valueRating: 4,
          title: 'Good trip',
          comment: 'Steep driveway road but worth every bit.',
          updatedAt: new Date('2026-01-10'),
        },
      ]);

      mockGroqService.createJsonCompletion.mockResolvedValue({
        headline: 'Guests love the mountain views and peaceful vibe.',
        overallSentiment: 'POSITIVE',
        highlights: [
          {
            topic: 'Mountain Views',
            summary: 'Unmatched sunrise and valley panoramas praised by travelers.',
          },
          { topic: 'Wi-Fi', summary: 'Reliable and fast internet for remote work.' },
        ],
        concerns: [{ topic: 'Road Access', summary: 'Steep driveway road requires attention.' }],
      });

      const result = await service.getReviewSummary('manali-cabin');

      expect(result.available).toBe(true);
      if (result.available) {
        expect(result.reviewCount).toBe(3);
        expect(result.overallSentiment).toBe('POSITIVE');
        expect(result.highlights).toHaveLength(2);
        expect(result.concerns).toHaveLength(1);
      }
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('returns cached summary directly when available in Redis', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        slug: 'manali-cabin',
        title: 'Manali Cabin',
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { overallRating: 5, comment: 'Nice 1', updatedAt: new Date('2026-01-01') },
        { overallRating: 5, comment: 'Nice 2', updatedAt: new Date('2026-01-02') },
        { overallRating: 5, comment: 'Nice 3', updatedAt: new Date('2026-01-03') },
      ]);

      const cachedPayload = {
        available: true,
        headline: 'Cached headline',
        overallSentiment: 'POSITIVE',
        highlights: [{ topic: 'Highlight 1', summary: 'Summary' }],
        concerns: [],
        reviewCount: 3,
        generatedAt: '2026-01-04T00:00:00.000Z',
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedPayload));

      const result = await service.getReviewSummary('manali-cabin');
      expect(result.available).toBe(true);
      if (result.available) {
        expect(result.headline).toBe('Cached headline');
      }
      expect(mockGroqService.chatCompletionJson).not.toHaveBeenCalled();
    });
  });

  describe('invalidateSummaryCache', () => {
    it('deletes cached review summary keys via SCAN-based invalidation', async () => {
      await service.invalidateSummaryCache('manali-cabin');
      expect(mockRedisService.scanAndDelete).toHaveBeenCalledWith(
        'cache:review-summary:manali-cabin:*',
      );
      // No destructive KEYS scan should hit the shared Redis client
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });
});
