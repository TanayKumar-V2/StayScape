import { API_BASE_URL } from './api-config';
import { formatINR } from './utils';
import type { LoginInput, RegisterInput, UpdateProfileInput, User } from '@/types/auth';
import type {
  GroupedAmenities,
  HostDashboardStats,
  HostOnboardingInput,
  HostProfile,
  HostProperty,
  PaginatedHostProperties,
  PropertyImage,
  CreatePropertyInput,
  UpdateHostProfileInput,
  UpdatePropertyInput,
} from '@/types/host';
import type {
  DestinationSummary,
  PublicPropertyDetail,
  PublicPropertySummary,
  PublicSearchMeta,
  PublicSearchResponse,
  SearchPropertiesQuery,
} from '@/types/property';
import type {
  AvailabilityCheckInput,
  AvailabilityCheckResponse,
  BookingQuery,
  CreateBookingHoldInput,
  PaginatedBookings,
  PropertyAvailabilityResponse,
  SerializedBookingResponse,
} from '@/types/booking';
import type {
  CreatePaymentOrderResponse,
  VerifyPaymentPayload,
  ReconcilePaymentResponse,
  PaymentStatusSummary,
} from '@/types/payment';
import type {
  ComparePropertiesPayload,
  GenerateItineraryPayload,
  ItineraryResponse,
  PropertyAnswerResponse,
  PropertyComparisonResponse,
  PropertyQuestionPayload,
  StayMatchResponse,
  StayMatchSearchPayload,
} from '@/types/ai';
import type {
  AiReviewSummaryResponse,
  CreateReviewInput,
  PaginatedReviewsResponse,
  ReviewEligibilityResponse,
  ReviewItem,
  ReviewSummaryData,
  UpdateReviewInput,
} from '@/types/reviews';
import type { WishlistResponse } from '@/types/wishlist';
import type {
  ConversationSummary,
  CreateConversationInput,
  PaginatedMessagesResponse,
  SendMessageInput,
  MessageItem,
} from '@/types/messages';
import type {
  AdminDashboardOverview,
  AdminTimeseriesData,
  AdminPaginationMeta,
  AdminUserItem,
  AdminUserDetails,
  AdminHostItem,
  AdminHostDetails,
  AdminPropertyItem,
  AdminPropertyDetails,
  AdminReviewItem,
  AdminReportItem,
  AdminBookingItem,
  AdminBookingDetails,
  AdminPaymentItem,
  AdminRefundItem,
  AdminAiUsageStats,
  AdminAuditLogItem,
} from '@/types/admin';

/**
 * Single-flight token refresh promise.
 * Ensures simultaneous unauthorized requests coalesce into one /auth/refresh call.
 */
let inFlightRefreshPromise: Promise<boolean> | null = null;

async function executeRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    inFlightRefreshPromise = null;
  }
}

export interface ApiResponse<T> {
  data: T | null;
  error?: string;
  status: number;
}

interface BookingApiRecord extends Partial<SerializedBookingResponse> {
  property?: { title?: string; slug?: string; city?: string; coverImage?: string | null };
  stay?: { checkIn?: string; checkOut?: string; nights?: number; guestCount?: number };
  priceBreakdown?: {
    pricePerNightPaise?: number;
    nightlySubtotalPaise?: number;
    cleaningFeePaise?: number;
    totalAmountPaise?: number;
    currency?: string;
  };
}

function normalizeBooking(raw: BookingApiRecord): SerializedBookingResponse {
  const property = raw.property;
  const stay = raw.stay;
  const prices = raw.priceBreakdown;
  const pricePerNightPaise = raw.pricePerNightPaise ?? prices?.pricePerNightPaise ?? 0;
  const nightlySubtotalPaise = raw.nightlySubtotalPaise ?? prices?.nightlySubtotalPaise ?? 0;
  const cleaningFeePaise = raw.cleaningFeePaise ?? prices?.cleaningFeePaise ?? 0;
  const totalAmountPaise = raw.totalAmountPaise ?? prices?.totalAmountPaise ?? 0;
  const currency = raw.currency ?? prices?.currency ?? 'INR';
  const bookingReference = raw.bookingReference ?? '';
  const createdAt = raw.createdAt ?? '';

  return {
    ...raw,
    id: raw.id ?? bookingReference,
    userId: raw.userId ?? '',
    propertyId: raw.propertyId ?? '',
    bookingReference,
    propertyTitleSnapshot: raw.propertyTitleSnapshot ?? property?.title ?? '',
    propertySlugSnapshot: raw.propertySlugSnapshot ?? property?.slug ?? '',
    propertyCitySnapshot: raw.propertyCitySnapshot ?? property?.city ?? '',
    propertyCoverImageSnapshot: raw.propertyCoverImageSnapshot ?? property?.coverImage ?? null,
    checkIn: raw.checkIn ?? stay?.checkIn ?? '',
    checkOut: raw.checkOut ?? stay?.checkOut ?? '',
    nights: raw.nights ?? stay?.nights ?? 0,
    guestCount: raw.guestCount ?? stay?.guestCount ?? 1,
    pricePerNightPaise,
    pricePerNightFormatted: raw.pricePerNightFormatted ?? formatINR(pricePerNightPaise / 100),
    nightlySubtotalPaise,
    nightlySubtotalFormatted: raw.nightlySubtotalFormatted ?? formatINR(nightlySubtotalPaise / 100),
    cleaningFeePaise,
    cleaningFeeFormatted: raw.cleaningFeeFormatted ?? formatINR(cleaningFeePaise / 100),
    totalAmountPaise,
    totalAmountFormatted: raw.totalAmountFormatted ?? formatINR(totalAmountPaise / 100),
    currency,
    status: raw.status ?? 'HOLD',
    holdExpiresAt: raw.holdExpiresAt ?? null,
    confirmedAt: raw.confirmedAt ?? null,
    completedAt: raw.completedAt ?? null,
    cancelledAt: raw.cancelledAt ?? null,
    expiredAt: raw.expiredAt ?? null,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
  };
}

function normalizeBookingResponse<T>(
  response: ApiResponse<T>,
): ApiResponse<SerializedBookingResponse> {
  return {
    ...response,
    data: response.data ? normalizeBooking(response.data as BookingApiRecord) : null,
  };
}

/**
 * Centralised fetch wrapper that automatically:
 * - sends credentials: 'include' for secure HTTP-only cookies
 * - manages single-flight token rotation when receiving a 401 Unauthorized
 * - retries the original request seamlessly upon successful token refresh
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  isRetry = false,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const defaultHeaders: Record<string, string> = isFormData
      ? {}
      : { 'Content-Type': 'application/json' };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
      credentials: 'include',
    });

    // Check for 401 Unauthorized, excluding login/register/refresh/logout routes
    const isAuthRoute =
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/logout');

    if (response.status === 401 && !isAuthRoute && !isRetry) {
      if (!inFlightRefreshPromise) {
        inFlightRefreshPromise = executeRefresh();
      }

      const refreshed = await inFlightRefreshPromise;
      if (refreshed) {
        // Retry original request once
        return apiFetch<T>(path, options, true);
      }
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson.message === 'string') {
          errorMessage = errorJson.message;
        } else if (errorJson && Array.isArray(errorJson.message)) {
          errorMessage = errorJson.message.join(', ');
        }
      } catch {
        // Fallback to generic status text
        errorMessage = response.statusText || errorMessage;
      }

      return {
        data: null,
        error: errorMessage,
        status: response.status,
      };
    }

    // Parse JSON if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = (await response.json()) as T;
      return { data, status: response.status };
    }

    return { data: null, status: response.status };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error or service unreachable';
    return {
      data: null,
      error: errorMsg,
      status: 0,
    };
  }
}

// ── Authentication API methods ──────────────────────────────────────────────

export const authApi = {
  register: async (input: RegisterInput): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login: async (input: LoginInput): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  refresh: async (): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/auth/refresh', {
      method: 'POST',
    });
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  logoutAll: async (): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<{ message: string }>('/auth/logout-all', {
      method: 'POST',
    });
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/auth/me', {
      method: 'GET',
    });
  },
};

export const usersApi = {
  updateMe: async (input: UpdateProfileInput): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

// ── Host API methods ────────────────────────────────────────────────────────

export const hostApi = {
  onboard: async (input: HostOnboardingInput): Promise<ApiResponse<HostProfile>> => {
    return apiFetch<HostProfile>('/host/onboarding', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getProfile: async (): Promise<ApiResponse<HostProfile>> => {
    return apiFetch<HostProfile>('/host/profile', {
      method: 'GET',
    });
  },

  updateProfile: async (input: UpdateHostProfileInput): Promise<ApiResponse<HostProfile>> => {
    return apiFetch<HostProfile>('/host/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  getDashboard: async (): Promise<ApiResponse<HostDashboardStats>> => {
    return apiFetch<HostDashboardStats>('/host/dashboard', {
      method: 'GET',
    });
  },
};

// ── Amenities API methods ───────────────────────────────────────────────────

export const amenitiesApi = {
  getAll: async (): Promise<ApiResponse<GroupedAmenities>> => {
    return apiFetch<GroupedAmenities>('/amenities', {
      method: 'GET',
    });
  },
};

// ── Properties API methods ──────────────────────────────────────────────────

export const propertiesApi = {
  create: async (input: CreatePropertyInput): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>('/host/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  list: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<PaginatedHostProperties>> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    const endpoint = query ? `/host/properties?${query}` : '/host/properties';
    return apiFetch<PaginatedHostProperties>(endpoint, { method: 'GET' });
  },

  getById: async (id: string): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}`, {
      method: 'GET',
    });
  },

  update: async (id: string, input: UpdatePropertyInput): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  publish: async (id: string): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}/publish`, {
      method: 'POST',
    });
  },

  pause: async (id: string): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}/pause`, {
      method: 'POST',
    });
  },

  unpause: async (id: string): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}/unpause`, {
      method: 'POST',
    });
  },

  archive: async (id: string): Promise<ApiResponse<HostProperty>> => {
    return apiFetch<HostProperty>(`/host/properties/${id}/archive`, {
      method: 'POST',
    });
  },

  uploadImages: async (
    propertyId: string,
    files: File[],
  ): Promise<ApiResponse<PropertyImage[]>> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    return apiFetch<PropertyImage[]>(`/host/properties/${propertyId}/images`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteImage: async (propertyId: string, imageId: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`/host/properties/${propertyId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  reorderImages: async (
    propertyId: string,
    imageIds: string[],
  ): Promise<ApiResponse<PropertyImage[]>> => {
    return apiFetch<PropertyImage[]>(`/host/properties/${propertyId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ imageIds }),
    });
  },

  setCoverImage: async (
    propertyId: string,
    imageId: string,
  ): Promise<ApiResponse<PropertyImage>> => {
    return apiFetch<PropertyImage>(`/host/properties/${propertyId}/images/${imageId}/cover`, {
      method: 'PATCH',
    });
  },
};

/**
 * Public Properties API — Phase 5: Property Discovery & Intelligent Search
 */
interface RawSearchPayload {
  data?: PublicPropertySummary[];
  items?: PublicPropertySummary[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

interface RawDestinationItem {
  city: string;
  state: string;
  country: string;
  listingCount?: number;
  propertyCount?: number;
  minPricePaise?: number;
  imageUrl?: string | null;
  coverImage?: string | null;
}

interface RawDestinationsPayload {
  data?: RawDestinationItem[];
}

/**
 * Public property endpoints.
 * Reads published listings without requiring authentication.
 */
export const publicPropertiesApi = {
  /**
   * Search published properties with multi-criteria filtering, geolocation bounds, and pagination.
   */
  search: async (query?: SearchPropertiesQuery): Promise<ApiResponse<PublicSearchResponse>> => {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.destination) params.set('destination', query.destination);
    if (query?.propertyTypes && query.propertyTypes.length > 0) {
      // The API accepts a single comma-separated string for this filter.
      params.set('propertyTypes', query.propertyTypes.join(','));
    }
    if (query?.minPricePaise !== undefined) {
      params.set('minPricePaise', query.minPricePaise.toString());
    }
    if (query?.maxPricePaise !== undefined) {
      params.set('maxPricePaise', query.maxPricePaise.toString());
    }
    if (query?.guests !== undefined && query.guests > 0) {
      params.set('guests', query.guests.toString());
    }
    if (query?.bedrooms !== undefined && query.bedrooms > 0) {
      params.set('bedrooms', query.bedrooms.toString());
    }
    if (query?.bathrooms !== undefined && query.bathrooms > 0) {
      params.set('bathrooms', query.bathrooms.toString());
    }
    if (query?.amenities && query.amenities.length > 0) {
      params.set('amenities', query.amenities.join(','));
    }
    if (query?.city) params.set('city', query.city);
    if (query?.state) params.set('state', query.state);
    if (query?.country) params.set('country', query.country);
    if (query?.minLat !== undefined) params.set('minLat', query.minLat.toString());
    if (query?.maxLat !== undefined) params.set('maxLat', query.maxLat.toString());
    if (query?.minLng !== undefined) params.set('minLng', query.minLng.toString());
    if (query?.maxLng !== undefined) params.set('maxLng', query.maxLng.toString());
    if (query?.sort) params.set('sort', query.sort);
    if (query?.page !== undefined) params.set('page', query.page.toString());
    if (query?.limit !== undefined) params.set('limit', query.limit.toString());

    const qs = params.toString();
    const res = await apiFetch<RawSearchPayload>(`/properties${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });

    if (res.data) {
      // Backend returns { data: PublicPropertySummary[], meta: ... }
      const items: PublicPropertySummary[] = Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data.items)
          ? res.data.items
          : [];
      const rawMeta = res.data.meta;
      const meta: PublicSearchMeta = {
        total: rawMeta?.total ?? items.length,
        page: rawMeta?.page ?? 1,
        limit: rawMeta?.limit ?? items.length,
        totalPages: rawMeta?.totalPages ?? 1,
        hasNextPage: rawMeta?.hasNextPage ?? false,
        hasPrevPage: rawMeta?.hasPrevPage ?? rawMeta?.hasPreviousPage ?? false,
      };
      return {
        ...res,
        data: {
          items,
          data: items,
          meta,
        },
      };
    }

    return {
      ...res,
      data: null,
    };
  },

  /**
   * Fetch single published property detail by slug.
   */
  getBySlug: async (slug: string): Promise<ApiResponse<PublicPropertyDetail>> => {
    return apiFetch<PublicPropertyDetail>(`/properties/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
  },

  /**
   * Fetch aggregated popular destinations derived from database records.
   */
  getDestinations: async (limit = 6): Promise<ApiResponse<DestinationSummary[]>> => {
    const res = await apiFetch<RawDestinationsPayload | RawDestinationItem[]>(
      `/properties/destinations?limit=${limit}`,
      {
        method: 'GET',
      },
    );

    if (res.data) {
      // Backend returns { data: DestinationSummary[] }
      const rawList: RawDestinationItem[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as RawDestinationsPayload).data)
          ? ((res.data as RawDestinationsPayload).data ?? [])
          : [];

      const mapped: DestinationSummary[] = rawList.map((d: RawDestinationItem) => ({
        city: d.city,
        state: d.state,
        country: d.country,
        listingCount: d.listingCount ?? d.propertyCount ?? 1,
        minPricePaise: d.minPricePaise ?? 1500000,
        imageUrl: d.imageUrl ?? d.coverImage ?? null,
      }));

      return {
        ...res,
        data: mapped,
      };
    }

    return {
      ...res,
      data: [],
    };
  },
};

export const availabilityApi = {
  /**
   * Fetch unavailable calendar ranges for a property within an optional date window.
   */
  getCalendar: async (
    slug: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<PropertyAvailabilityResponse>> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return apiFetch<PropertyAvailabilityResponse>(
      `/properties/${encodeURIComponent(slug)}/availability${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
  },

  /**
   * Check real-time date and guest availability, returning exact server-side pricing quote.
   */
  check: async (
    slug: string,
    input: AvailabilityCheckInput,
  ): Promise<ApiResponse<AvailabilityCheckResponse>> => {
    return apiFetch<AvailabilityCheckResponse>(
      `/properties/${encodeURIComponent(slug)}/availability/check`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },
};

export const bookingsApi = {
  /**
   * Create a 10-minute temporary booking hold with server-side price calculation and row lock.
   */
  createHold: async (
    input: CreateBookingHoldInput,
  ): Promise<ApiResponse<SerializedBookingResponse>> => {
    const response = await apiFetch<SerializedBookingResponse>('/bookings/holds', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return normalizeBookingResponse(response);
  },

  /**
   * Get single booking details by booking reference (STY-XXXXXXXX).
   */
  getDetail: async (bookingReference: string): Promise<ApiResponse<SerializedBookingResponse>> => {
    const response = await apiFetch<SerializedBookingResponse>(
      `/bookings/${encodeURIComponent(bookingReference)}`,
      { method: 'GET' },
    );
    return normalizeBookingResponse(response);
  },

  /**
   * Cancel an active temporary booking hold.
   */
  cancelHold: async (bookingReference: string): Promise<ApiResponse<SerializedBookingResponse>> => {
    const response = await apiFetch<SerializedBookingResponse>(
      `/bookings/${encodeURIComponent(bookingReference)}/hold`,
      { method: 'DELETE' },
    );
    return normalizeBookingResponse(response);
  },

  /**
   * Retrieve paginated booking history for the authenticated user.
   */
  getMyBookings: async (query?: BookingQuery): Promise<ApiResponse<PaginatedBookings>> => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    if (query?.status) params.set('status', query.status);
    const qs = params.toString();
    const response = await apiFetch<PaginatedBookings>(`/bookings/me${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
    return {
      ...response,
      data: response.data
        ? { ...response.data, items: response.data.items.map(normalizeBooking) }
        : null,
    };
  },
};

export const paymentsApi = {
  /**
   * Generates or fetches an active Razorpay payment order for a booking hold.
   */
  createOrder: async (
    bookingReference: string,
  ): Promise<ApiResponse<CreatePaymentOrderResponse>> => {
    return apiFetch<CreatePaymentOrderResponse>(
      `/bookings/${encodeURIComponent(bookingReference)}/payments/order`,
      { method: 'POST' },
    );
  },

  /**
   * Verifies the cryptographic Razorpay signature and confirms booking reservation.
   */
  verifyPayment: async (
    payload: VerifyPaymentPayload,
  ): Promise<ApiResponse<ReconcilePaymentResponse>> => {
    return apiFetch<ReconcilePaymentResponse>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieves sanitized payment and transaction summary for a booking.
   */
  getPaymentStatus: async (
    bookingReference: string,
  ): Promise<ApiResponse<PaymentStatusSummary>> => {
    return apiFetch<PaymentStatusSummary>(
      `/bookings/${encodeURIComponent(bookingReference)}/payment-status`,
      { method: 'GET' },
    );
  },
};

export const aiApi = {
  /**
   * Natural language StayMatch search with structured preference extraction and ranking.
   */
  searchStayMatch: async (
    payload: StayMatchSearchPayload,
  ): Promise<ApiResponse<StayMatchResponse>> => {
    return apiFetch<StayMatchResponse>('/ai/staymatch/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Compare 2 to 3 properties side-by-side with matrix and AI comparative summary.
   */
  compareProperties: async (
    payload: ComparePropertiesPayload,
  ): Promise<ApiResponse<PropertyComparisonResponse>> => {
    return apiFetch<PropertyComparisonResponse>('/ai/staymatch/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Grounded question-answering assistant for verified listing facts.
   */
  askPropertyQuestion: async (
    slug: string,
    payload: PropertyQuestionPayload,
  ): Promise<ApiResponse<PropertyAnswerResponse>> => {
    return apiFetch<PropertyAnswerResponse>(`/ai/properties/${encodeURIComponent(slug)}/ask`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Generates tailored day-by-day travel itinerary suggestions for a stay.
   */
  generateItinerary: async (
    payload: GenerateItineraryPayload,
  ): Promise<ApiResponse<ItineraryResponse>> => {
    return apiFetch<ItineraryResponse>('/ai/itinerary/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches AI-generated grounded review summary for a property.
   */
  getReviewSummary: async (
    slug: string,
  ): Promise<ApiResponse<AiReviewSummaryResponse>> => {
    return apiFetch<AiReviewSummaryResponse>(`/ai/properties/${encodeURIComponent(slug)}/review-summary`);
  },
};

// ---------------------------------------------------------------------------
// Phase 9: Reviews API
// ---------------------------------------------------------------------------
export const reviewsApi = {
  checkEligibility: async (
    bookingReference: string,
  ): Promise<ApiResponse<ReviewEligibilityResponse>> => {
    return apiFetch<ReviewEligibilityResponse>(`/reviews/eligibility/${encodeURIComponent(bookingReference)}`);
  },

  createReview: async (
    input: CreateReviewInput,
  ): Promise<ApiResponse<ReviewItem>> => {
    return apiFetch<ReviewItem>('/reviews', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateReview: async (
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<ApiResponse<ReviewItem>> => {
    return apiFetch<ReviewItem>(`/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  hideReview: async (
    reviewId: string,
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiFetch<{ success: boolean }>(`/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
    });
  },

  submitHostResponse: async (
    reviewId: string,
    response: string,
  ): Promise<ApiResponse<ReviewItem>> => {
    return apiFetch<ReviewItem>(`/host/reviews/${encodeURIComponent(reviewId)}/response`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  },

  getPropertyReviews: async (
    slug: string,
    page = 1,
    limit = 10,
    sort: 'newest' | 'highest_rating' | 'lowest_rating' = 'newest',
  ): Promise<ApiResponse<PaginatedReviewsResponse>> => {
    return apiFetch<PaginatedReviewsResponse>(
      `/properties/${encodeURIComponent(slug)}/reviews?page=${page}&limit=${limit}&sort=${sort}`,
    );
  },

  getPropertyReviewSummary: async (
    slug: string,
  ): Promise<ApiResponse<ReviewSummaryData>> => {
    return apiFetch<ReviewSummaryData>(`/properties/${encodeURIComponent(slug)}/reviews/summary`);
  },
};

// ---------------------------------------------------------------------------
// Phase 9: Wishlist API
// ---------------------------------------------------------------------------
export const wishlistApi = {
  getWishlist: async (
    page = 1,
    limit = 12,
  ): Promise<ApiResponse<WishlistResponse>> => {
    return apiFetch<WishlistResponse>(`/wishlist?page=${page}&limit=${limit}`);
  },

  addToWishlist: async (
    propertyId: string,
  ): Promise<ApiResponse<{ isSaved: boolean; propertyId: string }>> => {
    return apiFetch<{ isSaved: boolean; propertyId: string }>(`/wishlist/${encodeURIComponent(propertyId)}`, {
      method: 'POST',
    });
  },

  removeFromWishlist: async (
    propertyId: string,
  ): Promise<ApiResponse<{ isSaved: boolean; propertyId: string }>> => {
    return apiFetch<{ isSaved: boolean; propertyId: string }>(`/wishlist/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE',
    });
  },

  getWishlistStatus: async (
    propertyId: string,
  ): Promise<ApiResponse<{ isSaved: boolean }>> => {
    return apiFetch<{ isSaved: boolean }>(`/wishlist/${encodeURIComponent(propertyId)}/status`);
  },
};

// ---------------------------------------------------------------------------
// Phase 9: Messages API
// ---------------------------------------------------------------------------
export const messagesApi = {
  createOrGetConversation: async (
    input: CreateConversationInput,
  ): Promise<ApiResponse<ConversationSummary>> => {
    return apiFetch<ConversationSummary>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getConversations: async (): Promise<ApiResponse<ConversationSummary[]>> => {
    return apiFetch<ConversationSummary[]>('/messages/conversations');
  },

  getMessages: async (
    conversationId: string,
    cursor?: string,
    limit = 30,
  ): Promise<ApiResponse<PaginatedMessagesResponse>> => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return apiFetch<PaginatedMessagesResponse>(
      `/messages/conversations/${encodeURIComponent(conversationId)}/messages?${query.toString()}`,
    );
  },

  sendMessageHttp: async (
    conversationId: string,
    input: SendMessageInput,
  ): Promise<ApiResponse<MessageItem>> => {
    return apiFetch<MessageItem>(`/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  markAsRead: async (
    conversationId: string,
  ): Promise<ApiResponse<{ readCount: number; readAt: string }>> => {
    return apiFetch<{ readCount: number; readAt: string }>(
      `/messages/conversations/${encodeURIComponent(conversationId)}/read`,
      { method: 'POST' },
    );
  },
};

/** Health check response shape from GET /health/live */
interface LiveResponse {
  status: string;
  service: string;
}

/** Fetches the API liveness endpoint. Returns null when API is unreachable. */
export async function fetchApiHealth(): Promise<LiveResponse | null> {
  const res = await apiFetch<LiveResponse>('/health/live');
  return res.data;
}

/** Public user content reporting API */
export const reportsApi = {
  createReport: async (payload: {
    targetType: 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE';
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<ApiResponse<{ success: boolean; message: string; reportId: string; createdAt: string }>> => {
    return apiFetch('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

/** Administrator Platform Management API */
export const adminApi = {
  // Dashboard & Analytics
  getOverview: async (): Promise<ApiResponse<AdminDashboardOverview>> => {
    return apiFetch<AdminDashboardOverview>('/admin/dashboard/overview');
  },
  getTimeseries: async (metric: string, period = '30d'): Promise<ApiResponse<AdminTimeseriesData>> => {
    const response = await apiFetch<{
      period: string;
      timeSeries: Array<{
        date: string;
        users: number;
        bookings: number;
        volumePaise: number;
      }>;
    }>(`/admin/dashboard/analytics?${new URLSearchParams({ period }).toString()}`);

    return {
      ...response,
      data: response.data
        ? {
            metric,
            period: response.data.period,
            points: response.data.timeSeries.map((point) => ({
              date: point.date,
              count: metric === 'bookings' ? point.bookings : metric === 'users' ? point.users : 0,
              ...(metric === 'revenue' ? { value: point.volumePaise } : {}),
            })),
          }
        : null,
    };
  },

  // Users Management
  getUsers: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminUserItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminUserItem[]; meta: AdminPaginationMeta }>(`/admin/users?${query.toString()}`);
  },
  getUserDetails: async (userId: string): Promise<ApiResponse<AdminUserDetails>> => {
    return apiFetch<AdminUserDetails>(`/admin/users/${encodeURIComponent(userId)}`);
  },
  suspendUser: async (userId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/users/${encodeURIComponent(userId)}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  activateUser: async (userId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/users/${encodeURIComponent(userId)}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  // Host Management
  getHosts: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminHostItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminHostItem[]; meta: AdminPaginationMeta }>(`/admin/hosts?${query.toString()}`);
  },
  getHostDetails: async (hostId: string): Promise<ApiResponse<AdminHostDetails>> => {
    return apiFetch<AdminHostDetails>(`/admin/hosts/${encodeURIComponent(hostId)}`);
  },
  suspendHost: async (hostId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/hosts/${encodeURIComponent(hostId)}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  activateHost: async (hostId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/hosts/${encodeURIComponent(hostId)}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  // Property Moderation
  getProperties: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminPropertyItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminPropertyItem[]; meta: AdminPaginationMeta }>(`/admin/properties?${query.toString()}`);
  },
  getPropertyDetails: async (propertyId: string): Promise<ApiResponse<AdminPropertyDetails>> => {
    return apiFetch<AdminPropertyDetails>(`/admin/properties/${encodeURIComponent(propertyId)}`);
  },
  approveProperty: async (propertyId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/properties/${encodeURIComponent(propertyId)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  flagProperty: async (propertyId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/properties/${encodeURIComponent(propertyId)}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  rejectProperty: async (propertyId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/properties/${encodeURIComponent(propertyId)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  // Review Moderation
  getReviews: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminReviewItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminReviewItem[]; meta: AdminPaginationMeta }>(`/admin/reviews?${query.toString()}`);
  },
  hideReview: async (reviewId: string, reason: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/reviews/${encodeURIComponent(reviewId)}/hide`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  restoreReview: async (reviewId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/reviews/${encodeURIComponent(reviewId)}/restore`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  // Reports Management
  getReports: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminReportItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminReportItem[]; meta: AdminPaginationMeta }>(`/admin/reports?${query.toString()}`);
  },
  getReportDetails: async (reportId: string): Promise<ApiResponse<AdminReportItem>> => {
    return apiFetch<AdminReportItem>(`/admin/reports/${encodeURIComponent(reportId)}`);
  },
  assignReport: async (reportId: string, adminId: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/reports/${encodeURIComponent(reportId)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ adminId }),
    });
  },
  updateReportStatus: async (
    reportId: string,
    status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
    resolutionNote?: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/reports/${encodeURIComponent(reportId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNote }),
    });
  },

  // Bookings Oversight
  getBookings: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminBookingItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminBookingItem[]; meta: AdminPaginationMeta }>(`/admin/bookings?${query.toString()}`);
  },
  getBookingDetails: async (bookingReference: string): Promise<ApiResponse<AdminBookingDetails>> => {
    return apiFetch<AdminBookingDetails>(`/admin/bookings/${encodeURIComponent(bookingReference)}`);
  },

  // Payments & Refunds
  getPayments: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminPaymentItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminPaymentItem[]; meta: AdminPaginationMeta }>(`/admin/payments?${query.toString()}`);
  },
  getRefunds: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminRefundItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<{ data: AdminRefundItem[]; meta: AdminPaginationMeta }>(`/admin/payments/refunds?${query.toString()}`);
  },
  retryRefund: async (refundId: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiFetch(`/admin/payments/refunds/${encodeURIComponent(refundId)}/retry`, {
      method: 'POST',
    });
  },

  // AI Usage
  getAiUsageStats: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<AdminAiUsageStats>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return apiFetch<AdminAiUsageStats>(`/admin/ai/usage?${query.toString()}`);
  },

  // Audit Logs
  getAuditLogs: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<{ data: AdminAuditLogItem[]; meta: AdminPaginationMeta }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    const response = await apiFetch<{
      data: Array<
        Omit<AdminAuditLogItem, 'adminUserId' | 'adminUserEmail' | 'adminUserName'> & {
          admin?: { id?: string; name?: string; email?: string };
        }
      >;
      meta: AdminPaginationMeta;
    }>(`/admin/audit-logs?${query.toString()}`);

    return {
      ...response,
      data: response.data
        ? {
            ...response.data,
            data: response.data.data.map((entry) => ({
              ...entry,
              adminUserId: entry.admin?.id ?? '',
              adminUserEmail: entry.admin?.email ?? '',
              adminUserName: entry.admin?.name ?? '',
            })),
          }
        : null,
    };
  },
};
