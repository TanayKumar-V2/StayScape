import { PropertyType } from '@prisma/client';
import { PropertyRankingService } from './property-ranking.service';
import { ExtractedPreferencesDto } from '../dto/staymatch-search.dto';
import { RawPropertyRecord } from '../../properties/serializers/public-property.serializer';

describe('PropertyRankingService', () => {
  let service: PropertyRankingService;

  beforeEach(() => {
    service = new PropertyRankingService();
  });

  const mockPropertyA: RawPropertyRecord = {
    id: 'prop-1',
    slug: 'manali-wooden-cabin',
    title: 'The Alpine Cedar Cabin',
    description: 'Cozy wooden cabin in the mountains of Manali with wood stove and serene views.',
    propertyType: PropertyType.CABIN,
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    latitude: null,
    longitude: null,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    pricePerNightPaise: 500000, // ₹5,000
    cleaningFeePaise: 50000,
    currency: 'INR',
    houseRules: ['No smoking'],
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    publishedAt: new Date(),
    createdAt: new Date(),
    hostProfile: { displayName: 'Rajesh Sharma', bio: null },
    images: [
      {
        id: 'img-1',
        isCover: true,
        secureUrl: 'https://img.com/1.jpg',
        altText: null,
        sortOrder: 0,
      },
    ],
    amenities: [
      { amenity: { id: 'a1', name: 'Fast Wi-Fi', slug: 'wifi', category: 'General', icon: null } },
      {
        amenity: {
          id: 'a2',
          name: 'Scenic mountain view',
          slug: 'mountain-view',
          category: 'Outdoor',
          icon: null,
        },
      },
      { amenity: { id: 'a3', name: 'Heating', slug: 'heating', category: 'General', icon: null } },
    ],
  };

  const mockPropertyB: RawPropertyRecord = {
    id: 'prop-2',
    slug: 'goa-beach-villa',
    title: 'Sol De Goa Beachfront Villa',
    description: 'Spacious luxury villa right next to the beach with private swimming pool.',
    propertyType: PropertyType.VILLA,
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    latitude: null,
    longitude: null,
    maxGuests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 4,
    pricePerNightPaise: 1800000, // ₹18,000
    cleaningFeePaise: 150000,
    currency: 'INR',
    houseRules: ['Quiet hours after 11 PM'],
    checkInFrom: '15:00',
    checkOutUntil: '11:00',
    publishedAt: new Date(),
    createdAt: new Date(),
    hostProfile: { displayName: 'Maria Fernandes', bio: null },
    images: [
      {
        id: 'img-2',
        isCover: true,
        secureUrl: 'https://img.com/2.jpg',
        altText: null,
        sortOrder: 0,
      },
    ],
    amenities: [
      { amenity: { id: 'a1', name: 'Fast Wi-Fi', slug: 'wifi', category: 'General', icon: null } },
      {
        amenity: {
          id: 'a4',
          name: 'Private swimming pool',
          slug: 'pool',
          category: 'Outdoor',
          icon: null,
        },
      },
      {
        amenity: {
          id: 'a5',
          name: 'Direct beach access',
          slug: 'beach-access',
          category: 'Outdoor',
          icon: null,
        },
      },
    ],
  };

  it('should rank destination, propertyType, budget, and amenity matches higher', () => {
    const preferences: ExtractedPreferencesDto = {
      destination: 'Manali',
      propertyTypes: [PropertyType.CABIN],
      budget: { minPaise: null, maxPaise: 600000, scope: 'PER_NIGHT' },
      guests: { adults: 2, children: 0, total: 2 },
      requiredAmenities: ['wifi'],
      preferredAmenities: ['mountain-view'],
      stylePreferences: ['cozy', 'wooden'],
      unresolvedPreferences: [],
      intentStatus: 'READY',
      clarificationQuestion: null,
      summary: 'Cabin in Manali under 6000 for 2',
    };

    const results = service.rankProperties(
      [mockPropertyA, mockPropertyB],
      preferences,
      'cozy cabin in Manali for 2',
    );

    expect(results).toHaveLength(2);
    // Property A should rank 1st with high match score
    expect(results[0].slug).toBe('manali-wooden-cabin');
    expect(results[0].matchScore).toBeGreaterThan(80);
    expect(results[0].matchReasons.length).toBeGreaterThan(0);
    expect(results[0].matchReasons.some((r) => r.includes('Manali'))).toBe(true);

    // Property B should rank 2nd with significantly lower score and clear trade-offs
    expect(results[1].slug).toBe('goa-beach-villa');
    expect(results[1].matchScore).toBeLessThan(results[0].matchScore);
    expect(results[1].tradeOffs.length).toBeGreaterThan(0);
  });

  it('should penalize properties missing required amenities', () => {
    const preferences: ExtractedPreferencesDto = {
      destination: 'Manali',
      propertyTypes: [],
      budget: null,
      guests: { adults: 2, total: 2 },
      requiredAmenities: ['pool'], // MockPropertyA does not have a pool
      preferredAmenities: [],
      stylePreferences: [],
      unresolvedPreferences: [],
      intentStatus: 'READY',
      summary: 'Stay with pool in Manali',
    };

    const results = service.rankProperties([mockPropertyA], preferences, 'stay with pool');
    expect(results[0].tradeOffs.some((t) => t.includes('pool'))).toBe(true);
  });
});
