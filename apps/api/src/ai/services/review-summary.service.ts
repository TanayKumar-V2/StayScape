import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PropertyModerationStatus, PropertyStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { GroqService } from './groq.service';

export interface ReviewSummaryHighlight {
  topic: string;
  summary: string;
}

export interface ReviewSummaryConcern {
  topic: string;
  summary: string;
}

export type ReviewSentiment = 'POSITIVE' | 'MIXED' | 'NEGATIVE' | 'INSUFFICIENT_DATA';

export interface ReviewSummarySuccessResponse {
  available: true;
  headline: string;
  overallSentiment: ReviewSentiment;
  highlights: ReviewSummaryHighlight[];
  concerns: ReviewSummaryConcern[];
  reviewCount: number;
  generatedAt: string;
}

export interface ReviewSummaryUnavailableResponse {
  available: false;
  reason: 'INSUFFICIENT_REVIEWS' | 'PROPERTY_NOT_FOUND' | 'SERVICE_UNAVAILABLE';
  message: string;
  reviewCount?: number;
}

export type ReviewSummaryResponse = ReviewSummarySuccessResponse | ReviewSummaryUnavailableResponse;

interface GroqSummaryOutput {
  headline?: string;
  overallSentiment?: string;
  highlights?: Array<{ topic: string; summary: string }>;
  concerns?: Array<{ topic: string; summary: string }>;
}

@Injectable()
export class ReviewSummaryService {
  private readonly logger = new Logger(ReviewSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly groqService: GroqService,
  ) {}

  /**
   * Generates or fetches cached AI summary of genuine published guest reviews.
   */
  async getReviewSummary(slug: string): Promise<ReviewSummaryResponse> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: { id: true, title: true, slug: true, status: true, moderationStatus: true },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED
    ) {
      throw new NotFoundException(`Property "${slug}" was not found or is not published.`);
    }

    // 1. Fetch latest published reviews (up to 50)
    const reviews = await this.prisma.review.findMany({
      where: {
        propertyId: property.id,
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        overallRating: true,
        cleanlinessRating: true,
        accuracyRating: true,
        checkInRating: true,
        communicationRating: true,
        locationRating: true,
        valueRating: true,
        title: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 2. Minimum review threshold (at least 3)
    if (reviews.length < 3) {
      return {
        available: false,
        reason: 'INSUFFICIENT_REVIEWS',
        message: 'A few more guest reviews are needed before we can generate a useful summary.',
        reviewCount: reviews.length,
      };
    }

    // 3. Cache check
    const latestReviewTimestamp = reviews[0]?.updatedAt ? reviews[0].updatedAt.getTime() : 0;
    const cacheKey = `cache:review-summary:${slug}:${latestReviewTimestamp}:${this.groqService.getModel()}`;

    try {
      const client = this.redisService.getClient();
      if (client) {
        const cached = await client.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as ReviewSummarySuccessResponse;
        }
      }
    } catch {
      // Redis degradation
    }

    // 4. Fallback if Groq unavailable
    if (!this.groqService.isAvailable()) {
      return this.generateDeterministicSummary(property.title, reviews);
    }

    // 5. Build grounded, PII-stripped prompt
    const reviewDataText = reviews
      .map((r, i) => {
        const titleText = r.title ? `"${r.title}" — ` : '';
        const ratingCategories = [
          r.cleanlinessRating ? `Cleanliness: ${r.cleanlinessRating}/5` : null,
          r.accuracyRating ? `Accuracy: ${r.accuracyRating}/5` : null,
          r.checkInRating ? `Check-in: ${r.checkInRating}/5` : null,
          r.communicationRating ? `Communication: ${r.communicationRating}/5` : null,
          r.locationRating ? `Location: ${r.locationRating}/5` : null,
          r.valueRating ? `Value: ${r.valueRating}/5` : null,
        ]
          .filter(Boolean)
          .join(', ');

        return `Review #${i + 1} (${r.overallRating}/5 stars) ${ratingCategories ? `[${ratingCategories}]` : ''}:\n${titleText}${r.comment}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert hospitality analyst specializing in truthful, grounded review summarization for StayScape.
Your role is to summarize genuine guest experiences for the listing "${property.title}".

CRITICAL INSTRUCTIONS:
- You must strictly base all highlights, concerns, and sentiments on the supplied review text.
- Do NOT hallucinate amenities, recurring complaints, or experiences that are not explicitly stated in the reviews.
- Do NOT calculate numerical averages. All averages are computed separately by PostgreSQL.
- Distinguish between common patterns ("Several guests noted...") and isolated mentions ("One guest mentioned...").
- Allowed overallSentiment values: "POSITIVE", "MIXED", "NEGATIVE", "INSUFFICIENT_DATA".
- If no notable concerns were raised, return an empty array for concerns.

Respond ONLY with a valid JSON object matching this schema:
{
  "headline": "A 1-2 sentence overall verdict summarizing how guests feel about this stay.",
  "overallSentiment": "POSITIVE | MIXED | NEGATIVE",
  "highlights": [
    { "topic": "Short Topic Name (e.g. Cleanliness, Mountain Views, Host Hospitality)", "summary": "Clear, grounded sentence summarizing what guests liked." }
  ],
  "concerns": [
    { "topic": "Short Topic Name (e.g. Check-in Delay, Wi-Fi speed)", "summary": "Clear, objective sentence summarizing the concern." }
  ]
}`;

    try {
      const parsed = await this.groqService.createJsonCompletion<GroqSummaryOutput>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here are the genuine guest reviews for "${property.title}":\n\n${reviewDataText}` },
        ],
        temperature: 0.2,
      });

      if (!parsed || !parsed.headline) {
        return this.generateDeterministicSummary(property.title, reviews);
      }

      const sentiment: ReviewSentiment = ['POSITIVE', 'MIXED', 'NEGATIVE', 'INSUFFICIENT_DATA'].includes(
        parsed.overallSentiment?.toUpperCase() || '',
      )
        ? (parsed.overallSentiment?.toUpperCase() as ReviewSentiment)
        : 'POSITIVE';

      const response: ReviewSummarySuccessResponse = {
        available: true,
        headline: parsed.headline.trim(),
        overallSentiment: sentiment,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 3) : [],
        reviewCount: reviews.length,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 30 minutes in Redis
      try {
        const client = this.redisService.getClient();
        if (client) {
          await client.set(cacheKey, JSON.stringify(response), 'EX', 1800);
        }
      } catch {
        // Redis cache degradation
      }

      return response;
    } catch (err: unknown) {
      this.logger.warn(`Groq review summary failed: ${err instanceof Error ? err.message : String(err)}. Using deterministic fallback.`);
      return this.generateDeterministicSummary(property.title, reviews);
    }
  }

  /**
   * Deterministic grounded summary when Groq is unconfigured, disabled, or fails.
   */
  private generateDeterministicSummary(
    propertyTitle: string,
    reviews: Array<{ overallRating: number; comment: string; cleanlinessRating: number | null; locationRating: number | null }>,
  ): ReviewSummarySuccessResponse {
    const total = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.overallRating, 0) / total;

    let sentiment: ReviewSentiment = 'POSITIVE';
    if (avg < 3.0) {
      sentiment = 'NEGATIVE';
    } else if (avg < 4.2) {
      sentiment = 'MIXED';
    }

    const highlights: ReviewSummaryHighlight[] = [];
    const concerns: ReviewSummaryConcern[] = [];

    const positiveReviews = reviews.filter((r) => r.overallRating >= 4);
    if (positiveReviews.length > 0) {
      highlights.push({
        topic: 'Overall Guest Satisfaction',
        summary: `Guests consistently enjoyed their stay at ${propertyTitle}, with ${positiveReviews.length} out of ${total} ratings being 4 or 5 stars.`,
      });
    }

    const avgClean = reviews.filter((r) => r.cleanlinessRating !== null);
    if (avgClean.length > 0) {
      const cleanAvg = avgClean.reduce((s, r) => s + (r.cleanlinessRating ?? 0), 0) / avgClean.length;
      if (cleanAvg >= 4.0) {
        highlights.push({
          topic: 'Cleanliness',
          summary: 'Multiple guests highlighted the clean and well-kept accommodations.',
        });
      }
    }

    const lowerReviews = reviews.filter((r) => r.overallRating <= 2);
    if (lowerReviews.length > 0) {
      concerns.push({
        topic: 'Mixed Experiences',
        summary: `${lowerReviews.length} guest(s) reported aspects of their stay that did not meet expectations.`,
      });
    }

    return {
      available: true,
      headline: `Guests generally report a ${sentiment.toLowerCase()} experience at ${propertyTitle}.`,
      overallSentiment: sentiment,
      highlights,
      concerns,
      reviewCount: total,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Invalidates cached review summaries for a property across all timestamps/models.
   */
  async invalidateSummaryCache(slug: string): Promise<void> {
    try {
      // SCAN-based so invalidation never blocks Redis on large keyspaces.
      await this.redisService.scanAndDelete(`cache:review-summary:${slug}:*`);
    } catch (err: unknown) {
      this.logger.warn(`Failed to invalidate review summary cache for ${slug}: ${String(err)}`);
    }
  }
}
