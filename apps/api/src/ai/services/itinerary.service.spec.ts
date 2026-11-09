import { Test, TestingModule } from '@nestjs/testing';
import { ItineraryService } from './itinerary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { HostStatus, PropertyStatus, PropertyType, PropertyModerationStatus } from '@prisma/client';

describe('ItineraryService', () => {
  let service: ItineraryService;
  let groqService: jest.Mocked<GroqService>;
  let prismaService: {
    property: {
      findUnique: jest.Mock;
    };
  };

  const mockProperty = {
    slug: 'the-alpine-hideaway',
    title: 'The Alpine Hideaway',
    propertyType: PropertyType.CABIN,
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    status: PropertyStatus.PUBLISHED,
    moderationStatus: PropertyModerationStatus.APPROVED,
    hostProfile: { status: HostStatus.ACTIVE },
  };

  beforeEach(async () => {
    const mockGroq = {
      isAvailable: jest.fn().mockReturnValue(true),
      createJsonCompletion: jest.fn(),
    };

    prismaService = {
      property: {
        findUnique: jest.fn().mockResolvedValue(mockProperty),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItineraryService,
        { provide: GroqService, useValue: mockGroq },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ItineraryService>(ItineraryService);
    groqService = module.get(GroqService);
  });

  it('should generate itinerary with disclaimer', async () => {
    groqService.createJsonCompletion.mockResolvedValue({
      days: [
        {
          dayNumber: 1,
          title: 'Arrival & Cedar Woods Walk',
          morning: 'Arrive in Manali',
          afternoon: 'Explore Old Manali cafes',
          evening: 'Relax by cabin fireplace',
          localTip: 'Visit Hadimba temple early',
        },
      ],
    });

    const result = await service.generate({
      propertySlug: 'the-alpine-hideaway',
      days: 1,
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.destination).toContain('Manali');
    expect(result.days).toHaveLength(1);
    expect(result.disclaimer).toContain('AI-generated travel inspirations');
  });

  it('should fallback to template itinerary when Groq is unavailable', async () => {
    groqService.isAvailable.mockReturnValue(false);

    const result = await service.generate({
      propertySlug: 'the-alpine-hideaway',
      days: 3,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.days).toHaveLength(3);
    expect(result.disclaimer).toBeDefined();
  });
});

