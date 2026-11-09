import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({
    example: 'Secluded Cedar Cabin with Mountain Views',
    minLength: 5,
    maxLength: 120,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @ApiProperty({
    example:
      'Perched on a quiet hillside above Manali, this hand-crafted cedar cabin offers panoramic views of snow-capped peaks, a wood-burning stove, and radiant floor heating.',
    minLength: 20,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.CABIN })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  // ── Location ───────────────────────────────────────────────────────────────
  @ApiProperty({ example: '14 Apple Orchard Lane' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Near Old Vashisht Temple' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  addressLine2?: string;

  @ApiProperty({ example: 'Manali' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city!: string;

  @ApiProperty({ example: 'Himachal Pradesh' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  state!: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  country!: string;

  @ApiProperty({ example: '175103' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  postalCode!: string;

  @ApiPropertyOptional({ example: 32.2396, description: 'Latitude between -90 and 90' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.1887, description: 'Longitude between -180 and 180' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  // ── Capacity ───────────────────────────────────────────────────────────────
  @ApiProperty({ example: 4, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  maxGuests!: number;

  @ApiProperty({ example: 2, minimum: 0, maximum: 50 })
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  bedrooms!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  beds!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  bathrooms!: number;

  // ── Pricing (stored in integer paise) ──────────────────────────────────────
  @ApiProperty({
    example: 650000,
    description: 'Price per night in integer paise (e.g. 650000 = ₹6,500)',
    minimum: 10000,
  })
  @IsInt()
  @Min(10000)
  @Type(() => Number)
  pricePerNightPaise!: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Cleaning fee in integer paise (e.g. 100000 = ₹1,000)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  cleaningFeePaise?: number;

  // ── Rules and timings ──────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: ['No smoking inside', 'Quiet hours after 10 PM', 'Pets allowed on request'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(200, { each: true, message: 'Each house rule cannot exceed 200 characters.' })
  houseRules?: string[];

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkInFrom?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkOutUntil?: string;

  // ── Amenities ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: ['c4f2...-amenity-id-1', 'c4f2...-amenity-id-2'],
    description: 'List of Amenity UUIDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'At most 30 amenities can be attached.' })
  @IsString({ each: true })
  amenityIds?: string[];
}
