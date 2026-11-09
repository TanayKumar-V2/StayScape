import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostStatus, PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import { PropertyAnswerResponseDto, PropertyQuestionDto } from '../dto/property-question.dto';

interface RawAssistantResponse {
  answer: string;
  confidence: 'VERIFIED_FACT' | 'NOT_MENTIONED' | 'POLICY_RESTRICTION';
  referencedFacts: string[];
}

interface PropertyFactSheet {
  title: string;
  propertyType: string;
  city: string;
  state: string;
  country: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNight: string;
  cleaningFee: string;
  checkInFrom: string;
  checkOutUntil: string;
  houseRules: string[];
  amenities: string[];
  description: string;
  hostName: string;
}

@Injectable()
export class PropertyAssistantService {
  private readonly logger = new Logger(PropertyAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groqService: GroqService,
  ) {}

  async askQuestion(slug: string, dto: PropertyQuestionDto): Promise<PropertyAnswerResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        amenities: {
          include: { amenity: true },
        },
        hostProfile: {
          select: { displayName: true, status: true },
        },
      },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED ||
      property.hostProfile.status !== HostStatus.ACTIVE
    ) {
      throw new NotFoundException(`Listing with slug '${slug}' not found or unavailable.`);
    }

    const amenityNames = property.amenities.map((pa) => pa.amenity.name);
    const priceRupees = Math.round(property.pricePerNightPaise / 100);
    const cleaningFeeRupees = Math.round(property.cleaningFeePaise / 100);

    const factSheet: PropertyFactSheet = {
      title: property.title,
      propertyType: property.propertyType,
      city: property.city,
      state: property.state,
      country: property.country,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      beds: property.beds,
      bathrooms: property.bathrooms,
      pricePerNight: `₹${priceRupees.toLocaleString('en-IN')}`,
      cleaningFee: `₹${cleaningFeeRupees.toLocaleString('en-IN')}`,
      checkInFrom: property.checkInFrom || '14:00',
      checkOutUntil: property.checkOutUntil || '11:00',
      houseRules: property.houseRules,
      amenities: amenityNames,
      description: property.description,
      hostName: property.hostProfile.displayName,
    };

    if (this.groqService.isAvailable()) {
      try {
        const response = await this.queryGroq(dto.question, factSheet);
        if (response) {
          return {
            propertySlug: property.slug,
            propertyTitle: property.title,
            answer: response.answer,
            confidence: response.confidence,
            referencedFacts: response.referencedFacts,
            fallbackUsed: false,
          };
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Property assistant Groq error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Deterministic fallback response
    const fallback = this.generateFallbackAnswer(dto.question, factSheet);
    return {
      propertySlug: property.slug,
      propertyTitle: property.title,
      answer: fallback.answer,
      confidence: fallback.confidence,
      referencedFacts: fallback.referencedFacts,
      fallbackUsed: true,
    };
  }

  private async queryGroq(
    question: string,
    facts: PropertyFactSheet,
  ): Promise<RawAssistantResponse | null> {
    const systemPrompt = `You are the StayScape Property Assistant for "${facts.title}".
Your job is to answer guest questions about this listing accurately, warmly, and concisely.

CRITICAL INSTRUCTIONS:
1. Base your answer ONLY on the verified factual listing details provided.
2. If asked about features or amenities not listed (e.g. jacuzzi, private chef, gym, elevator), state clearly that they are not mentioned in the listing.
3. NEVER disclose exact private street addresses or direct contact phone numbers/emails. Explain that full address and check-in instructions are released automatically upon confirmed booking.
4. If asked about real-time availability or booking cost calculations for dates, direct the traveler to the booking calendar widget on this page.
5. Return strictly a JSON object matching this schema:
{
  "answer": "string",
  "confidence": "VERIFIED_FACT" | "NOT_MENTIONED" | "POLICY_RESTRICTION",
  "referencedFacts": ["fact 1", "fact 2"]
}`;

    const userPrompt = `Verified Listing Facts:
${JSON.stringify(facts, null, 2)}

Guest Question:
"${question}"`;

    return this.groqService.createJsonCompletion<RawAssistantResponse>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    });
  }

  private generateFallbackAnswer(question: string, facts: PropertyFactSheet): RawAssistantResponse {
    const q = question.toLowerCase();
    const amenities = facts.amenities;
    const houseRules = facts.houseRules;

    // Check Wi-Fi / internet
    if (q.includes('wifi') || q.includes('internet') || q.includes('work')) {
      const hasWifi = amenities.some(
        (a) => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('wifi'),
      );
      const hasWorkspace = amenities.some((a) => a.toLowerCase().includes('workspace'));
      if (hasWifi) {
        return {
          answer: `Yes, ${facts.title} offers fast Wi-Fi${hasWorkspace ? ' along with a dedicated workspace suitable for remote work.' : '.'}`,
          confidence: 'VERIFIED_FACT',
          referencedFacts: ['Fast Wi-Fi', ...(hasWorkspace ? ['Dedicated workspace'] : [])],
        };
      }
    }

    // Check check-in/out times
    if (
      q.includes('check-in') ||
      q.includes('check in') ||
      q.includes('check out') ||
      q.includes('checkout')
    ) {
      return {
        answer: `Check-in is available from ${facts.checkInFrom}, and check-out is until ${facts.checkOutUntil}.`,
        confidence: 'VERIFIED_FACT',
        referencedFacts: [`Check-in: ${facts.checkInFrom}`, `Check-out: ${facts.checkOutUntil}`],
      };
    }

    // Check parking
    if (q.includes('parking') || q.includes('car')) {
      const parking = amenities.find((a) => a.toLowerCase().includes('parking'));
      if (parking) {
        return {
          answer: `Yes, this property provides ${parking.toLowerCase()}.`,
          confidence: 'VERIFIED_FACT',
          referencedFacts: [parking],
        };
      }
    }

    // Check rules / pets
    if (q.includes('pet') || q.includes('dog') || q.includes('cat')) {
      const petFriendly = amenities.some((a) => a.toLowerCase().includes('pet friendly'));
      return {
        answer: petFriendly
          ? `Yes, pets are welcome at this property!`
          : `Pets are not explicitly listed as allowed for this stay. Please review house rules or contact the host after booking.`,
        confidence: petFriendly ? 'VERIFIED_FACT' : 'NOT_MENTIONED',
        referencedFacts: petFriendly ? ['Pet friendly'] : houseRules,
      };
    }

    // Address privacy check
    if (
      q.includes('address') ||
      q.includes('phone') ||
      q.includes('contact') ||
      q.includes('where is')
    ) {
      return {
        answer: `This stay is located in ${facts.city}, ${facts.state}. For privacy and safety, the complete street address and host direct contact details are provided upon booking confirmation.`,
        confidence: 'POLICY_RESTRICTION',
        referencedFacts: [`Located in ${facts.city}, ${facts.state}`],
      };
    }

    // Generic factual summary
    return {
      answer: `${facts.title} is a ${facts.propertyType} located in ${facts.city}, ${facts.state}, accommodating up to ${facts.maxGuests} guests across ${facts.bedrooms} bedrooms and ${facts.bathrooms} bathrooms.`,
      confidence: 'VERIFIED_FACT',
      referencedFacts: [`Capacity: ${facts.maxGuests} guests`, `${facts.bedrooms} bedrooms`],
    };
  }
}
