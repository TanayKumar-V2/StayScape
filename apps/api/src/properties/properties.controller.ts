import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Property, PropertyImage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OriginGuard } from '../auth/guards/origin.guard';
import { CurrentHost } from '../host/decorators/current-host.decorator';
import { HostGuard } from '../host/host.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PaginatedProperties, PropertiesService } from './properties.service';
import { PropertyImageService, UploadedFile } from './services/property-image.service';

@ApiTags('host-properties')
@Controller('host/properties')
@UseGuards(JwtAuthGuard, HostGuard)
@ApiCookieAuth()
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly propertyImageService: PropertyImageService,
  ) {}

  @UseGuards(OriginGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property draft' })
  @ApiResponse({ status: 201, description: 'Property draft created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - host profile required' })
  async create(
    @CurrentHost('id') hostProfileId: string,
    @Body() dto: CreatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.create(hostProfileId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all properties owned by host with optional status filtering' })
  @ApiResponse({ status: 200, description: 'List of host properties' })
  async findAll(
    @CurrentHost('id') hostProfileId: string,
    @Query() query: PropertyQueryDto,
  ): Promise<PaginatedProperties<unknown>> {
    return this.propertiesService.findAllForHost(hostProfileId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full property details for host editing' })
  @ApiResponse({ status: 200, description: 'Property retrieved' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
  ): Promise<Property> {
    return this.propertiesService.findOneForHost(hostProfileId, id);
  }

  @UseGuards(OriginGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update property listing details' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  @ApiResponse({ status: 400, description: 'Validation error or archived property' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async update(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(hostProfileId, id, dto);
  }

  @UseGuards(OriginGuard)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish listing after validating completeness requirements' })
  @ApiResponse({ status: 200, description: 'Property published successfully' })
  @ApiResponse({ status: 400, description: 'Publishing requirements not satisfied' })
  async publish(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
  ): Promise<Property> {
    return this.propertiesService.publish(hostProfileId, id);
  }

  @UseGuards(OriginGuard)
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a published listing temporarily' })
  @ApiResponse({ status: 200, description: 'Property paused' })
  @ApiResponse({ status: 400, description: 'Property is not published' })
  async pause(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
  ): Promise<Property> {
    return this.propertiesService.pause(hostProfileId, id);
  }

  @UseGuards(OriginGuard)
  @Post(':id/unpause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-activate a paused listing' })
  @ApiResponse({ status: 200, description: 'Property re-published' })
  @ApiResponse({ status: 400, description: 'Property is not paused' })
  async unpause(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
  ): Promise<Property> {
    return this.propertiesService.unpause(hostProfileId, id);
  }

  @UseGuards(OriginGuard)
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a listing permanently (soft delete)' })
  @ApiResponse({ status: 200, description: 'Property archived' })
  async archive(
    @CurrentHost('id') hostProfileId: string,
    @Param('id') id: string,
  ): Promise<Property> {
    return this.propertiesService.archive(hostProfileId, id);
  }

  // ── Images ─────────────────────────────────────────────────────────────────
  @UseGuards(OriginGuard)
  @Post(':propertyId/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      // Reject oversized uploads at the parser level — the memory-storage
      // engine otherwise buffers arbitrary sizes before the service checks.
      limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 10 images for a property' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async uploadImages(
    @CurrentHost('id') hostProfileId: string,
    @Param('propertyId') propertyId: string,
    @UploadedFiles() files: UploadedFile[],
  ): Promise<PropertyImage[]> {
    await this.propertiesService.findOneForHost(hostProfileId, propertyId);
    return this.propertyImageService.uploadImages(propertyId, files);
  }

  @UseGuards(OriginGuard)
  @Delete(':propertyId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an image from a property' })
  async deleteImage(
    @CurrentHost('id') hostProfileId: string,
    @Param('propertyId') propertyId: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.propertiesService.findOneForHost(hostProfileId, propertyId);
    await this.propertyImageService.deleteImage(propertyId, imageId);
  }

  @UseGuards(OriginGuard)
  @Patch(':propertyId/images/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder images for a property' })
  async reorderImages(
    @CurrentHost('id') hostProfileId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: ReorderImagesDto,
  ): Promise<PropertyImage[]> {
    await this.propertiesService.findOneForHost(hostProfileId, propertyId);
    return this.propertyImageService.reorderImages(propertyId, dto.imageIds);
  }

  @UseGuards(OriginGuard)
  @Patch(':propertyId/images/:imageId/cover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Designate an image as the cover image' })
  async setCover(
    @CurrentHost('id') hostProfileId: string,
    @Param('propertyId') propertyId: string,
    @Param('imageId') imageId: string,
  ): Promise<PropertyImage> {
    await this.propertiesService.findOneForHost(hostProfileId, propertyId);
    return this.propertyImageService.setCover(propertyId, imageId);
  }
}
