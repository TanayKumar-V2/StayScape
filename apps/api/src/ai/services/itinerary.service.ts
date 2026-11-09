import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostStatus, PropertyModerationStatus, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqService } from './groq.service';
import {
  GenerateItineraryDto,
  ItineraryDay,
  ItineraryResponseDto,
} from '../dto/itinerary-request.dto';

interface RawItineraryGroqResponse {
  days: ItineraryDay[];
}

const ITINERARY_DISCLAIMER =
  'These activity ideas and dining suggestions are AI-generated travel inspirations. StayScape does not guarantee operating hours, seasonal availability, or ticket bookings. Please verify local attractions independently.';

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groqService: GroqService,
  ) {}

  async generate(dto: GenerateItineraryDto): Promise<ItineraryResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { slug: dto.propertySlug },
      select: {
        slug: true,
        title: true,
        propertyType: true,
        city: true,
        state: true,
        country: true,
        status: true,
        moderationStatus: true,
        hostProfile: { select: { status: true } },
      },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED ||
      property.hostProfile.status !== HostStatus.ACTIVE
    ) {
      throw new NotFoundException(`Listing with slug '${dto.propertySlug}' not found.`);
    }

    const totalDays = Math.min(7, Math.max(1, dto.days || 3));
    const tripStyle = dto.tripStyle?.trim() || 'relaxation and local discovery';
    const destination = `${property.city}, ${property.state}`;

    if (this.groqService.isAvailable()) {
      try {
        const groqDays = await this.generateWithGroq(
          property.title,
          property.city,
          property.state,
          property.country,
          totalDays,
          tripStyle,
        );

        if (groqDays && groqDays.length > 0) {
          return {
            destination,
            propertyTitle: property.title,
            propertySlug: property.slug,
            tripStyle,
            totalDays: groqDays.length,
            days: groqDays,
            disclaimer: ITINERARY_DISCLAIMER,
            fallbackUsed: false,
          };
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Itinerary generation Groq error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Deterministic fallback itinerary
    const fallbackDays = this.generateFallbackItinerary(property.city, totalDays, tripStyle);
    return {
      destination,
      propertyTitle: property.title,
      propertySlug: property.slug,
      tripStyle,
      totalDays: fallbackDays.length,
      days: fallbackDays,
      disclaimer: ITINERARY_DISCLAIMER,
      fallbackUsed: true,
    };
  }

  private async generateWithGroq(
    title: string,
    city: string,
    state: string,
    country: string,
    days: number,
    tripStyle: string,
  ): Promise<ItineraryDay[] | null> {
    const systemPrompt = `You are an expert travel curator for StayScape.
Generate a structured, authentic ${days}-day travel itinerary for a traveler staying at "${title}" in ${city}, ${state}, ${country}.
Trip style preference: ${tripStyle}.

Guidelines:
1. Provide realistic morning, afternoon, and evening activities grounded in the destination's geography and culture.
2. Include a genuine insider "localTip" for each day.
3. Return strictly a JSON object with:
{
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "morning": "Morning activity description",
      "afternoon": "Afternoon activity description",
      "evening": "Evening activity description",
      "localTip": "Helpful insider tip"
    }
  ]
}`;

    const userPrompt = `Create a ${days}-day itinerary for ${city}, ${state}.`;

    const res = await this.groqService.createJsonCompletion<RawItineraryGroqResponse>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    return res?.days || null;
  }

  private generateFallbackItinerary(
    city: string,
    days: number,
    _tripStyle: string,
  ): ItineraryDay[] {
    const dayTemplates: ItineraryDay[] = [
      {
        dayNumber: 1,
        title: 'Settling in & Local Vibe',
        morning: `Arrive in ${city}, check in to your stay, and unpack. Take a gentle morning stroll around the immediate neighborhood to get your bearings.`,
        afternoon: `Enjoy lunch at a nearby local cafe. Spend the afternoon exploring authentic artisan shops and open-air markets in the town center.`,
        evening: `Wind down with sunset views from your balcony or patio. Dine at a top-rated regional restaurant sampling seasonal specialties.`,
        localTip:
          'Ask your host for their personal favorite breakfast spot within walking distance.',
      },
      {
        dayNumber: 2,
        title: 'Signature Sights & Nature',
        morning: `Start early with fresh mountain or coastal air. Head out to visit the area’s most renowned landmark or panoramic lookout point.`,
        afternoon: `Pack a picnic or find a hillside terrace. Spend the midday hours immersed in nature trails, heritage architecture, or cultural museums.`,
        evening: `Return to your retreat for some quiet downtime. Enjoy an intimate dinner or campfire evening under the stars.`,
        localTip:
          'Carry cash and a reusable water bottle, as small local viewpoints may have limited card readers.',
      },
      {
        dayNumber: 3,
        title: 'Leisure, Culture & Farewell',
        morning: `Enjoy a slow, leisurely breakfast at your stay. Savor quiet moments reading, meditating, or sipping artisanal coffee.`,
        afternoon: `Pick up curated souvenirs, handcrafted tea, spices, or textiles from local cooperative markets before your journey home.`,
        evening: `Celebrate the final night of your getaway with a memorable dining experience featuring live acoustic music or scenic night views.`,
        localTip:
          'Check out local bakery timings early in the morning for the freshest baked goods.',
      },
      {
        dayNumber: 4,
        title: 'Hidden Trails & Off-the-Beaten-Path',
        morning: `Venture beyond the popular tourist hubs towards quiet neighboring hamlets or secluded nature reserves.`,
        afternoon: `Stop by an organic farm or village workshop to witness traditional craft-making firsthand.`,
        evening: `A relaxed evening back at your stay, enjoying home-cooked comfort food or room service.`,
        localTip:
          'Hire a registered local guide for secluded trails to discover hidden waterfalls or viewpoints.',
      },
      {
        dayNumber: 5,
        title: 'Wellness & Complete Relaxation',
        morning: `Dedicate the day to rejuvenation: an outdoor yoga session or tranquil spa treatment.`,
        afternoon: `Lounge beside the pool or garden with your favorite book and refreshing beverages.`,
        evening: `Dine outdoors under candlelight, taking in the tranquil nighttime ambiance of ${city}.`,
        localTip: 'Book spa appointments at least 24 hours in advance during peak travel seasons.',
      },
      {
        dayNumber: 6,
        title: 'Culinary Journey & Wine/Tea Tasting',
        morning: `Take a guided food walk or visit a local tea/coffee plantation or heritage vineyard.`,
        afternoon: `Participate in a cooking demonstration or masterclass learning how to prepare authentic regional dishes.`,
        evening: `A multi-course tasting dinner celebrating the fresh farm-to-table flavors of ${city}.`,
        localTip: 'Ask the chefs which seasonal ingredients are at their peak this month.',
      },
      {
        dayNumber: 7,
        title: 'Grand Finale & Sunset Memories',
        morning: `Capture final sunrise photographs and enjoy a lavish farewell brunch.`,
        afternoon: `Take one last scenic drive or boat ride soaking in the memorable landscape.`,
        evening: `Toast to an unforgettable trip with panoramic evening vistas and warm memories.`,
        localTip: 'Keep your camera charged for twilight golden hour.',
      },
    ];

    return dayTemplates.slice(0, days);
  }
}
