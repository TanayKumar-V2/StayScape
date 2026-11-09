import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class HostOnboardingDto {
  @ApiProperty({ example: "John's Mountain Retreats", description: 'Public host display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  displayName!: string;

  @ApiPropertyOptional({
    example: 'We host warm, comfortable retreats in scenic destinations across Himachal.',
    description: 'Short host biography',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  contactPhone?: string;

  @ApiProperty({
    example: true,
    description: 'Must explicitly accept StayScape host terms and community standards',
  })
  @Equals(true, { message: 'You must accept the terms of service to become a host.' })
  termsAccepted!: boolean;
}
