import { Injectable } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { ExtractedPreferencesDto } from '../dto/staymatch-search.dto';
import { RankedPropertyItem } from '../dto/staymatch-response.dto';
import {
  RawPropertyRecord,
  serializePublicPropertySummary,
} from '../../properties/serializers/public-property.serializer';

export interface ScoredProperty {
  property: RawPropertyRecord;
  matchScore: number;
  matchReasons: string[];
  tradeOffs: string[];
}

@Injectable()
export class PropertyRankingService {
  /**
   * Deterministically scores candidate properties against extracted preferences.
   * Total score: 0 to 100 points.
   */
  rankProperties(
    properties: RawPropertyRecord[],
    preferences: ExtractedPreferencesDto,
    rawQuery: string,
  ): RankedPropertyItem[] {
    const scoredList: ScoredProperty[] = properties.map((property) =>
      this.scoreProperty(property, preferences, rawQuery),
    );

    // Sort by match score descending; break ties by price
    scoredList.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.property.pricePerNightPaise - b.property.pricePerNightPaise;
    });

    return scoredList.map((item) => {
      const summary = serializePublicPropertySummary(item.property);
      return {
        ...summary,
        matchScore: item.matchScore,
        matchReasons: item.matchReasons,
        tradeOffs: item.tradeOffs,
      };
    });
  }

  private scoreProperty(
    property: RawPropertyRecord,
    preferences: ExtractedPreferencesDto,
    rawQuery: string,
  ): ScoredProperty {
    const reasons: string[] = [];
    const tradeOffs: string[] = [];

    // ── 1. Destination Match (0–20 pts) ──────────────────────────────────────
    let destinationScore = 20;
    if (preferences.destination && preferences.destination.trim().length > 0) {
      const dest = preferences.destination.toLowerCase().trim();
      const city = property.city.toLowerCase();
      const state = property.state.toLowerCase();
      const country = property.country.toLowerCase();

      if (city === dest || city.includes(dest)) {
        destinationScore = 20;
        reasons.push(`Prime location in ${property.city}`);
      } else if (state === dest || state.includes(dest)) {
        destinationScore = 15;
        reasons.push(`Located in ${property.state} (${property.city})`);
      } else if (country === dest || country.includes(dest)) {
        destinationScore = 10;
        reasons.push(`Located in ${property.country}`);
      } else {
        destinationScore = 0;
        tradeOffs.push(`Located in ${property.city}, outside requested ${preferences.destination}`);
      }
    }

    // ── 2. Budget Fit (0–20 pts) ─────────────────────────────────────────────
    let budgetScore = 20;
    const pricePerNight = property.pricePerNightPaise;
    const priceRupees = Math.round(pricePerNight / 100);

    if (preferences.budget?.maxPaise) {
      const maxPaise = preferences.budget.maxPaise;
      const maxRupees = Math.round(maxPaise / 100);

      if (pricePerNight <= maxPaise) {
        if (pricePerNight <= maxPaise * 0.9) {
          budgetScore = 20;
          reasons.push(
            `Great value at ₹${priceRupees.toLocaleString('en-IN')}/night (under ₹${maxRupees.toLocaleString('en-IN')} budget)`,
          );
        } else {
          budgetScore = 18;
          reasons.push(`Within budget at ₹${priceRupees.toLocaleString('en-IN')}/night`);
        }
      } else {
        const overRatio = (pricePerNight - maxPaise) / maxPaise;
        if (overRatio <= 0.15) {
          budgetScore = 12;
          tradeOffs.push(
            `Slightly above target budget (₹${priceRupees.toLocaleString('en-IN')}/night vs ₹${maxRupees.toLocaleString('en-IN')})`,
          );
        } else if (overRatio <= 0.3) {
          budgetScore = 6;
          tradeOffs.push(`Above target budget at ₹${priceRupees.toLocaleString('en-IN')}/night`);
        } else {
          budgetScore = 0;
          tradeOffs.push(
            `Significantly exceeds budget at ₹${priceRupees.toLocaleString('en-IN')}/night`,
          );
        }
      }
    } else {
      reasons.push(`Priced at ₹${priceRupees.toLocaleString('en-IN')}/night`);
    }

    // ── 3. Amenities Match (0–20 pts) ────────────────────────────────────────
    let amenitiesScore = 20;
    const propertyAmenities = property.amenities || [];
    const propertyAmenitySlugs = new Set(propertyAmenities.map((pa) => pa.amenity.slug));
    const propertyAmenityNames = new Map(
      propertyAmenities.map((pa) => [pa.amenity.slug, pa.amenity.name]),
    );

    const required = preferences.requiredAmenities || [];
    const preferred = preferences.preferredAmenities || [];

    if (required.length > 0 || preferred.length > 0) {
      let reqScore = 10;
      let prefScore = 10;

      if (required.length > 0) {
        const missingReq: string[] = [];
        const matchedReq: string[] = [];

        for (const slug of required) {
          if (propertyAmenitySlugs.has(slug)) {
            matchedReq.push(propertyAmenityNames.get(slug) || slug);
          } else {
            missingReq.push(slug);
          }
        }

        if (missingReq.length === 0) {
          reqScore = 10;
          if (matchedReq.length > 0) {
            reasons.push(`Includes required amenities: ${matchedReq.slice(0, 3).join(', ')}`);
          }
        } else {
          reqScore = 0;
          tradeOffs.push(`Missing required amenity: ${missingReq.join(', ')}`);
        }
      }

      if (preferred.length > 0) {
        const matchedPref: string[] = [];
        const missingPref: string[] = [];

        for (const slug of preferred) {
          if (propertyAmenitySlugs.has(slug)) {
            matchedPref.push(propertyAmenityNames.get(slug) || slug);
          } else {
            missingPref.push(slug);
          }
        }

        prefScore = Math.round((matchedPref.length / preferred.length) * 10);
        if (matchedPref.length > 0) {
          reasons.push(`Features ${matchedPref.slice(0, 3).join(', ')}`);
        }
        if (missingPref.length > 0 && missingPref.length <= 2) {
          tradeOffs.push(`Does not feature ${missingPref.join(', ')}`);
        }
      }

      amenitiesScore = reqScore + prefScore;
    }

    // ── 4. Property Type Match (0–10 pts) ────────────────────────────────────
    let typeScore = 10;
    if (preferences.propertyTypes && preferences.propertyTypes.length > 0) {
      if (preferences.propertyTypes.includes(property.propertyType as PropertyType)) {
        typeScore = 10;
        reasons.push(`Matches requested property type (${property.propertyType})`);
      } else {
        typeScore = 0;
        tradeOffs.push(
          `${property.propertyType} property instead of requested ${preferences.propertyTypes.join('/')}`,
        );
      }
    }

    // ── 5. Capacity Fit (0–10 pts) ───────────────────────────────────────────
    let capacityScore = 10;
    if (preferences.guests?.total) {
      const requested = preferences.guests.total;
      const maxGuests = property.maxGuests;

      if (maxGuests >= requested) {
        if (maxGuests <= requested + 2) {
          capacityScore = 10;
          reasons.push(
            `Ideal capacity for ${requested} ${requested === 1 ? 'guest' : 'guests'} (up to ${maxGuests})`,
          );
        } else if (maxGuests <= requested + 4) {
          capacityScore = 8;
          reasons.push(`Spacious layout accommodating up to ${maxGuests} guests`);
        } else {
          capacityScore = 6;
          tradeOffs.push(
            `Oversized space (accommodates ${maxGuests} guests for ${requested} requested)`,
          );
        }
      } else {
        capacityScore = 0;
        tradeOffs.push(`Limited capacity (max ${maxGuests} guests vs ${requested} requested)`);
      }
    }

    // ── 6. Keyword & Description Relevance (0–10 pts) ────────────────────────
    let keywordScore: number;
    const textBlob = `${property.title} ${property.description}`.toLowerCase();
    const queryTokens = rawQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 4 && !['with', 'have', 'from', 'stay', 'need', 'want', 'under'].includes(w),
      );

    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (textBlob.includes(token)) {
        matchedTokens++;
      }
    }

    if (matchedTokens >= 3) keywordScore = 10;
    else if (matchedTokens === 2) keywordScore = 7;
    else if (matchedTokens === 1) keywordScore = 4;
    else keywordScore = 0;

    // ── 7. Style & Atmosphere Fit (0–10 pts) ──────────────────────────────────
    let styleScore = 10;
    if (preferences.stylePreferences && preferences.stylePreferences.length > 0) {
      let matchedStyles = 0;
      for (const style of preferences.stylePreferences) {
        const s = style.toLowerCase();
        if (textBlob.includes(s)) {
          matchedStyles++;
        }
      }

      if (matchedStyles >= 2) {
        styleScore = 10;
        reasons.push(
          `Matches your preference for ${preferences.stylePreferences.slice(0, 2).join(' & ')} ambiance`,
        );
      } else if (matchedStyles === 1) {
        styleScore = 7;
      } else {
        styleScore = 3;
      }
    }

    const totalScore = Math.min(
      100,
      Math.max(
        0,
        destinationScore +
          budgetScore +
          amenitiesScore +
          typeScore +
          capacityScore +
          keywordScore +
          styleScore,
      ),
    );

    // Limit reasons and trade-offs to clean concise sets
    const cleanReasons = Array.from(new Set(reasons)).slice(0, 4);
    const cleanTradeOffs = Array.from(new Set(tradeOffs)).slice(0, 3);

    return {
      property,
      matchScore: totalScore,
      matchReasons: cleanReasons,
      tradeOffs: cleanTradeOffs,
    };
  }
}
