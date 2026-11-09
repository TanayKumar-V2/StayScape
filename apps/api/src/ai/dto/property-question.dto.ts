import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PropertyQuestionDto {
  @ApiProperty({
    description: 'Question about the property, its amenities, rules, or spaces',
    example: 'Is high-speed Wi-Fi available and is there a quiet workspace for video calls?',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(500)
  question!: string;
}

export class PropertyAnswerResponseDto {
  @ApiProperty({ description: 'Property slug' })
  propertySlug!: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle!: string;

  @ApiProperty({ description: 'Grounded factual answer from listing data' })
  answer!: string;

  @ApiProperty({ enum: ['VERIFIED_FACT', 'NOT_MENTIONED', 'POLICY_RESTRICTION'] })
  confidence!: 'VERIFIED_FACT' | 'NOT_MENTIONED' | 'POLICY_RESTRICTION';

  @ApiProperty({ isArray: true, description: 'Verified listing facts used to answer' })
  referencedFacts!: string[];

  @ApiPropertyOptional({ description: 'Whether deterministic fallback was used' })
  fallbackUsed?: boolean;
}

