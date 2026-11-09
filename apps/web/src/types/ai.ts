import type { PublicPropertySummary } from './property';

export interface ExtractedBudget {
  minPaise?: number | null;
  maxPaise?: number | null;
  scope: 'PER_NIGHT' | 'TOTAL_STAY';
}

export interface ExtractedGuests {
  adults: number;
  children?: number;
  total: number;
}

export interface ExtractedPreferences {
  destination?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  minNights?: number | null;
  budget?: ExtractedBudget | null;
  guests?: ExtractedGuests | null;
  propertyTypes?: string[];
  requiredAmenities?: string[];
  preferredAmenities?: string[];
  stylePreferences?: string[];
  unresolvedPreferences?: string[];
  intentStatus: 'READY' | 'NEEDS_CLARIFICATION' | 'UNSUPPORTED';
  clarificationQuestion?: string | null;
  summary: string;
}

export interface RankedPropertyItem extends PublicPropertySummary {
  matchScore: number;
  matchReasons: string[];
  tradeOffs: string[];
}

export interface StayMatchSearchPayload {
  query: string;
  previousPreferences?: ExtractedPreferences;
  timezone?: string;
  page?: number;
  limit?: number;
}

export interface StayMatchResponse {
  interpretedPreferences: ExtractedPreferences;
  summary: string;
  clarificationQuestion?: string | null;
  unresolvedPreferences: string[];
  results: RankedPropertyItem[];
  totalMatched: number;
  page: number;
  limit: number;
  totalPages: number;
  fallbackUsed: boolean;
}

export interface PropertyQuestionPayload {
  question: string;
}

export interface PropertyAnswerResponse {
  propertySlug: string;
  propertyTitle: string;
  answer: string;
  confidence: 'VERIFIED_FACT' | 'NOT_MENTIONED' | 'POLICY_RESTRICTION';
  referencedFacts: string[];
  fallbackUsed?: boolean;
}

export interface ComparePropertiesPayload {
  propertySlugs: string[];
}

export interface ComparisonPropertyFact {
  slug: string;
  title: string;
  propertyType: string;
  city: string;
  state: string;
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  checkInFrom: string | null;
  checkOutUntil: string | null;
  coverImage: string | null;
  amenityNames: string[];
  houseRules: string[];
}

export interface ComparisonMatrix {
  commonAmenities: string[];
  exclusiveAmenities: Record<string, string[]>;
  priceDifferencePaise: number | null;
  capacityDifference: number | null;
}

export interface PropertyComparisonResponse {
  properties: ComparisonPropertyFact[];
  matrix: ComparisonMatrix;
  aiSummary: string;
  bestFor: Record<string, string>;
  keyDifferences: string[];
  fallbackUsed: boolean;
}

export interface GenerateItineraryPayload {
  propertySlug: string;
  days?: number;
  tripStyle?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  localTip: string;
}

export interface ItineraryResponse {
  destination: string;
  propertyTitle: string;
  propertySlug: string;
  tripStyle: string;
  totalDays: number;
  days: ItineraryDay[];
  disclaimer: string;
  fallbackUsed: boolean;
}

