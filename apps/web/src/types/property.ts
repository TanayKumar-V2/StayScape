export type PropertyCategory =
  | 'Beachfront'
  | 'Mountains'
  | 'Cabins'
  | 'Amazing views'
  | 'Luxury stays'
  | 'Countryside'
  | 'Design stays'
  | 'City escapes';

export type PropertyType =
  | 'Villa'
  | 'Cabin'
  | 'Apartment'
  | 'Heritage House'
  | 'Glasshouse'
  | 'Cottage'
  | 'Estate'
  | 'Retreat';

export interface HostInfo {
  name: string;
  avatar: string;
  status: string;
  joinedDate: string;
  responseTime: string;
  bio: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  location: string;
  destination: string;
  country: string;
  description: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  propertyType: PropertyType;
  category: PropertyCategory;
  images: string[];
  amenities: string[];
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  featured: boolean;
  host: HostInfo;
  reviews: Review[];
}

export interface SearchFilters {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  category?: PropertyCategory | 'All';
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  amenities?: string[];
  minRating?: number;
  sortBy?: 'recommended' | 'price-asc' | 'price-desc' | 'rating-desc';
}

// -------------------------------------------------------------
// Phase 5: Real Database-Backed Public Discovery Types
// -------------------------------------------------------------

export interface PublicPropertySummary {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  city: string;
  state: string;
  country: string;
  pricePerNightPaise: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  featured: boolean;
  latitude: number | null;
  longitude: number | null;
  coverImage: {
    id: string;
    url: string;
    caption: string | null;
  } | null;
  amenities: {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
  }[];
  publishedAt: string | null;
  averageRating?: number | null;
  reviewCount?: number;
}

export interface PublicPropertyDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: string;
  city: string;
  state: string;
  country: string;
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  serviceFeePaise: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string | null;
  cancellationPolicy: string;
  latitude: number | null;
  longitude: number | null;
  images: {
    id: string;
    url: string;
    caption: string | null;
    isCover: boolean;
    order: number;
  }[];
  amenities: {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    category: string;
  }[];
  host: {
    id: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isSuperhost: boolean;
    identityVerified: boolean;
    responseTimeMinutes: number | null;
    languages: string[];
    createdAt: string;
  };
  publishedAt: string | null;
  averageRating?: number | null;
  reviewCount?: number;
}

export interface DestinationSummary {
  city: string;
  state: string;
  country: string;
  listingCount: number;
  minPricePaise: number;
  imageUrl: string | null;
}

export interface PublicSearchMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PublicSearchResponse {
  items: PublicPropertySummary[];
  data?: PublicPropertySummary[];
  meta: PublicSearchMeta;
}

export interface SearchPropertiesQuery {
  q?: string;
  destination?: string;
  propertyTypes?: string[];
  minPricePaise?: number;
  maxPricePaise?: number;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  city?: string;
  state?: string;
  country?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

/** Formats an UPPERCASE_ENUM property type into a human-friendly string (e.g. FARM_STAY -> Farm Stay) */
export function formatPropertyType(type: string): string {
  if (!type) return 'Stay';
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Converts integer paise to integer Indian Rupees */
export function paiseToRupees(paise: number): number {
  return Math.round(paise / 100);
}
