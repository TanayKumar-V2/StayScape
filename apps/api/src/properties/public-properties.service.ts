import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostStatus, Prisma, PropertyModerationStatus, PropertyStatus, PropertyType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { PUBLIC_PROPERTY_WHERE } from './public-property-filter';
import {
  PublicPropertyDetail,
  PublicPropertySummary,
  RawPropertyRecord,
  serializePublicPropertyDetail,
  serializePublicPropertySummary,
} from './serializers/public-property.serializer';

export interface DestinationSummary {
  city: string;
  state: string;
  country: string;
  propertyCount: number;
  coverImage: string | null;
  slug: string;
}

export interface PaginatedPublicResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class PublicPropertiesService {
  private readonly logger = new Logger(PublicPropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ── Cache Helpers ──────────────────────────────────────────────────────────

  private async getCacheVersion(): Promise<string> {
    try {
      const version = await this.redisService.get('cache:properties:version');
      if (!version) {
        await this.redisService.set('cache:properties:version', '1');
        return '1';
      }
      return version;
    } catch {
      return '1';
    }
  }

  async invalidateCache(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (client) {
        await client.incr('cache:properties:version');
        this.logger.log('Public properties cache invalidated (version incremented)');
      }
    } catch (err) {
      this.logger.warn('Failed to invalidate Redis properties cache:', err);
    }
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisService.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async setInCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // Graceful degradation when Redis is offline
    }
  }

  // ── Public Search & Discovery ──────────────────────────────────────────────

  async search(dto: SearchPropertiesDto): Promise<PaginatedPublicResponse<PublicPropertySummary>> {
    // 1. Validation
    if (
      dto.minPricePaise !== undefined &&
      dto.maxPricePaise !== undefined &&
      dto.minPricePaise > dto.maxPricePaise
    ) {
      throw new BadRequestException('minPricePaise cannot exceed maxPricePaise');
    }

    const hasAnyBound =
      dto.minLat !== undefined ||
      dto.maxLat !== undefined ||
      dto.minLng !== undefined ||
      dto.maxLng !== undefined;
    const hasAllBounds =
      dto.minLat !== undefined &&
      dto.maxLat !== undefined &&
      dto.minLng !== undefined &&
      dto.maxLng !== undefined;

    if (hasAnyBound && !hasAllBounds) {
      throw new BadRequestException(
        'Map bounding box requires all 4 parameters: minLat, maxLat, minLng, maxLng',
      );
    }

    if (hasAllBounds) {
      if (dto.minLat! > dto.maxLat!) {
        throw new BadRequestException('minLat cannot exceed maxLat');
      }
      if (dto.minLng! > dto.maxLng!) {
        throw new BadRequestException('minLng cannot exceed maxLng');
      }
    }

    // Parse property types
    let parsedTypes: PropertyType[] | undefined;
    if (dto.propertyTypes) {
      const splitTypes = dto.propertyTypes
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const validEnums = Object.values(PropertyType);
      const legacyAliases: Record<string, PropertyType[]> = {
        CHALET: [PropertyType.CABIN],
        COTTAGE: [PropertyType.HOUSE],
        FARM_STAY: [PropertyType.HOUSE, PropertyType.HOMESTAY],
        RESORT: [PropertyType.HOTEL],
      };
      parsedTypes = [];
      for (const t of splitTypes) {
        const aliases = legacyAliases[t];
        if (aliases) {
          parsedTypes.push(...aliases);
        } else if (validEnums.includes(t as PropertyType)) {
          parsedTypes.push(t as PropertyType);
        } else {
          throw new BadRequestException(`Invalid propertyType: ${t}`);
        }
      }
      parsedTypes = [...new Set(parsedTypes)];
    }

    // Parse amenities
    let parsedAmenitySlugs: string[] | undefined;
    if (dto.amenities) {
      parsedAmenitySlugs = dto.amenities
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }

    // 2. Cache key generation
    const cacheVersion = await this.getCacheVersion();
    const normalizedKeySource = JSON.stringify({
      q: dto.q?.toLowerCase(),
      destination: dto.destination?.toLowerCase(),
      propertyTypes: parsedTypes?.sort(),
      minPricePaise: dto.minPricePaise,
      maxPricePaise: dto.maxPricePaise,
      guests: dto.guests,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      amenities: parsedAmenitySlugs?.sort(),
      city: dto.city?.toLowerCase(),
      state: dto.state?.toLowerCase(),
      country: dto.country?.toLowerCase(),
      sort: dto.sort ?? 'newest',
      minLat: dto.minLat,
      maxLat: dto.maxLat,
      minLng: dto.minLng,
      maxLng: dto.maxLng,
      page: dto.page ?? 1,
      limit: dto.limit ?? 12,
    });
    const keyHash = createHash('md5').update(normalizedKeySource).digest('hex');
    const cacheKey = `cache:properties:search:v${cacheVersion}:${keyHash}`;

    // 3. Attempt cache hit
    const cached =
      await this.getFromCache<PaginatedPublicResponse<PublicPropertySummary>>(cacheKey);
    if (cached) {
      return cached;
    }

    // 4. Build Prisma Query
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(50, Math.max(1, dto.limit ?? 12));
    const skip = (page - 1) * limit;

    const andConditions: Prisma.PropertyWhereInput[] = [
      PUBLIC_PROPERTY_WHERE,
    ];

    if (dto.q) {
      andConditions.push({
        OR: [
          { title: { contains: dto.q, mode: 'insensitive' } },
          { description: { contains: dto.q, mode: 'insensitive' } },
          { city: { contains: dto.q, mode: 'insensitive' } },
          { state: { contains: dto.q, mode: 'insensitive' } },
          { country: { contains: dto.q, mode: 'insensitive' } },
        ],
      });
    }

    if (dto.destination) {
      andConditions.push({
        OR: [
          { city: { contains: dto.destination, mode: 'insensitive' } },
          { state: { contains: dto.destination, mode: 'insensitive' } },
          { country: { contains: dto.destination, mode: 'insensitive' } },
        ],
      });
    }

    if (parsedTypes && parsedTypes.length > 0) {
      andConditions.push({ propertyType: { in: parsedTypes } });
    }

    if (dto.minPricePaise !== undefined || dto.maxPricePaise !== undefined) {
      andConditions.push({
        pricePerNightPaise: {
          ...(dto.minPricePaise !== undefined ? { gte: dto.minPricePaise } : {}),
          ...(dto.maxPricePaise !== undefined ? { lte: dto.maxPricePaise } : {}),
        },
      });
    }

    if (dto.guests !== undefined) {
      andConditions.push({ maxGuests: { gte: dto.guests } });
    }

    if (dto.bedrooms !== undefined) {
      andConditions.push({ bedrooms: { gte: dto.bedrooms } });
    }

    if (dto.bathrooms !== undefined) {
      andConditions.push({ bathrooms: { gte: dto.bathrooms } });
    }

    if (dto.city) {
      andConditions.push({ city: { equals: dto.city, mode: 'insensitive' } });
    }

    if (dto.state) {
      andConditions.push({ state: { equals: dto.state, mode: 'insensitive' } });
    }

    if (dto.country) {
      andConditions.push({ country: { equals: dto.country, mode: 'insensitive' } });
    }

    if (hasAllBounds) {
      andConditions.push({
        latitude: {
          gte: new Prisma.Decimal(dto.minLat!),
          lte: new Prisma.Decimal(dto.maxLat!),
        },
        longitude: {
          gte: new Prisma.Decimal(dto.minLng!),
          lte: new Prisma.Decimal(dto.maxLng!),
        },
      });
    }

    // Property must satisfy ALL selected amenity requirements
    if (parsedAmenitySlugs && parsedAmenitySlugs.length > 0) {
      for (const slug of parsedAmenitySlugs) {
        andConditions.push({
          amenities: {
            some: {
              amenity: {
                slug: { equals: slug, mode: 'insensitive' },
              },
            },
          },
        });
      }
    }

    const where: Prisma.PropertyWhereInput = { AND: andConditions };

    // Sorting
    let orderBy: Prisma.PropertyOrderByWithRelationInput;
    switch (dto.sort) {
      case 'price_asc':
        orderBy = { pricePerNightPaise: 'asc' };
        break;
      case 'price_desc':
        orderBy = { pricePerNightPaise: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { publishedAt: 'desc' };
        break;
    }

    // Execute count and query in parallel
    const [total, records] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          },
          amenities: {
            include: {
              amenity: true,
            },
          },
          hostProfile: {
            select: {
              displayName: true,
              bio: true,
            },
          },
        },
      }),
    ]);

    // Batch aggregate reviews to avoid N+1 queries
    const propertyIds = records.map((r) => r.id);
    const reviewStatsMap = await this.getPropertiesReviewStats(propertyIds);

    const totalPages = Math.ceil(total / limit) || 1;
    const serializedData = records.map((r) => {
      const stats = reviewStatsMap.get(r.id) ?? { averageRating: null, reviewCount: 0 };
      return serializePublicPropertySummary(r as unknown as RawPropertyRecord, stats);
    });

    const result: PaginatedPublicResponse<PublicPropertySummary> = {
      data: serializedData,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    // Cache search result for 60 seconds
    await this.setInCache(cacheKey, result, 60);

    return result;
  }

  // ── Public Single Property Detail ──────────────────────────────────────────

  async getBySlug(slug: string): Promise<PublicPropertyDetail> {
    const cacheVersion = await this.getCacheVersion();
    const cacheKey = `cache:properties:detail:v${cacheVersion}:${slug.toLowerCase()}`;

    const cached = await this.getFromCache<PublicPropertyDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        hostProfile: {
          select: {
            displayName: true,
            bio: true,
            status: true,
          },
        },
      },
    });

    if (
      !property ||
      property.status !== PropertyStatus.PUBLISHED ||
      property.moderationStatus !== PropertyModerationStatus.APPROVED ||
      property.hostProfile?.status !== HostStatus.ACTIVE
    ) {
      throw new NotFoundException(`Property listing '${slug}' not found`);
    }

    const reviewStatsMap = await this.getPropertiesReviewStats([property.id]);
    const stats = reviewStatsMap.get(property.id) ?? { averageRating: null, reviewCount: 0 };

    const serialized = serializePublicPropertyDetail(property, stats);

    // Cache detail for 120 seconds
    await this.setInCache(cacheKey, serialized, 120);

    return serialized;
  }

  /**
   * Batch aggregates rating and review counts for property IDs in a single query.
   */
  async getPropertiesReviewStats(
    propertyIds: string[],
  ): Promise<Map<string, { averageRating: number | null; reviewCount: number }>> {
    const map = new Map<string, { averageRating: number | null; reviewCount: number }>();
    if (!propertyIds || propertyIds.length === 0) {
      return map;
    }

    try {
      const stats = await this.prisma.review.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          status: 'PUBLISHED',
        },
        _avg: {
          overallRating: true,
        },
        _count: {
          id: true,
        },
      });

      for (const s of stats) {
        map.set(s.propertyId, {
          averageRating: s._avg.overallRating ? Number(s._avg.overallRating.toFixed(1)) : null,
          reviewCount: s._count.id,
        });
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to aggregate review stats: ${err instanceof Error ? err.message : String(err)}`);
    }

    return map;
  }

  // ── Public Destinations Aggregation ────────────────────────────────────────

  async getDestinations(limit = 10): Promise<{ data: DestinationSummary[] }> {
    const effectiveLimit = Math.min(30, Math.max(1, limit));
    const cacheVersion = await this.getCacheVersion();
    const cacheKey = `cache:properties:destinations:v${cacheVersion}:${effectiveLimit}`;

    const cached = await this.getFromCache<{ data: DestinationSummary[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query published properties to aggregate destinations
    const published = await this.prisma.property.findMany({
      where: PUBLIC_PROPERTY_WHERE,
      select: {
        city: true,
        state: true,
        country: true,
        publishedAt: true,
        images: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { secureUrl: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    // Group by normalized city + state + country
    const destinationMap = new Map<string, DestinationSummary>();

    for (const prop of published) {
      const cityClean = prop.city.trim();
      const stateClean = prop.state.trim();
      const countryClean = prop.country.trim();
      const key = `${cityClean.toLowerCase()}_${stateClean.toLowerCase()}`;

      if (!destinationMap.has(key)) {
        destinationMap.set(key, {
          city: cityClean,
          state: stateClean,
          country: countryClean,
          propertyCount: 1,
          coverImage: prop.images[0]?.secureUrl ?? null,
          slug: cityClean.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        });
      } else {
        const existing = destinationMap.get(key)!;
        existing.propertyCount += 1;
        if (!existing.coverImage && prop.images[0]?.secureUrl) {
          existing.coverImage = prop.images[0].secureUrl;
        }
      }
    }

    const destinations = Array.from(destinationMap.values())
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, effectiveLimit);

    const result = { data: destinations };

    // Cache destination aggregation for 300 seconds (5 minutes)
    await this.setInCache(cacheKey, result, 300);

    return result;
  }
}
