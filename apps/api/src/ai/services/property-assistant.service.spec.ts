import { Test, TestingModule } from '@nestjs/testing';
import { PropertyAssistantService } from './property-assistant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { HostStatus, PropertyStatus, PropertyType, PropertyModerationStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('PropertyAssistantService', () => {
  let service: PropertyAssistantService;
  let groqService: jest.Mocked<GroqService>;
  let prismaService: {
    property: {
      findUnique: jest.Mock;
    };
  };

  const mockProperty = {
    id: 'prop-1',
    slug: 'the-alpine-hideaway',
    title: 'The Alpine Hideaway',
    description: 'Cedar wood cabin with radiant heated floors and mountain panoramas.',
    propertyType: PropertyType.CABIN,
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    pricePerNightPaise: 580000,
    cleaningFeePaise: 80000,
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    houseRules: ['Quiet hours after 10 PM', 'No indoor smoking'],
    status: PropertyStatus.PUBLISHED,
    moderationStatus: PropertyModerationStatus.APPROVED,
    hostProfile: { displayName: 'Rajesh Sharma', status: HostStatus.ACTIVE },
    amenities: [
      { amenity: { name: 'Fast Wi-Fi', slug: 'wifi' } },
      { amenity: { name: 'Dedicated workspace', slug: 'workspace' } },
      { amenity: { name: 'Scenic mountain view', slug: 'mountain-view' } },
    ],
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
        PropertyAssistantService,
        { provide: GroqService, useValue: mockGroq },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PropertyAssistantService>(PropertyAssistantService);
    groqService = module.get(GroqService);
  });

  it('should answer questions using Groq grounded facts', async () => {
    groqService.createJsonCompletion.mockResolvedValue({
      answer:
        'Yes, The Alpine Hideaway features fast Wi-Fi and a dedicated workspace suitable for remote work.',
      confidence: 'VERIFIED_FACT',
      referencedFacts: ['Fast Wi-Fi', 'Dedicated workspace'],
    });

    const result = await service.askQuestion('the-alpine-hideaway', {
      question: 'Is Wi-Fi fast enough for remote work?',
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.confidence).toBe('VERIFIED_FACT');
    expect(result.referencedFacts).toContain('Fast Wi-Fi');
  });

  it('should throw NotFoundException if property does not exist', async () => {
    prismaService.property.findUnique.mockResolvedValue(null);

    await expect(
      service.askQuestion('non-existent-stay', { question: 'Is parking free?' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should fall back gracefully to factual policy restriction when asked for private address', async () => {
    groqService.isAvailable.mockReturnValue(false);

    const result = await service.askQuestion('the-alpine-hideaway', {
      question: 'What is the exact street address and phone number of the host?',
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.confidence).toBe('POLICY_RESTRICTION');
    expect(result.answer).toContain('For privacy and safety');
  });
});
