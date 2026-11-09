import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostStatus, PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import {
  ComparePropertiesDto,
  ComparisonMatrix,
  ComparisonPropertyFact,
  PropertyComparisonResponseDto,
} from '../dto/property-comparison.dto';

interface RawComparisonAiResponse {
  aiSummary: string;
  bestFor: Record<string, string>;
  keyDifferences: string[];
}

@Injectable()
export class PropertyComparisonService {
  private readonly logger = new Logger(PropertyComparisonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groqService: GroqService,
  ) {}

  async compare(dto: ComparePropertiesDto): Promise<PropertyComparisonResponseDto> {
    const slugs = Array.from(new Set(dto.propertySlugs));
    if (slugs.length < 2 || slugs.length > 3) {
      throw new BadRequestException(
        'Property comparison requires between 2 and 3 unique properties.',
      );
    }

    const properties = await this.prisma.property.findMany({
      where: {
        slug: { in: slugs },
        status: PropertyStatus.PUBLISHED,
        moderationStatus: PropertyModerationStatus.APPROVED,
        hostProfile: { status: HostStatus.ACTIVE },
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: { amenity: true },
        },
      },
    });

    if (properties.length !== slugs.length) {
      const foundSlugs = new Set(properties.map((p) => p.slug));
      const missing = slugs.filter((s) => !foundSlugs.has(s));
      throw new NotFoundException(
        `The following properties could not be found: ${missing.join(', ')}`,
      );
    }

    // Build fact objects
    const propertyFacts: ComparisonPropertyFact[] = properties.map((p) => {
      const cover = p.images.find((img) => img.isCover) || p.images[0] || null;
      return {
        slug: p.slug,
        title: p.title,
        propertyType: p.propertyType,
        city: p.city,
        state: p.state,
        pricePerNightPaise: p.pricePerNightPaise,
        cleaningFeePaise: p.cleaningFeePaise,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        beds: p.beds,
        bathrooms: p.bathrooms,
        checkInFrom: p.checkInFrom,
        checkOutUntil: p.checkOutUntil,
        coverImage: cover ? cover.secureUrl : null,
        amenityNames: p.amenities.map((a) => a.amenity.name),
        houseRules: p.houseRules,
      };
    });

    // Build deterministic matrix
    const matrix = this.computeComparisonMatrix(propertyFacts);

    if (this.groqService.isAvailable()) {
      try {
        const aiResponse = await this.generateAiSummary(propertyFacts, matrix);
        if (aiResponse) {
          return {
            properties: propertyFacts,
            matrix,
            aiSummary: aiResponse.aiSummary,
            bestFor: aiResponse.bestFor,
            keyDifferences: aiResponse.keyDifferences,
            fallbackUsed: false,
          };
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Property comparison Groq error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Deterministic fallback comparison
    const fallback = this.generateFallbackComparison(propertyFacts, matrix);
    return {
      properties: propertyFacts,
      matrix,
      aiSummary: fallback.aiSummary,
      bestFor: fallback.bestFor,
      keyDifferences: fallback.keyDifferences,
      fallbackUsed: true,
    };
  }

  private computeComparisonMatrix(properties: ComparisonPropertyFact[]): ComparisonMatrix {
    // Amenity intersection and exclusivity
    const amenitySets = properties.map((p) => new Set(p.amenityNames));
    const allAmenities = Array.from(new Set(properties.flatMap((p) => p.amenityNames)));

    const commonAmenities: string[] = [];
    for (const a of allAmenities) {
      if (amenitySets.every((s) => s.has(a))) {
        commonAmenities.push(a);
      }
    }

    const exclusiveAmenities: Record<string, string[]> = {};
    for (let i = 0; i < properties.length; i++) {
      const p = properties[i];
      const otherSets = amenitySets.filter((_, idx) => idx !== i);
      const unique = p.amenityNames.filter((a) => !otherSets.some((s) => s.has(a)));
      exclusiveAmenities[p.slug] = unique;
    }

    // Pricing & Capacity differences
    const prices = properties.map((p) => p.pricePerNightPaise);
    const priceDiff = Math.max(...prices) - Math.min(...prices);

    const capacities = properties.map((p) => p.maxGuests);
    const capDiff = Math.max(...capacities) - Math.min(...capacities);

    return {
      commonAmenities,
      exclusiveAmenities,
      priceDifferencePaise: prices.length > 1 ? priceDiff : null,
      capacityDifference: capacities.length > 1 ? capDiff : null,
    };
  }

  private async generateAiSummary(
    properties: ComparisonPropertyFact[],
    matrix: ComparisonMatrix,
  ): Promise<RawComparisonAiResponse | null> {
    const systemPrompt = `You are the StayScape AI Comparison Specialist.
Analyze the following properties and generate an insightful, factual side-by-side comparison.

Rules:
1. Ground your observations STRICTLY on the listing facts provided (price, location, capacity, amenities).
2. Do not invent amenities or fake reviews.
3. In "bestFor", assign a single short phrase for each property slug indicating the ideal traveler (e.g. "Couples seeking a peaceful alpine retreat", "Families wanting private pool and beach access").
4. List 3 to 5 standout key differences.
5. Return strictly a JSON object:
{
  "aiSummary": "string (2-3 concise paragraphs)",
  "bestFor": { "property-slug-1": "string", "property-slug-2": "string" },
  "keyDifferences": ["string"]
}`;

    const userPrompt = `Properties to compare:
${JSON.stringify(properties, null, 2)}

Computed Matrix:
${JSON.stringify(matrix, null, 2)}`;

    return this.groqService.createJsonCompletion<RawComparisonAiResponse>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });
  }

  private generateFallbackComparison(
    properties: ComparisonPropertyFact[],
    matrix: ComparisonMatrix,
  ): RawComparisonAiResponse {
    const keyDifferences: string[] = [];
    const bestFor: Record<string, string> = {};

    for (const p of properties) {
      const priceRupees = Math.round(p.pricePerNightPaise / 100);
      const exclusives = matrix.exclusiveAmenities[p.slug] || [];
      const exclusiveStr =
        exclusives.length > 0 ? ` (exclusive: ${exclusives.slice(0, 2).join(', ')})` : '';
      keyDifferences.push(
        `${p.title}: ₹${priceRupees.toLocaleString('en-IN')}/night in ${p.city}, accommodates up to ${p.maxGuests} guests${exclusiveStr}.`,
      );

      if (p.maxGuests <= 3) {
        bestFor[p.slug] = 'Best for couples and solo travelers looking for an intimate escape';
      } else if (p.maxGuests <= 6) {
        bestFor[p.slug] = 'Best for small groups or families wanting ample living space';
      } else {
        bestFor[p.slug] = 'Best for large gatherings or family reunions needing high capacity';
      }
    }

    const priceDiffStr = matrix.priceDifferencePaise
      ? `Price variation between the listings is ₹${Math.round(matrix.priceDifferencePaise / 100).toLocaleString('en-IN')} per night.`
      : '';

    const summary = `Comparing ${properties.map((p) => p.title).join(' vs ')}. Both listings offer verified accommodation standards. ${priceDiffStr} ${
      matrix.commonAmenities.length > 0
        ? `Shared amenities include ${matrix.commonAmenities.slice(0, 4).join(', ')}.`
        : ''
    }`;

    return {
      aiSummary: summary,
      bestFor,
      keyDifferences,
    };
  }
}
