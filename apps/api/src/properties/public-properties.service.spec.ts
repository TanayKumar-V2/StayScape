import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertyStatus, PropertyType, PropertyModerationStatus, HostStatus } from '@prisma/client';
import { PublicPropertiesService } from './public-properties.service';

describe('PublicPropertiesService', () => {
  let service: PublicPropertiesService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      getClient: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(2),
      }),
    };

    service = new PublicPropertiesService(mockPrisma, mockRedis);
  });

  describe('search', () => {
    it('should reject when minPricePaise is greater than maxPricePaise', async () => {
      await expect(
        service.search({
          minPricePaise: 500000,
          maxPricePaise: 200000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when incomplete map bounding box is supplied', async () => {
      await expect(
        service.search({
          minLat: 31.0,
          maxLat: 32.0,
          // missing minLng, maxLng
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid propertyType', async () => {
      await expect(
        service.search({
          propertyTypes: 'INVALID_TYPE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query only PUBLISHED properties and round coordinates to 2 decimal places', async () => {
      mockPrisma.property.count.mockResolvedValue(1);
      mockPrisma.property.findMany.mockResolvedValue([
        {
          id: 'prop-1',
          slug: 'serene-cedar-cabin',
          title: 'Serene Cedar Cabin',
          description: 'A cozy mountain getaway overlooking the valley.',
          propertyType: PropertyType.CABIN,
          city: 'Manali',
          state: 'Himachal Pradesh',
          country: 'India',
          latitude: 32.2396123,
          longitude: 77.1887456,
          maxGuests: 4,
          bedrooms: 2,
          beds: 2,
          bathrooms: 2,
          pricePerNightPaise: 450000,
          cleaningFeePaise: 50000,
          currency: 'INR',
          publishedAt: new Date('2026-01-01'),
          images: [
            {
              id: 'img-1',
              secureUrl: 'https://img.test/cover.jpg',
              altText: 'Cover',
              sortOrder: 0,
              isCover: true,
            },
          ],
          amenities: [
            {
              amenity: {
                id: 'am-1',
                name: 'High-speed Wi-Fi',
                slug: 'wifi',
                category: 'General',
                icon: 'wifi',
              },
            },
          ],
          hostProfile: {
            displayName: 'Aarav Sharma',
            bio: 'Local mountain host',
          },
        },
      ]);

      const result = await service.search({
        destination: 'Manali',
        sort: 'newest',
      });

      expect(result.data).toHaveLength(1);
      const item = result.data[0]!;
      expect(item.slug).toBe('serene-cedar-cabin');
      // Approximate coordinates check: rounded to 2 decimal places
      expect(item.approximateCoordinates).toEqual({
        latitude: 32.24,
        longitude: 77.19,
      });
      // Verification: exact address and private fields MUST NOT be present in public response
      expect((item as any).addressLine1).toBeUndefined();
      expect((item as any).addressLine2).toBeUndefined();
      expect((item as any).postalCode).toBeUndefined();
      expect((item as any).host.contactPhone).toBeUndefined();

      // Ensure Prisma where condition strictly enforced status: 'PUBLISHED'
      expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ status: PropertyStatus.PUBLISHED }),
            ]),
          }),
        }),
      );
    });

    it('should return cached result when cache hit occurs', async () => {
      const cachedResponse = {
        data: [{ id: 'cached-prop', title: 'Cached Property' }],
        meta: {
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'cache:properties:version') return Promise.resolve('1');
        return Promise.resolve(JSON.stringify(cachedResponse));
      });

      const result = await service.search({ q: 'retreat' });
      expect(result).toEqual(cachedResponse);
      expect(mockPrisma.property.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getBySlug', () => {
    it('should return published property details by slug', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        slug: 'goa-villa',
        title: 'Casa Verde Goa',
        description: 'Heritage villa close to Anjuna beach.',
        propertyType: PropertyType.VILLA,
        status: PropertyStatus.PUBLISHED,
        city: 'Anjuna',
        state: 'Goa',
        country: 'India',
        latitude: 15.584,
        longitude: 73.743,
        maxGuests: 6,
        bedrooms: 3,
        beds: 4,
        bathrooms: 3,
        pricePerNightPaise: 1200000,
        cleaningFeePaise: 100000,
        currency: 'INR',
        houseRules: ['No loud music after 10 PM'],
        checkInFrom: '14:00',
        checkOutUntil: '11:00',
        publishedAt: new Date(),
        createdAt: new Date(),
        moderationStatus: PropertyModerationStatus.APPROVED,
        images: [],
        amenities: [],
        hostProfile: { displayName: 'Maria Dsouza', bio: null, status: HostStatus.ACTIVE },
      });

      const result = await service.getBySlug('goa-villa');
      expect(result.title).toBe('Casa Verde Goa');
      expect(result.approximateCoordinates).toEqual({
        latitude: 15.58,
        longitude: 73.74,
      });
    });

    it('should throw NotFoundException if property does not exist or is DRAFT', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-draft',
        slug: 'draft-cabin',
        status: PropertyStatus.DRAFT, // Not published!
      });

      await expect(service.getBySlug('draft-cabin')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDestinations', () => {
    it('should aggregate published properties by city and return sorted destinations', async () => {
      mockPrisma.property.findMany.mockResolvedValue([
        {
          city: 'Manali',
          state: 'Himachal Pradesh',
          country: 'India',
          publishedAt: new Date(),
          images: [{ secureUrl: 'https://img.test/manali.jpg' }],
        },
        {
          city: 'Manali',
          state: 'Himachal Pradesh',
          country: 'India',
          publishedAt: new Date(),
          images: [{ secureUrl: 'https://img.test/manali2.jpg' }],
        },
        {
          city: 'Goa',
          state: 'Goa',
          country: 'India',
          publishedAt: new Date(),
          images: [{ secureUrl: 'https://img.test/goa.jpg' }],
        },
      ]);

      const result = await service.getDestinations(5);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.city).toBe('Manali');
      expect(result.data[0]?.propertyCount).toBe(2);
      expect(result.data[0]?.coverImage).toBe('https://img.test/manali.jpg');
      expect(result.data[1]?.city).toBe('Goa');
      expect(result.data[1]?.propertyCount).toBe(1);
    });
  });
});
