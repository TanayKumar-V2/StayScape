export interface WishlistProperty {
  id: string;
  title: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  propertyType: string;
  coverImageUrl: string | null;
  pricePerNightPaise: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface WishlistItem {
  id: string;
  propertyId: string;
  savedAt: string;
  property: WishlistProperty;
}

export interface WishlistResponse {
  data: WishlistItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
