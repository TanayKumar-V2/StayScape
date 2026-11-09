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
import { AdminUsersService } from '../services/admin-users.service';
import { AdminUserQueryDto } from '../dto/admin-query.dto';
import { ActivateActionDto, SuspendActionDto } from '../dto/admin-actions.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async getUsers(@Query() query: AdminUserQueryDto) {
    return this.usersService.getUsers(query);
  }

  @Get(':userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.usersService.getUserDetails(userId);
  }

  @Patch(':userId/suspend')
  async suspendUser(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('userId') userId: string,
    @Body() dto: SuspendActionDto,
  ) {
    return this.usersService.suspendUser(admin.id, userId, dto);
  }

  @Patch(':userId/activate')
  async activateUser(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('userId') userId: string,
    @Body() dto: ActivateActionDto,
  ) {
    return this.usersService.activateUser(admin.id, userId, dto);
  }
}

