import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class AvailabilityCheckDto {
  @ApiProperty({
    description: 'Check-in date in YYYY-MM-DD format',
    example: '2026-12-10',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkIn must be in YYYY-MM-DD format' })
  checkIn!: string;

  @ApiProperty({
    description: 'Checkout date in YYYY-MM-DD format',
    example: '2026-12-15',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkOut must be in YYYY-MM-DD format' })
  checkOut!: string;

  @ApiProperty({
    description: 'Number of guests (at least 1)',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestCount!: number;
}
