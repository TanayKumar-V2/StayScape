import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateHostProfileDto {
  @ApiPropertyOptional({
    example: "John's Mountain Retreats",
    description: 'Public host display name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;

  @ApiPropertyOptional({ example: 'Updated host bio details', description: 'Host biography' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  contactPhone?: string;
}
