import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class ExtractedBudgetDto {
  @ApiPropertyOptional({ description: 'Minimum price in integer paise' })
  @IsOptional()
  @IsNumber()
  minPaise?: number | null;

  @ApiPropertyOptional({ description: 'Maximum price in integer paise' })
  @IsOptional()
  @IsNumber()
  maxPaise?: number | null;

  @ApiProperty({ enum: ['PER_NIGHT', 'TOTAL_STAY'] })
  @IsIn(['PER_NIGHT', 'TOTAL_STAY'])
  scope!: 'PER_NIGHT' | 'TOTAL_STAY';
}

export class ExtractedGuestsDto {
  @ApiProperty({ description: 'Number of adult guests', default: 1 })
  @IsInt()
  @Min(1)
  adults!: number;

  @ApiPropertyOptional({ description: 'Number of child guests', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @ApiProperty({ description: 'Total guest count', default: 1 })
  @IsInt()
  @Min(1)
  total!: number;
}

export class ExtractedPreferencesDto {
  @ApiPropertyOptional({ description: 'Target destination (city, state, or country)' })
  @IsOptional()
  @IsString()
  destination?: string | null;

  @ApiPropertyOptional({ description: 'Target check-in date in YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  checkIn?: string | null;

  @ApiPropertyOptional({ description: 'Target check-out date in YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  checkOut?: string | null;

  @ApiPropertyOptional({ description: 'Minimum number of nights' })
  @IsOptional()
  @IsInt()
  minNights?: number | null;

  @ApiPropertyOptional({ type: () => ExtractedBudgetDto })
  @IsOptional()
  @IsObject()
  budget?: ExtractedBudgetDto | null;

  @ApiPropertyOptional({ type: () => ExtractedGuestsDto })
  @IsOptional()
  @IsObject()
  guests?: ExtractedGuestsDto | null;

  @ApiPropertyOptional({ enum: PropertyType, isArray: true })
  @IsOptional()
  @IsArray()
  propertyTypes?: PropertyType[];

  @ApiPropertyOptional({ isArray: true, description: 'Amenity slugs strictly required' })
  @IsOptional()
  @IsArray()
  requiredAmenities?: string[];

  @ApiPropertyOptional({ isArray: true, description: 'Amenity slugs preferred if available' })
  @IsOptional()
  @IsArray()
  preferredAmenities?: string[];

  @ApiPropertyOptional({ isArray: true, description: 'Keywords describing style or vibe' })
  @IsOptional()
  @IsArray()
  stylePreferences?: string[];

  @ApiPropertyOptional({ isArray: true, description: 'Preferences not available in catalogue' })
  @IsOptional()
  @IsArray()
  unresolvedPreferences?: string[];

  @ApiProperty({ enum: ['READY', 'NEEDS_CLARIFICATION', 'UNSUPPORTED'] })
  @IsIn(['READY', 'NEEDS_CLARIFICATION', 'UNSUPPORTED'])
  intentStatus!: 'READY' | 'NEEDS_CLARIFICATION' | 'UNSUPPORTED';

  @ApiPropertyOptional({ description: 'Clarification prompt if ambiguous' })
  @IsOptional()
  @IsString()
  clarificationQuestion?: string | null;

  @ApiProperty({ description: '1-sentence natural summary of understood preferences' })
  @IsString()
  summary!: string;
}

export class StayMatchSearchDto {
  @ApiProperty({
    description: 'Natural language search query expressing travel plans or preferences',
    example:
      'Cozy mountain cabin in Manali with Wi-Fi and fireplace under ₹6,000 for 2 guests next weekend',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(1000)
  query!: string;

  @ApiPropertyOptional({
    description: 'Previous extracted preferences from prior conversational turn for refinement',
    type: () => ExtractedPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  previousPreferences?: ExtractedPreferencesDto;

  @ApiPropertyOptional({
    description: 'IANA timezone for relative date calculation (e.g. Asia/Kolkata)',
    example: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

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
