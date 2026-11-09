export type PropertyType =
  | 'APARTMENT'
  | 'HOUSE'
  | 'VILLA'
  | 'CABIN'
  | 'HOTEL'
  | 'GUESTHOUSE'
  | 'HOMESTAY'
  | 'OTHER';

export type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';

export type HostStatus = 'ACTIVE' | 'SUSPENDED';

export interface HostProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  contactPhone?: string | null;
  status: HostStatus;
  termsAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostOnboardingInput {
  displayName: string;
  bio?: string;
  contactPhone?: string;
  termsAccepted: boolean;
}

export interface UpdateHostProfileInput {
  displayName?: string;
  bio?: string;
  contactPhone?: string;
}

export interface HostDashboardStats {
  totalProperties: number;
  publishedCount: number;
  draftCount: number;
  pausedCount: number;
  archivedCount: number;
  totalBookings: number;
  totalEarningsPaise: number;
  recentProperties: Array<{
    id: string;
    slug: string;
    title: string;
    propertyType: PropertyType;
    status: PropertyStatus;
    city: string;
    state: string;
    pricePerNightPaise: number;
    cleaningFeePaise: number;
    coverImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface Amenity {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedAmenities {
  amenities: Amenity[];
  grouped: Record<string, Amenity[]>;
  categories: string[];
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  publicId: string;
  secureUrl: string;
  altText?: string | null;
  width: number;
  height: number;
  format: string;
  bytes: number;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface PropertyAmenity {
  propertyId: string;
  amenityId: string;
  amenity?: Amenity;
}

export interface HostProperty {
  id: string;
  hostProfileId: string;
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  status: PropertyStatus;

  // Location
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;

  // Capacity
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;

  // Pricing
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  currency: string;

  // Rules & Times
  houseRules: string[];
  checkInFrom?: string | null;
  checkOutUntil?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  images: PropertyImage[];
  amenities: PropertyAmenity[];
  _count?: {
    images: number;
    amenities: number;
  };
}

export interface CreatePropertyInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNightPaise: number;
  cleaningFeePaise?: number;
  houseRules?: string[];
  checkInFrom?: string;
  checkOutUntil?: string;
  amenityIds?: string[];
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export interface PaginatedHostProperties {
  data: HostProperty[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
