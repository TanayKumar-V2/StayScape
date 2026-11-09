import { AmenitiesService } from './amenities.service';

describe('AmenitiesService', () => {
  let amenitiesService: AmenitiesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      amenity: {
        findMany: jest.fn(),
      },
    };
    amenitiesService = new AmenitiesService(mockPrisma);
  });

  it('should return amenities catalogue grouped by category', async () => {
    mockPrisma.amenity.findMany.mockResolvedValue([
      { id: '1', name: 'High-speed Wi-Fi', slug: 'wifi', category: 'General', icon: 'wifi' },
      { id: '2', name: 'Air conditioning', slug: 'ac', category: 'General', icon: 'wind' },
      { id: '3', name: 'Infinity pool', slug: 'pool', category: 'Outdoor', icon: 'waves' },
    ]);

    const result = await amenitiesService.findAll();

    expect(result.amenities).toHaveLength(3);
    expect(result.categories).toEqual(['General', 'Outdoor']);
    expect(result.grouped['General']).toHaveLength(2);
    expect(result.grouped['Outdoor']).toHaveLength(1);
  });
});
