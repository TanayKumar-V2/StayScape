export type BookingStatus =
  | 'HOLD'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface UnavailableRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
}

export interface PropertyAvailabilityResponse {
  propertySlug: string;
  startDate: string;
  endDate: string;
  unavailableRanges: UnavailableRange[];
}

export interface PriceBreakdown {
  nights: number;
  pricePerNightPaise: number;
  pricePerNightFormatted: string;
  nightlySubtotalPaise: number;
  nightlySubtotalFormatted: string;
  cleaningFeePaise: number;
  cleaningFeeFormatted: string;
  totalAmountPaise: number;
  totalAmountFormatted: string;
  currency: string;
}

export interface AvailabilityCheckInput {
  checkIn: string;
  checkOut: string;
  guestCount: number;
}

export interface AvailabilityCheckResponse {
  available: boolean;
  reason?: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nights: number;
  pricing: PriceBreakdown;
}

export interface CreateBookingHoldInput {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
}

export interface SerializedBookingResponse {
  id: string;
  bookingReference: string;
  userId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  propertyTitleSnapshot: string;
  propertySlugSnapshot: string;
  propertyCitySnapshot: string;
  propertyCoverImageSnapshot: string | null;
  pricePerNightPaise: number;
  pricePerNightFormatted: string;
  cleaningFeePaise: number;
  cleaningFeeFormatted: string;
  nightlySubtotalPaise: number;
  nightlySubtotalFormatted: string;
  totalAmountPaise: number;
  totalAmountFormatted: string;
  currency: string;
  status: BookingStatus;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  completedAt?: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
}

export interface PaginatedBookings {
  items: SerializedBookingResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
