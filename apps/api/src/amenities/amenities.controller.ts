import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AmenitiesService, GroupedAmenities } from './amenities.service';

@ApiTags('amenities')
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all available amenities catalogue grouped by category' })
  @ApiResponse({ status: 200, description: 'Amenities retrieved successfully' })
  async findAll(): Promise<GroupedAmenities> {
    return this.amenitiesService.findAll();
  }
}
