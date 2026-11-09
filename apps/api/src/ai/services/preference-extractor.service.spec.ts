import { Test, TestingModule } from '@nestjs/testing';
import { PreferenceExtractorService } from './preference-extractor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { PropertyType } from '@prisma/client';

describe('PreferenceExtractorService', () => {
  let service: PreferenceExtractorService;
  let groqService: jest.Mocked<GroqService>;

  beforeEach(async () => {
    const mockGroq = {
      isAvailable: jest.fn().mockReturnValue(true),
      createJsonCompletion: jest.fn(),
    };

    const mockPrisma = {
      amenity: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { slug: 'wifi' },
            { slug: 'pool' },
            { slug: 'mountain-view' },
            { slug: 'pet-friendly' },
          ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferenceExtractorService,
        { provide: GroqService, useValue: mockGroq },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PreferenceExtractorService>(PreferenceExtractorService);
    groqService = module.get(GroqService);
  });

  it('should extract preferences via Groq and normalize catalog amenities', async () => {
    groqService.createJsonCompletion.mockResolvedValue({
      destination: 'Manali',
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      budget: { minPaise: null, maxPaise: 700000, scope: 'PER_NIGHT' },
      guests: { adults: 2, children: 0, total: 2 },
      propertyTypes: ['CABIN'],
      requiredAmenities: ['wifi', 'helipad'], // helipad is not in catalog!
      preferredAmenities: ['mountain-view'],
      stylePreferences: ['cozy'],
      unresolvedPreferences: [],
      intentStatus: 'READY',
      summary: 'Cozy cabin in Manali for 2 guests.',
    });

    const result = await service.extractPreferences({
      query: 'Cozy cabin in Manali with wifi and helipad for 2',
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.preferences.destination).toBe('Manali');
    expect(result.preferences.propertyTypes).toEqual([PropertyType.CABIN]);
    expect(result.preferences.requiredAmenities).toEqual(['wifi']);
    expect(result.preferences.unresolvedPreferences).toContain('helipad');
  });

  it('should fallback deterministically when Groq is unavailable', async () => {
    groqService.isAvailable.mockReturnValue(false);

    const result = await service.extractPreferences({
      query: 'Need a pet friendly cabin in Manali under 5k for 2 guests',
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.preferences.destination).toBe('Manali');
    expect(result.preferences.propertyTypes).toContain(PropertyType.CABIN);
    expect(result.preferences.guests?.total).toBe(2);
    expect(result.preferences.budget?.maxPaise).toBe(500000);
    expect(result.preferences.preferredAmenities).toContain('pet-friendly');
  });
});
