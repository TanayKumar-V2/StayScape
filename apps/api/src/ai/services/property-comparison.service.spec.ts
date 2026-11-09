import { Test, TestingModule } from '@nestjs/testing';
import { PropertyComparisonService } from './property-comparison.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { HostStatus, PropertyStatus, PropertyType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PropertyComparisonService', () => {
  let service: PropertyComparisonService;
  let groqService: jest.Mocked<GroqService>;
  let prismaService: {
    property: {
      findMany: jest.Mock;
    };
  };

  const mockProps = [
    {
      id: 'prop-1',
      slug: 'stay-1',
      title: 'Alpine Cabin',
      propertyType: PropertyType.CABIN,
      city: 'Manali',
      state: 'HP',
      pricePerNightPaise: 500000,
      cleaningFeePaise: 50000,
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 2,
      checkInFrom: '14:00',
      checkOutUntil: '11:00',
      houseRules: ['No smoking'],
      status: PropertyStatus.PUBLISHED,
      hostProfile: { status: HostStatus.ACTIVE },
      images: [{ isCover: true, secureUrl: 'https://img.com/1.jpg' }],
      amenities: [
        { amenity: { name: 'Fast Wi-Fi', slug: 'wifi' } },
        { amenity: { name: 'Heating', slug: 'heating' } },
      ],
    },
    {
      id: 'prop-2',
      slug: 'stay-2',
      title: 'Goa Villa',
      propertyType: PropertyType.VILLA,
      city: 'Goa',
      state: 'Goa',
      pricePerNightPaise: 1500000,
      cleaningFeePaise: 100000,
      maxGuests: 8,
      bedrooms: 4,
      beds: 5,
      bathrooms: 4,
      checkInFrom: '15:00',
      checkOutUntil: '11:00',
      houseRules: ['Quiet hours after 10 PM'],
      status: PropertyStatus.PUBLISHED,
      hostProfile: { status: HostStatus.ACTIVE },
      images: [{ isCover: true, secureUrl: 'https://img.com/2.jpg' }],
      amenities: [
        { amenity: { name: 'Fast Wi-Fi', slug: 'wifi' } },
        { amenity: { name: 'Private pool', slug: 'pool' } },
      ],
    },
  ];

  beforeEach(async () => {
    const mockGroq = {
      isAvailable: jest.fn().mockReturnValue(true),
      createJsonCompletion: jest.fn(),
    };

    prismaService = {
      property: {
        findMany: jest.fn().mockResolvedValue(mockProps),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyComparisonService,
        { provide: GroqService, useValue: mockGroq },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PropertyComparisonService>(PropertyComparisonService);
    groqService = module.get(GroqService);
  });

  it('should reject if fewer than 2 property slugs are provided', async () => {
    await expect(service.compare({ propertySlugs: ['stay-1'] })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should compute common amenities and differences', async () => {
    groqService.createJsonCompletion.mockResolvedValue({
      aiSummary: 'Comparative analysis of Alpine Cabin and Goa Villa.',
      bestFor: { 'stay-1': 'Couples and small groups', 'stay-2': 'Large family gatherings' },
      keyDifferences: ['Alpine cabin has heating', 'Goa villa has private pool'],
    });

    const result = await service.compare({ propertySlugs: ['stay-1', 'stay-2'] });

    expect(result.fallbackUsed).toBe(false);
    expect(result.matrix.commonAmenities).toContain('Fast Wi-Fi');
    expect(result.matrix.exclusiveAmenities['stay-1']).toContain('Heating');
    expect(result.matrix.exclusiveAmenities['stay-2']).toContain('Private pool');
    expect(result.matrix.priceDifferencePaise).toBe(1000000);
    expect(result.matrix.capacityDifference).toBe(4);
    expect(result.bestFor['stay-1']).toBe('Couples and small groups');
  });
});
