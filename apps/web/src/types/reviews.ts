export interface ReviewCategoryRatings {
  cleanliness: number | null;
  accuracy: number | null;
  checkIn: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
}

export interface ReviewItem {
  id: string;
  overallRating: number;
  title: string | null;
  comment: string;
  categoryRatings: ReviewCategoryRatings;
  guest: {
    displayName: string;
    avatarUrl: string | null;
  };
  verifiedStay: boolean;
  hostResponse: string | null;
  hostRespondedAt: string | null;
  createdAt: string;
}

export interface RatingDistributionItem {
  count: number;
  percentage: number;
}

export interface ReviewSummaryData {
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: {
    5: RatingDistributionItem;
    4: RatingDistributionItem;
    3: RatingDistributionItem;
    2: RatingDistributionItem;
    1: RatingDistributionItem;
  };
  categoryAverages: ReviewCategoryRatings;
}

export interface PaginatedReviewsResponse {
  data: ReviewItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewInput {
  bookingReference: string;
  overallRating: number;
  cleanlinessRating?: number;
  accuracyRating?: number;
  checkInRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
  title?: string;
  comment: string;
}

export interface UpdateReviewInput {
  overallRating?: number;
  cleanlinessRating?: number;
  accuracyRating?: number;
  checkInRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
  title?: string;
  comment?: string;
}

export interface ReviewEligibilityResponse {
  eligible: boolean;
  reason?: string;
  message?: string;
  booking?: {
    bookingReference: string;
    propertyTitle: string;
    propertySlug: string;
    checkIn: string;
    checkOut: string;
  };
  existingReviewId?: string;
}

export interface AiReviewHighlight {
  topic: string;
  summary: string;
}

export interface AiReviewConcern {
  topic: string;
  summary: string;
}

export interface AiReviewSummaryAvailable {
  available: true;
  headline: string;
  overallSentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE' | 'INSUFFICIENT_DATA';
  highlights: AiReviewHighlight[];
  concerns: AiReviewConcern[];
  reviewCount: number;
  generatedAt: string;
}

export interface AiReviewSummaryUnavailable {
  available: false;
  reason: 'INSUFFICIENT_REVIEWS' | 'PROPERTY_NOT_FOUND' | 'SERVICE_UNAVAILABLE';
  message: string;
  reviewCount?: number;
}

export type AiReviewSummaryResponse = AiReviewSummaryAvailable | AiReviewSummaryUnavailable;
