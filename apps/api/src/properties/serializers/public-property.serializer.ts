import { Decimal } from '@prisma/client/runtime/library';

export interface PublicPropertyImage {
  id: string;
  secureUrl: string;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface PublicAmenity {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string | null;
}

export interface PublicHostInfo {
  displayName: string;
  bio: string | null;
}

export interface ApproximateCoordinates {
  latitude: number;
  longitude: number;
}

export interface PublicPropertySummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: string;
  city: string;
  state: string;
  country: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  currency: string;
  approximateCoordinates: ApproximateCoordinates | null;
  images: PublicPropertyImage[];
  amenities: PublicAmenity[];
  host: PublicHostInfo;
  publishedAt: Date | null;
  averageRating: number | null;
  reviewCount: number;
}

export interface PublicPropertyDetail extends PublicPropertySummary {
  houseRules: string[];
  checkInFrom: string | null;
  checkOutUntil: string | null;
  createdAt: Date;
}

export interface RawPropertyRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: string;
  city: string;
  state: string;
  country: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  currency: string;
  latitude: Decimal | number | null;
  longitude: Decimal | number | null;
  houseRules: string[];
  checkInFrom: string | null;
  checkOutUntil: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  images?: Array<{
    id: string;
    secureUrl: string;
    altText: string | null;
    sortOrder: number;
    isCover: boolean;
  }>;
  amenities?: Array<{
    amenity: {
      id: string;
      name: string;
      slug: string;
      category: string;
      icon: string | null;
    };
  }>;
  hostProfile?: {
    displayName: string;
    bio: string | null;
  } | null;
}

/**
 * Rounds exact latitude and longitude to 2 decimal places (~1.1 km precision)
 * to protect host privacy and prevent revealing exact street addresses publicly.
 */
export function getApproximateCoordinates(
  lat: Decimal | number | null | undefined,
  lng: Decimal | number | null | undefined,
): ApproximateCoordinates | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  const numLat = typeof lat === 'number' ? lat : Number(lat);
  const numLng = typeof lng === 'number' ? lng : Number(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return null;
  }

  return {
    latitude: Number(numLat.toFixed(2)),
    longitude: Number(numLng.toFixed(2)),
  };
}

export function serializePublicPropertySummary(
  prop: RawPropertyRecord,
  ratingStats?: { averageRating: number | null; reviewCount: number },
): PublicPropertySummary {
  const avg = ratingStats !== undefined
    ? ratingStats.averageRating
    : ((prop as unknown as { averageRating?: number | null }).averageRating ?? null);
  const count = ratingStats !== undefined
    ? ratingStats.reviewCount
    : ((prop as unknown as { reviewCount?: number }).reviewCount ?? 0);

  return {
    id: prop.id,
    slug: prop.slug,
    title: prop.title,
    description: prop.description,
    propertyType: prop.propertyType,
    city: prop.city,
    state: prop.state,
    country: prop.country,
    maxGuests: prop.maxGuests,
    bedrooms: prop.bedrooms,
    beds: prop.beds,
    bathrooms: prop.bathrooms,
    pricePerNightPaise: prop.pricePerNightPaise,
    cleaningFeePaise: prop.cleaningFeePaise ?? 0,
    currency: prop.currency ?? 'INR',
    approximateCoordinates: getApproximateCoordinates(prop.latitude, prop.longitude),
    images: (prop.images ?? []).map((img) => ({
      id: img.id,
      secureUrl: img.secureUrl,
      altText: img.altText,
      sortOrder: img.sortOrder,
      isCover: img.isCover,
    })),
    amenities: (prop.amenities ?? []).map((pa) => ({
      id: pa.amenity.id,
      name: pa.amenity.name,
      slug: pa.amenity.slug,
      category: pa.amenity.category,
      icon: pa.amenity.icon,
    })),
    host: {
      displayName: prop.hostProfile?.displayName ?? 'Verified Host',
      bio: prop.hostProfile?.bio ?? null,
    },
    publishedAt: prop.publishedAt,
    averageRating: count > 0 && avg !== null ? Number(avg.toFixed(1)) : null,
    reviewCount: count,
  };
}

export function serializePublicPropertyDetail(
  prop: RawPropertyRecord,
  ratingStats?: { averageRating: number | null; reviewCount: number },
): PublicPropertyDetail {
  const summary = serializePublicPropertySummary(prop, ratingStats);
  return {
    ...summary,
    houseRules: prop.houseRules ?? [],
    checkInFrom: prop.checkInFrom ?? null,
    checkOutUntil: prop.checkOutUntil ?? null,
    createdAt: prop.createdAt,
  };
}
