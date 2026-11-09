import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HostResponseDto {
  @ApiProperty({
    description: 'Host response message to guest review',
    example: 'Thank you for your kind words! We would love to host you again.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Host response cannot exceed 1000 characters.' })
  response!: string;
}
