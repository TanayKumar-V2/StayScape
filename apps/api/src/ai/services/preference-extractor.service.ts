import { Injectable, Logger } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { ExtractedPreferencesDto, StayMatchSearchDto } from '../dto/staymatch-search.dto';

interface RawGroqPreferences {
  destination?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  minNights?: number | null;
  budget?: {
    minPaise?: number | null;
    maxPaise?: number | null;
    scope?: 'PER_NIGHT' | 'TOTAL_STAY';
  } | null;
  guests?: {
    adults?: number;
    children?: number;
    total?: number;
  } | null;
  propertyTypes?: string[];
  requiredAmenities?: string[];
  preferredAmenities?: string[];
  stylePreferences?: string[];
  unresolvedPreferences?: string[];
  intentStatus?: 'READY' | 'NEEDS_CLARIFICATION' | 'UNSUPPORTED';
  clarificationQuestion?: string | null;
  summary?: string;
}

@Injectable()
export class PreferenceExtractorService {
  private readonly logger = new Logger(PreferenceExtractorService.name);
  private cachedAmenitySlugs: string[] = [];
  private lastAmenityFetch = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly groqService: GroqService,
  ) {}

  /**
   * Retrieves verified amenity slugs from the database with 5-minute memory caching.
   */
  async getVerifiedAmenitySlugs(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedAmenitySlugs.length > 0 && now - this.lastAmenityFetch < 300_000) {
      return this.cachedAmenitySlugs;
    }

    try {
      const amenities = await this.prisma.amenity.findMany({
        select: { slug: true },
      });
      this.cachedAmenitySlugs = amenities.map((a) => a.slug);
      this.lastAmenityFetch = now;
      return this.cachedAmenitySlugs;
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to fetch amenity slugs from DB: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [
        'wifi',
        'air-conditioning',
        'heating',
        'workspace',
        'tv',
        'kitchen',
        'refrigerator',
        'microwave',
        'washing-machine',
        'pool',
        'balcony',
        'garden',
        'mountain-view',
        'beach-access',
        'free-parking',
        'paid-parking',
        'cctv',
        'fire-extinguisher',
        'first-aid-kit',
        'family-friendly',
        'pet-friendly',
        'play-area',
      ];
    }
  }

  /**
   * Extracts structured travel preferences using Groq or falls back to deterministic extraction.
   */
  async extractPreferences(dto: StayMatchSearchDto): Promise<{
    preferences: ExtractedPreferencesDto;
    fallbackUsed: boolean;
  }> {
    const verifiedSlugs = await this.getVerifiedAmenitySlugs();

    if (this.groqService.isAvailable()) {
      try {
        const extracted = await this.extractWithGroq(dto, verifiedSlugs);
        if (extracted) {
          const validated = this.validateAndNormalize(extracted, verifiedSlugs);
          return { preferences: validated, fallbackUsed: false };
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Groq preference extraction encountered an error, falling back to rule-based: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Deterministic fallback
    const fallback = this.extractFallback(dto, verifiedSlugs);
    return { preferences: fallback, fallbackUsed: true };
  }

  private async extractWithGroq(
    dto: StayMatchSearchDto,
    verifiedSlugs: string[],
  ): Promise<RawGroqPreferences | null> {
    const today = new Date().toISOString().split('T')[0];
    const propertyTypesList = Object.values(PropertyType).join(', ');

    const systemPrompt = `You are the StayScape Intelligent Travel Discovery parser.
Your task is to accurately extract structured travel criteria from the user's natural language request.
Today's date is ${today}. Timezone: ${dto.timezone || 'UTC'}.

Verified database amenity catalog slugs:
${JSON.stringify(verifiedSlugs)}

Valid property types:
[${propertyTypesList}]

Extraction Rules:
1. Map required or preferred amenities ONLY to verified slugs in the catalog.
2. If the user mentions requested features not in the catalog (e.g. helipad, butler, sauna, gym, jacuzzi), place them in unresolvedPreferences.
3. Monetary amounts must be in integer paise (1 INR = 100 paise). E.g. ₹5,000 = 500000 paise.
4. If the user gives a total stay budget (e.g. "under ₹20,000 total"), set scope to "TOTAL_STAY". Otherwise default to "PER_NIGHT".
5. Set intentStatus to:
   - "READY": Clear enough to perform a property search.
   - "NEEDS_CLARIFICATION": Ambiguous or conflicting (e.g. "I want a cheap stay in summer or winter").
   - "UNSUPPORTED": Queries unrelated to booking places to stay.
6. Provide a concise, friendly 1-sentence summary of the understood preferences.
7. Return strictly a JSON object matching this schema without markdown or extra commentary.

Schema:
{
  "destination": string | null,
  "checkIn": "YYYY-MM-DD" | null,
  "checkOut": "YYYY-MM-DD" | null,
  "minNights": number | null,
  "budget": { "minPaise": number | null, "maxPaise": number | null, "scope": "PER_NIGHT" | "TOTAL_STAY" } | null,
  "guests": { "adults": number, "children": number, "total": number } | null,
  "propertyTypes": string[],
  "requiredAmenities": string[],
  "preferredAmenities": string[],
  "stylePreferences": string[],
  "unresolvedPreferences": string[],
  "intentStatus": "READY" | "NEEDS_CLARIFICATION" | "UNSUPPORTED",
  "clarificationQuestion": string | null,
  "summary": string
}`;

    let userPrompt = `User query: "${dto.query}"`;
    if (dto.previousPreferences) {
      // Untrusted nested JSON straight from the client — bound its serialized
      // size so an anonymous caller cannot blow up the Groq prompt (cost).
      const serialized = JSON.stringify(dto.previousPreferences);
      const bounded = serialized.length > 4000 ? serialized.slice(0, 4000) : serialized;
      userPrompt = `The user previously searched with these preferences:
${bounded}

The user is now refining or updating their search with this new query:
"${dto.query}"

Please merge the previous preferences with the new request, updating or overriding only the attributes modified.`;
    }

    return this.groqService.createJsonCompletion<RawGroqPreferences>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    });
  }

  private validateAndNormalize(
    raw: RawGroqPreferences,
    verifiedSlugs: string[],
  ): ExtractedPreferencesDto {
    const verifiedSlugSet = new Set(verifiedSlugs);
    const validPropertyTypes = new Set(Object.values(PropertyType));

    // Normalize property types
    const propertyTypes: PropertyType[] = [];
    if (Array.isArray(raw.propertyTypes)) {
      for (const t of raw.propertyTypes) {
        const upper = t.toUpperCase() as PropertyType;
        if (validPropertyTypes.has(upper) && !propertyTypes.includes(upper)) {
          propertyTypes.push(upper);
        }
      }
    }

    // Normalize amenities
    const requiredAmenities: string[] = [];
    const preferredAmenities: string[] = [];
    const unresolved = new Set<string>(raw.unresolvedPreferences || []);

    if (Array.isArray(raw.requiredAmenities)) {
      for (const a of raw.requiredAmenities) {
        const slug = a.toLowerCase().trim();
        if (verifiedSlugSet.has(slug)) {
          if (!requiredAmenities.includes(slug)) requiredAmenities.push(slug);
        } else if (slug.length > 0) {
          unresolved.add(slug);
        }
      }
    }

    if (Array.isArray(raw.preferredAmenities)) {
      for (const a of raw.preferredAmenities) {
        const slug = a.toLowerCase().trim();
        if (verifiedSlugSet.has(slug)) {
          if (!preferredAmenities.includes(slug) && !requiredAmenities.includes(slug)) {
            preferredAmenities.push(slug);
          }
        } else if (slug.length > 0) {
          unresolved.add(slug);
        }
      }
    }

    // Normalize guests
    let guests = null;
    if (raw.guests) {
      const adults = Math.max(1, raw.guests.adults || 1);
      const children = Math.max(0, raw.guests.children || 0);
      const total = raw.guests.total
        ? Math.max(adults + children, raw.guests.total)
        : adults + children;
      guests = { adults, children, total };
    }

    // Normalize budget
    let budget: {
      minPaise: number | null;
      maxPaise: number | null;
      scope: 'PER_NIGHT' | 'TOTAL_STAY';
    } | null = null;
    if (raw.budget) {
      const minPaise = raw.budget.minPaise ? Math.max(0, Math.floor(raw.budget.minPaise)) : null;
      const maxPaise = raw.budget.maxPaise ? Math.max(0, Math.floor(raw.budget.maxPaise)) : null;
      const scope: 'PER_NIGHT' | 'TOTAL_STAY' =
        raw.budget.scope === 'TOTAL_STAY' ? 'TOTAL_STAY' : 'PER_NIGHT';
      budget = { minPaise, maxPaise, scope };
    }

    // Normalize dates
    const checkIn = raw.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(raw.checkIn) ? raw.checkIn : null;
    let checkOut = raw.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(raw.checkOut) ? raw.checkOut : null;

    if (checkIn && checkOut && checkIn >= checkOut) {
      // Invalid date range
      checkOut = null;
    }

    const intentStatus =
      raw.intentStatus === 'NEEDS_CLARIFICATION' || raw.intentStatus === 'UNSUPPORTED'
        ? raw.intentStatus
        : 'READY';

    return {
      destination: raw.destination ? raw.destination.trim() : null,
      checkIn,
      checkOut,
      minNights: raw.minNights ? Math.max(1, raw.minNights) : null,
      budget,
      guests,
      propertyTypes,
      requiredAmenities,
      preferredAmenities,
      stylePreferences: Array.isArray(raw.stylePreferences) ? raw.stylePreferences : [],
      unresolvedPreferences: Array.from(unresolved),
      intentStatus,
      clarificationQuestion: raw.clarificationQuestion || null,
      summary: raw.summary || 'Search based on your travel preferences.',
    };
  }

  /**
   * Deterministic regex and keyword fallback when Groq is unavailable.
   */
  extractFallback(dto: StayMatchSearchDto, verifiedSlugs: string[]): ExtractedPreferencesDto {
    const q = dto.query.toLowerCase();

    // 1. Destination detection
    const commonDestinations = [
      'manali',
      'goa',
      'shimla',
      'jaipur',
      'udaipur',
      'mumbai',
      'delhi',
      'bengaluru',
      'bangalore',
      'kerala',
      'rishikesh',
      'mussoorie',
      'ooty',
      'pondicherry',
      'darjeeling',
      'ladakh',
    ];

    let destination: string | null = null;
    for (const d of commonDestinations) {
      if (q.includes(d)) {
        destination = d.charAt(0).toUpperCase() + d.slice(1);
        break;
      }
    }

    // 2. Guests detection
    let guests = null;
    const guestMatch = q.match(/(\d+)\s*(?:guests?|people|persons?|adults?)/i);
    if (guestMatch?.[1]) {
      const count = parseInt(guestMatch[1], 10);
      guests = { adults: count, children: 0, total: count };
    } else if (q.includes('couple') || q.includes('for 2')) {
      guests = { adults: 2, children: 0, total: 2 };
    } else if (q.includes('solo') || q.includes('for 1')) {
      guests = { adults: 1, children: 0, total: 1 };
    }

    // 3. Budget detection
    let budget = null;
    const priceKMatch = q.match(
      /(?:under|below|max|budget of|less than|within|₹|rs\.?)\s*(\d+(?:\.\d+)?)\s*k/i,
    );
    const priceNumMatch = q.match(
      /(?:under|below|max|budget of|less than|within|₹|rs\.?)\s*(\d{3,7})/i,
    );

    if (priceKMatch?.[1]) {
      const maxPaise = Math.round(parseFloat(priceKMatch[1]) * 1000 * 100);
      budget = { minPaise: null, maxPaise, scope: 'PER_NIGHT' as const };
    } else if (priceNumMatch?.[1]) {
      const maxPaise = parseInt(priceNumMatch[1], 10) * 100;
      budget = { minPaise: null, maxPaise, scope: 'PER_NIGHT' as const };
    }

    // 4. Property type detection
    const propertyTypes: PropertyType[] = [];
    if (q.includes('cabin') || q.includes('chalet')) propertyTypes.push(PropertyType.CABIN);
    if (q.includes('villa')) propertyTypes.push(PropertyType.VILLA);
    if (q.includes('apartment') || q.includes('flat')) propertyTypes.push(PropertyType.APARTMENT);
    if (q.includes('house') || q.includes('home')) propertyTypes.push(PropertyType.HOUSE);
    if (q.includes('homestay')) propertyTypes.push(PropertyType.HOMESTAY);
    if (q.includes('hotel') || q.includes('resort')) propertyTypes.push(PropertyType.HOTEL);

    // 5. Amenities detection
    const requiredAmenities: string[] = [];
    const preferredAmenities: string[] = [];

    const keywordToAmenity: Record<string, string> = {
      wifi: 'wifi',
      internet: 'wifi',
      pool: 'pool',
      swimming: 'pool',
      kitchen: 'kitchen',
      cook: 'kitchen',
      balcony: 'balcony',
      mountain: 'mountain-view',
      beach: 'beach-access',
      parking: 'free-parking',
      workspace: 'workspace',
      desk: 'workspace',
      pet: 'pet-friendly',
      pets: 'pet-friendly',
      family: 'family-friendly',
      ac: 'air-conditioning',
      'air conditioning': 'air-conditioning',
      heating: 'heating',
      heater: 'heating',
    };

    for (const [kw, slug] of Object.entries(keywordToAmenity)) {
      if (q.includes(kw) && verifiedSlugs.includes(slug)) {
        if (!preferredAmenities.includes(slug)) {
          preferredAmenities.push(slug);
        }
      }
    }

    // 6. Style preferences
    const stylePreferences: string[] = [];
    const styleKeywords = [
      'cozy',
      'luxury',
      'peaceful',
      'quiet',
      'scenic',
      'romantic',
      'modern',
      'wooden',
    ];
    for (const sk of styleKeywords) {
      if (q.includes(sk)) stylePreferences.push(sk);
    }

    return {
      destination,
      checkIn: null,
      checkOut: null,
      minNights: null,
      budget,
      guests,
      propertyTypes,
      requiredAmenities,
      preferredAmenities,
      stylePreferences,
      unresolvedPreferences: [],
      intentStatus: 'READY',
      clarificationQuestion: null,
      summary: `Standard search matching ${destination ? destination : 'popular stays'}${
        propertyTypes.length > 0 ? ` (${propertyTypes.join(', ')})` : ''
      }${budget ? ` under ₹${(budget.maxPaise || 0) / 100}` : ''}.`,
    };
  }
}
