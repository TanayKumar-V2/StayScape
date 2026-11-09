import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, Property, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${base || 'property'}-${rand}`;
}

export interface PaginatedProperties<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  private async invalidatePublicCache(): Promise<void> {
    try {
      const client = this.redisService?.getClient();
      if (client) {
        await client.incr('cache:properties:version');
      }
    } catch {
      // Graceful fallback if Redis is offline
    }
  }

  async create(hostProfileId: string, dto: CreatePropertyDto): Promise<Property> {
    const slug = slugify(dto.title);

    // Verify amenities exist if provided
    if (dto.amenityIds && dto.amenityIds.length > 0) {
      const count = await this.prisma.amenity.count({
        where: { id: { in: dto.amenityIds } },
      });
      if (count !== dto.amenityIds.length) {
        throw new BadRequestException('One or more selected amenity IDs do not exist');
      }
    }

    return this.prisma.property.create({
      data: {
        hostProfileId,
        slug,
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType,
        status: PropertyStatus.DRAFT,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
        maxGuests: dto.maxGuests,
        bedrooms: dto.bedrooms,
        beds: dto.beds,
        bathrooms: dto.bathrooms,
        pricePerNightPaise: dto.pricePerNightPaise,
        cleaningFeePaise: dto.cleaningFeePaise ?? 0,
        currency: 'INR',
        houseRules: dto.houseRules ?? [],
        checkInFrom: dto.checkInFrom ?? null,
        checkOutUntil: dto.checkOutUntil ?? null,
        ...(dto.amenityIds && dto.amenityIds.length > 0
          ? {
              amenities: {
                create: dto.amenityIds.map((amenityId) => ({ amenityId })),
              },
            }
          : {}),
      },
      include: {
        images: true,
        amenities: {
          include: { amenity: true },
        },
      },
    });
  }

  async findAllForHost(
    hostProfileId: string,
    query: PropertyQueryDto,
  ): Promise<PaginatedProperties<unknown>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      hostProfileId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { state: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          },
          _count: {
            select: { amenities: true, images: true },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneForHost(hostProfileId: string, propertyId: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: { amenity: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property listing not found');
    }

    if (property.hostProfileId !== hostProfileId) {
      throw new ForbiddenException('You do not have access to this property listing');
    }

    return property;
  }

  async update(
    hostProfileId: string,
    propertyId: string,
    dto: UpdatePropertyDto,
  ): Promise<Property> {
    const existing = await this.findOneForHost(hostProfileId, propertyId);

    if (existing.status === PropertyStatus.ARCHIVED) {
      throw new BadRequestException('Archived properties cannot be modified');
    }

    // Verify amenities exist if provided
    if (dto.amenityIds) {
      if (dto.amenityIds.length > 0) {
        const count = await this.prisma.amenity.count({
          where: { id: { in: dto.amenityIds } },
        });
        if (count !== dto.amenityIds.length) {
          throw new BadRequestException('One or more selected amenity IDs do not exist');
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.amenityIds !== undefined) {
        // Replace existing amenities
        await tx.propertyAmenity.deleteMany({
          where: { propertyId },
        });

        if (dto.amenityIds.length > 0) {
          await tx.propertyAmenity.createMany({
            data: dto.amenityIds.map((amenityId) => ({
              propertyId,
              amenityId,
            })),
          });
        }
      }

      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.propertyType !== undefined && { propertyType: dto.propertyType }),
          ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
          ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.country !== undefined && { country: dto.country }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
          ...(dto.latitude !== undefined && {
            latitude: dto.latitude !== null ? new Prisma.Decimal(dto.latitude) : null,
          }),
          ...(dto.longitude !== undefined && {
            longitude: dto.longitude !== null ? new Prisma.Decimal(dto.longitude) : null,
          }),
          ...(dto.maxGuests !== undefined && { maxGuests: dto.maxGuests }),
          ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
          ...(dto.beds !== undefined && { beds: dto.beds }),
          ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
          ...(dto.pricePerNightPaise !== undefined && {
            pricePerNightPaise: dto.pricePerNightPaise,
          }),
          ...(dto.cleaningFeePaise !== undefined && {
            cleaningFeePaise: dto.cleaningFeePaise,
          }),
          ...(dto.houseRules !== undefined && { houseRules: dto.houseRules }),
          ...(dto.checkInFrom !== undefined && { checkInFrom: dto.checkInFrom }),
          ...(dto.checkOutUntil !== undefined && { checkOutUntil: dto.checkOutUntil }),
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

      if (existing.status === PropertyStatus.PUBLISHED) {
        await this.invalidatePublicCache();
      }

      return updated;
    });
  }

  async publish(hostProfileId: string, propertyId: string): Promise<Property> {
    const property = await this.findOneForHost(hostProfileId, propertyId);

    if (property.status === PropertyStatus.ARCHIVED) {
      throw new BadRequestException('Archived properties cannot be published');
    }

    const missingRequirements: string[] = [];

    if (!property.title || property.title.trim().length < 5) {
      missingRequirements.push('Title must be at least 5 characters');
    }

    if (!property.description || property.description.trim().length < 20) {
      missingRequirements.push('Description must be at least 20 characters');
    }

    if (
      !property.addressLine1 ||
      !property.city ||
      !property.state ||
      !property.country ||
      !property.postalCode
    ) {
      missingRequirements.push(
        'Complete physical location (street address, city, state, country, postal code) is required',
      );
    }

    if (property.maxGuests < 1) {
      missingRequirements.push('Max guests must be at least 1');
    }

    if (property.beds < 1) {
      missingRequirements.push('Property must offer at least 1 bed');
    }

    if (property.bathrooms < 1) {
      missingRequirements.push('Property must offer at least 1 bathroom');
    }

    if (property.pricePerNightPaise < 10000) {
      missingRequirements.push('Nightly price must be at least ₹100');
    }

    const images = (property as Property & { images: Array<{ isCover: boolean }> }).images ?? [];
    if (images.length < 5) {
      missingRequirements.push(
        `At least 5 photographs are required to publish (currently ${images.length})`,
      );
    }

    if (!images.some((img) => img.isCover)) {
      missingRequirements.push('A cover photo must be designated');
    }

    const amenities = (property as Property & { amenities: unknown[] }).amenities ?? [];
    if (amenities.length < 1) {
      missingRequirements.push('Select at least one amenity');
    }

    if (missingRequirements.length > 0) {
      throw new BadRequestException({
        message: 'Listing does not satisfy publishing requirements',
        missingRequirements,
      });
    }

    const published = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        status: PropertyStatus.PUBLISHED,
        publishedAt: property.publishedAt ?? new Date(),
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    await this.invalidatePublicCache();
    return published;
  }

  async pause(hostProfileId: string, propertyId: string): Promise<Property> {
    const property = await this.findOneForHost(hostProfileId, propertyId);

    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Only published listings can be paused');
    }

    const paused = await this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.PAUSED },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    await this.invalidatePublicCache();
    return paused;
  }

  async unpause(hostProfileId: string, propertyId: string): Promise<Property> {
    const property = await this.findOneForHost(hostProfileId, propertyId);

    if (property.status !== PropertyStatus.PAUSED) {
      throw new BadRequestException('Only paused listings can be unpaused');
    }

    return this.publish(hostProfileId, propertyId);
  }

  async archive(hostProfileId: string, propertyId: string): Promise<Property> {
    const existing = await this.findOneForHost(hostProfileId, propertyId);

    const archived = await this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.ARCHIVED },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    if (existing.status === PropertyStatus.PUBLISHED) {
      await this.invalidatePublicCache();
    }

    return archived;
  }
}
