import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'The unique booking reference for the completed stay', example: 'STY-2026-A1B2C3' })
  @IsString()
  @IsNotEmpty()
  bookingReference!: string;

  @ApiProperty({ description: 'Overall rating between 1 and 5', example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiPropertyOptional({ description: 'Cleanliness rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({ description: 'Accuracy rating (1-5)', example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @ApiPropertyOptional({ description: 'Check-in experience rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  checkInRating?: number;

  @ApiPropertyOptional({ description: 'Host communication rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ description: 'Location rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  locationRating?: number;

  @ApiPropertyOptional({ description: 'Value for money rating (1-5)', example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  valueRating?: number;

  @ApiPropertyOptional({ description: 'Headline title for the review', example: 'Wonderful mountain escape', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: 'Detailed guest review comment', example: 'The villa was immaculately clean with stunning mountain views. Host was responsive.', minLength: 20, maxLength: 2000 })
  @IsString()
  @MinLength(20, { message: 'Comment must be at least 20 characters long.' })
  @MaxLength(2000, { message: 'Comment cannot exceed 2000 characters.' })
  comment!: string;
}
