import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchPropertiesDto {
  @ApiPropertyOptional({
    description: 'Free-text search query across title, description, city, state, and country',
    example: 'mountain cabin',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @ApiPropertyOptional({
    description: 'Destination search matching city, state, or country case-insensitively',
    example: 'Manali',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  destination?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated property types (e.g. CABIN,VILLA,HOMESTAY)',
    example: 'CABIN,VILLA',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').join(',').trim()
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  propertyTypes?: string;

  @ApiPropertyOptional({
    description: 'Minimum nightly price in integer paise (e.g. 100000 = ₹1,000)',
    minimum: 0,
    example: 100000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minPricePaise?: number;

  @ApiPropertyOptional({
    description: 'Maximum nightly price in integer paise (e.g. 1000000 = ₹10,000)',
    minimum: 0,
    example: 1000000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxPricePaise?: number;

  @ApiPropertyOptional({
    description: 'Minimum guest capacity',
    minimum: 1,
    maximum: 50,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  guests?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    minimum: 0,
    maximum: 50,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bathrooms',
    minimum: 1,
    maximum: 50,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Comma-separated amenity slugs (e.g. wifi,kitchen,infinity-pool)',
    example: 'high-speed-wifi,mountain-view',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  amenities?: string;

  @ApiPropertyOptional({ description: 'Filter by city', example: 'Manali' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by state', example: 'Himachal Pradesh' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by country', example: 'India' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  country?: string;

  @ApiPropertyOptional({
    description: 'Sort ordering',
    enum: ['newest', 'price_asc', 'price_desc'],
    default: 'newest',
  })
  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc'])
  sort?: 'newest' | 'price_asc' | 'price_desc' = 'newest';

  // ── Geographic Map Bounds ──────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Minimum latitude (-90 to 90)', example: 31.0 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  minLat?: number;

  @ApiPropertyOptional({ description: 'Maximum latitude (-90 to 90)', example: 33.0 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  maxLat?: number;

  @ApiPropertyOptional({ description: 'Minimum longitude (-180 to 180)', example: 76.0 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  minLng?: number;

  @ApiPropertyOptional({ description: 'Maximum longitude (-180 to 180)', example: 78.0 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  maxLng?: number;

  // ── Pagination ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 12, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 12;
}
