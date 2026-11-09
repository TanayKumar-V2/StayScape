import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class GenerateItineraryDto {
  @ApiProperty({
    description: 'Slug of the booked or viewed property',
    example: 'the-alpine-hideaway-manali',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  propertySlug!: string;

  @ApiPropertyOptional({
    description: 'Number of itinerary days to generate (1 to 7)',
    default: 3,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  days?: number = 3;

  @ApiPropertyOptional({
    description: 'Preferred trip style (e.g. relaxation, adventure, culinary, family, workation)',
    example: 'relaxation and nature',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tripStyle?: string;

  @ApiPropertyOptional({ description: 'Check-in date (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkIn must be a YYYY-MM-DD date' })
  checkIn?: string;

  @ApiPropertyOptional({ description: 'Check-out date (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkOut must be a YYYY-MM-DD date' })
  checkOut?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  localTip: string;
}

export class ItineraryResponseDto {
  @ApiProperty()
  destination!: string;

  @ApiProperty()
  propertyTitle!: string;

  @ApiProperty()
  propertySlug!: string;

  @ApiProperty()
  tripStyle!: string;

  @ApiProperty()
  totalDays!: number;

  @ApiProperty({ isArray: true })
  days!: ItineraryDay[];

  @ApiProperty({ description: 'Disclaimer regarding AI-generated suggestions' })
  disclaimer!: string;

  @ApiProperty({ description: 'Whether template fallback was used' })
  fallbackUsed!: boolean;
}

