import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard, AuthenticatedAdminUser } from '../guards/admin.guard';
import { AdminUser } from '../decorators/admin-user.decorator';
import { AdminHostsService } from '../services/admin-hosts.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';
import { ActivateActionDto, SuspendActionDto } from '../dto/admin-actions.dto';

@Controller('admin/hosts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminHostsController {
  constructor(private readonly hostsService: AdminHostsService) {}

  @Get()
  async getHosts(@Query() query: AdminPaginationQueryDto) {
    return this.hostsService.getHosts(query);
  }

  @Get(':hostProfileId')
  async getHostDetails(@Param('hostProfileId') hostProfileId: string) {
    return this.hostsService.getHostDetails(hostProfileId);
  }

  @Patch(':hostProfileId/suspend')
  async suspendHost(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('hostProfileId') hostProfileId: string,
    @Body() dto: SuspendActionDto,
  ) {
    return this.hostsService.suspendHost(admin.id, hostProfileId, dto);
  }

  @Patch(':hostProfileId/activate')
  async activateHost(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('hostProfileId') hostProfileId: string,
    @Body() dto: ActivateActionDto,
  ) {
    return this.hostsService.activateHost(admin.id, hostProfileId, dto);
  }
}

