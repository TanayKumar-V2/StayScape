import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PropertyStatus, PropertyType } from '@prisma/client';
import { PropertiesService, slugify } from './properties.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      amenity: {
        count: jest.fn(),
      },
      propertyAmenity: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    service = new PropertiesService(mockPrisma);
  });

  describe('slugify', () => {
    it('should generate a clean url-friendly slug', () => {
      const slug = slugify('Luxury Villa in Goa with Private Pool!');
      expect(slug).toMatch(/^luxury-villa-in-goa-with-private-pool-[a-z0-9]+$/);
    });
  });

  describe('create', () => {
    it('should create a property draft', async () => {
      mockPrisma.amenity.count.mockResolvedValue(1);
      mockPrisma.property.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'prop-1', ...data }),
      );

      const dto = {
        title: 'Serene Alpine Cottage',
        description:
          'A cozy cottage nestled amidst apple orchards and towering pine trees in Manali.',
        propertyType: PropertyType.CABIN,
        addressLine1: '12 Old Road',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        postalCode: '175103',
        maxGuests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        pricePerNightPaise: 450000,
        cleaningFeePaise: 50000,
        amenityIds: ['amenity-1'],
      };

      const result = await service.create('host-1', dto);

      expect(result.id).toBe('prop-1');
      expect(result.status).toBe(PropertyStatus.DRAFT);
      expect(mockPrisma.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hostProfileId: 'host-1',
            title: dto.title,
            status: PropertyStatus.DRAFT,
          }),
        }),
      );
    });

    it('should reject invalid amenity IDs', async () => {
      mockPrisma.amenity.count.mockResolvedValue(0);

      const dto = {
        title: 'Serene Alpine Cottage',
        description:
          'A cozy cottage nestled amidst apple orchards and towering pine trees in Manali.',
        propertyType: PropertyType.CABIN,
        addressLine1: '12 Old Road',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        postalCode: '175103',
        maxGuests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        pricePerNightPaise: 450000,
        amenityIds: ['invalid-id'],
      };

      await expect(service.create('host-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneForHost', () => {
    it('should return property when host is the owner', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        hostProfileId: 'host-1',
        title: 'Alpine Cabin',
      });

      const result = await service.findOneForHost('host-1', 'prop-1');
      expect(result.id).toBe('prop-1');
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);
      await expect(service.findOneForHost('host-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if property belongs to another host', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        hostProfileId: 'different-host',
      });

      await expect(service.findOneForHost('host-1', 'prop-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    const validProperty = {
      id: 'prop-1',
      hostProfileId: 'host-1',
      title: 'Serene Cedar Cabin with Mountain Views',
      description:
        'A beautifully restored wooden retreat in Old Manali overlooking deodar forests.',
      addressLine1: '42 Pine Lane',
      city: 'Manali',
      state: 'Himachal Pradesh',
      country: 'India',
      postalCode: '175103',
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 2,
      pricePerNightPaise: 500000,
      status: PropertyStatus.DRAFT,
      images: [
        { id: '1', isCover: true },
        { id: '2', isCover: false },
        { id: '3', isCover: false },
        { id: '4', isCover: false },
        { id: '5', isCover: false },
      ],
      amenities: [{ amenityId: 'am-1' }],
    };

    it('should publish when all readiness criteria are met', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(validProperty);
      mockPrisma.property.update.mockResolvedValue({
        ...validProperty,
        status: PropertyStatus.PUBLISHED,
      });

      const published = await service.publish('host-1', 'prop-1');
      expect(published.status).toBe(PropertyStatus.PUBLISHED);
      expect(mockPrisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: expect.objectContaining({ status: PropertyStatus.PUBLISHED }),
        }),
      );
    });

    it('should fail to publish if fewer than 5 images', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        ...validProperty,
        images: [{ id: '1', isCover: true }],
      });

      await expect(service.publish('host-1', 'prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should fail to publish if no cover photo is designated', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        ...validProperty,
        images: [
          { id: '1', isCover: false },
          { id: '2', isCover: false },
          { id: '3', isCover: false },
          { id: '4', isCover: false },
          { id: '5', isCover: false },
        ],
      });

      await expect(service.publish('host-1', 'prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should fail to publish if no amenities are selected', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        ...validProperty,
        amenities: [],
      });

      await expect(service.publish('host-1', 'prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('pause and unpause', () => {
    it('should pause a published property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        hostProfileId: 'host-1',
        status: PropertyStatus.PUBLISHED,
      });
      mockPrisma.property.update.mockResolvedValue({
        id: 'prop-1',
        status: PropertyStatus.PAUSED,
      });

      const result = await service.pause('host-1', 'prop-1');
      expect(result.status).toBe(PropertyStatus.PAUSED);
    });

    it('should reject pause on draft property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        hostProfileId: 'host-1',
        status: PropertyStatus.DRAFT,
      });

      await expect(service.pause('host-1', 'prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('should archive a property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        hostProfileId: 'host-1',
        status: PropertyStatus.PUBLISHED,
      });
      mockPrisma.property.update.mockResolvedValue({
        id: 'prop-1',
        status: PropertyStatus.ARCHIVED,
      });

      const result = await service.archive('host-1', 'prop-1');
      expect(result.status).toBe(PropertyStatus.ARCHIVED);
    });
  });
});
