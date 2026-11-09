import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ComparePropertiesDto {
  @ApiProperty({
    description: 'Slugs of properties to compare (min 2, max 3)',
    example: ['the-alpine-hideaway-manali', 'sol-de-goa-beach-villa'],
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Comparison requires at least 2 properties' })
  @ArrayMaxSize(3, { message: 'Comparison can compare at most 3 properties' })
  @IsString({ each: true })
  propertySlugs!: string[];
}

export interface ComparisonPropertyFact {
  slug: string;
  title: string;
  propertyType: string;
  city: string;
  state: string;
  pricePerNightPaise: number;
  cleaningFeePaise: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  checkInFrom: string | null;
  checkOutUntil: string | null;
  coverImage: string | null;
  amenityNames: string[];
  houseRules: string[];
}

export interface ComparisonMatrix {
  commonAmenities: string[];
  exclusiveAmenities: Record<string, string[]>;
  priceDifferencePaise: number | null;
  capacityDifference: number | null;
}

export class PropertyComparisonResponseDto {
  @ApiProperty({ isArray: true })
  properties!: ComparisonPropertyFact[];

  @ApiProperty()
  matrix!: ComparisonMatrix;

  @ApiProperty({ description: 'AI comparative summary' })
  aiSummary!: string;

  @ApiProperty({ description: 'Target traveler recommendation per property slug' })
  bestFor!: Record<string, string>;

  @ApiProperty({ isArray: true, description: 'Standout factual differences between properties' })
  keyDifferences!: string[];

  @ApiProperty({ description: 'Whether basic deterministic matrix fallback was used' })
  fallbackUsed!: boolean;
}

