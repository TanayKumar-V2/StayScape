import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExtractedPreferencesDto } from './staymatch-search.dto';
import { PublicPropertySummary } from '../../properties/serializers/public-property.serializer';

export interface RankedPropertyItem extends PublicPropertySummary {
  matchScore: number;
  matchReasons: string[];
  tradeOffs: string[];
}

export class StayMatchResponseDto {
  @ApiProperty({ type: () => ExtractedPreferencesDto })
  interpretedPreferences!: ExtractedPreferencesDto;

  @ApiProperty({ description: 'AI interpretation summary' })
  summary!: string;

  @ApiPropertyOptional({ description: 'Clarification query if preferences are ambiguous' })
  clarificationQuestion?: string | null;

  @ApiProperty({
    isArray: true,
    description: 'Preferences requested that do not match the catalogue',
  })
  unresolvedPreferences!: string[];

  @ApiProperty({ isArray: true, description: 'Ranked matching properties from actual database' })
  results!: RankedPropertyItem[];

  @ApiProperty({ description: 'Total matched properties in database' })
  totalMatched!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total available pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Whether basic deterministic fallback was used instead of LLM' })
  fallbackUsed!: boolean;
}
