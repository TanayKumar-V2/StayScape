import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'The property slug to initiate communication about', example: 'the-alpine-hideaway' })
  @IsString()
  @IsNotEmpty()
  propertySlug!: string;

  @ApiPropertyOptional({ description: 'Optional verified booking reference to associate with this conversation', example: 'STY-2026-A1B2C3' })
  @IsOptional()
  @IsString()
  bookingReference?: string;
}
