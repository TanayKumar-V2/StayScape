import { Test, TestingModule } from '@nestjs/testing';
import { StayMatchService } from './staymatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PreferenceExtractorService } from './preference-extractor.service';
import { PropertyRankingService } from './property-ranking.service';
import { PropertyType } from '@prisma/client';

describe('StayMatchService', () => {
  let service: StayMatchService;
  let extractor: jest.Mocked<PreferenceExtractorService>;
  let ranking: jest.Mocked<PropertyRankingService>;
  let prisma: {
    property: {
      findMany: jest.Mock;
    };
    booking: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockExtractor = {
      extractPreferences: jest.fn(),
    };

    const mockRanking = {
      rankProperties: jest.fn(),
    };

    prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prop-1',
            slug: 'cabin-in-woods',
            title: 'Cabin in Woods',
            propertyType: PropertyType.CABIN,
            city: 'Manali',
            state: 'Himachal Pradesh',
            country: 'India',
            pricePerNightPaise: 500000,
            cleaningFeePaise: 50000,
            maxGuests: 4,
            bedrooms: 2,
            beds: 2,
            bathrooms: 2,
            amenities: [],
            images: [],
            hostProfile: { displayName: 'Rajesh', bio: null },
          },
        ]),
      },
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StayMatchService,
        { provide: PreferenceExtractorService, useValue: mockExtractor },
        { provide: PropertyRankingService, useValue: mockRanking },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StayMatchService>(StayMatchService);
    extractor = module.get(PreferenceExtractorService);
    ranking = module.get(PropertyRankingService);
  });

  it('should return unsupported query message when intent is UNSUPPORTED', async () => {
    extractor.extractPreferences.mockResolvedValue({
      preferences: {
        destination: null,
        propertyTypes: [],
        budget: null,
        guests: null,
        requiredAmenities: [],
        preferredAmenities: [],
        stylePreferences: [],
        unresolvedPreferences: [],
        intentStatus: 'UNSUPPORTED',
        clarificationQuestion: null,
        summary: 'Query is unsupported.',
      },
      fallbackUsed: false,
    });

    const result = await service.search({ query: 'How to build a rocket?' });

    expect(result.results).toHaveLength(0);
    expect(result.interpretedPreferences.intentStatus).toBe('UNSUPPORTED');
  });

  it('should search database and rank matching properties', async () => {
    extractor.extractPreferences.mockResolvedValue({
      preferences: {
        destination: 'Manali',
        propertyTypes: [PropertyType.CABIN],
        budget: { minPaise: null, maxPaise: 600000, scope: 'PER_NIGHT' },
        guests: { adults: 2, total: 2 },
        requiredAmenities: [],
        preferredAmenities: [],
        stylePreferences: ['cozy'],
        unresolvedPreferences: [],
        intentStatus: 'READY',
        clarificationQuestion: null,
        summary: 'Cabin in Manali for 2 under ₹6,000.',
      },
      fallbackUsed: false,
    });

    ranking.rankProperties.mockReturnValue([
      {
        id: 'prop-1',
        slug: 'cabin-in-woods',
        title: 'Cabin in Woods',
        description: 'Cozy cabin in Manali',
        propertyType: PropertyType.CABIN,
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        pricePerNightPaise: 500000,
        cleaningFeePaise: 50000,
        currency: 'INR',
        approximateCoordinates: null,
        maxGuests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        images: [],
        amenities: [],
        host: { displayName: 'Rajesh', bio: null },
        publishedAt: new Date(),
        averageRating: null,
        reviewCount: 0,
        matchScore: 95,
        matchReasons: ['Located in Manali', 'Under budget at ₹5,000/night'],
        tradeOffs: [],
      },
    ]);

    const result = await service.search({ query: 'Cozy cabin in Manali for 2 under 6k' });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].matchScore).toBe(95);
    expect(result.results[0].matchReasons).toContain('Located in Manali');
    expect(result.totalMatched).toBe(1);
  });
});
