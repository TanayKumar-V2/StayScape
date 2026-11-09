import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderImagesDto {
  @ApiProperty({
    example: ['img-id-1', 'img-id-2', 'img-id-3'],
    description: 'Ordered array of PropertyImage UUIDs',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  imageIds!: string[];
}
