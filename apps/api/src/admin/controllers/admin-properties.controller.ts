import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard, AuthenticatedAdminUser } from '../guards/admin.guard';
import { AdminUser } from '../decorators/admin-user.decorator';
import { AdminPropertiesService } from '../services/admin-properties.service';
import { AdminPropertyQueryDto } from '../dto/admin-query.dto';
import {
  ModerationActionDto,
  RequiredModerationActionDto,
} from '../dto/admin-actions.dto';

@Controller('admin/properties')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPropertiesController {
  constructor(private readonly propertiesService: AdminPropertiesService) {}

  @Get()
  async getProperties(@Query() query: AdminPropertyQueryDto) {
    return this.propertiesService.getProperties(query);
  }

  @Get(':propertyId')
  async getPropertyDetails(@Param('propertyId') propertyId: string) {
    return this.propertiesService.getPropertyDetails(propertyId);
  }

  @Post(':propertyId/approve')
  async approveProperty(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.propertiesService.approveProperty(admin.id, propertyId, dto);
  }

  @Post(':propertyId/flag')
  async flagProperty(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: RequiredModerationActionDto,
  ) {
    return this.propertiesService.flagProperty(admin.id, propertyId, dto);
  }

  @Post(':propertyId/reject')
  async rejectProperty(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: RequiredModerationActionDto,
  ) {
    return this.propertiesService.rejectProperty(admin.id, propertyId, dto);
  }
}

