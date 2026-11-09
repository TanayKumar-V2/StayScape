import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiPropertyOptional({
    description: 'Start of window in YYYY-MM-DD format (defaults to today)',
    example: '2026-12-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End of window in YYYY-MM-DD format (defaults to 90 days from startDate)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate?: string;
}
