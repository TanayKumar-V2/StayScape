import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HostProfile } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OriginGuard } from '../auth/guards/origin.guard';
import { CurrentHost } from './decorators/current-host.decorator';
import { HostOnboardingDto } from './dto/host-onboarding.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { HostGuard } from './host.guard';
import { HostDashboardStats, HostService } from './host.service';

@ApiTags('host')
@Controller('host')
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @UseGuards(JwtAuthGuard, OriginGuard)
  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Complete host onboarding for authenticated user' })
  @ApiResponse({ status: 201, description: 'Host profile created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or terms not accepted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'User is already a host' })
  async onboard(
    @CurrentUser('id') userId: string,
    @Body() dto: HostOnboardingDto,
  ): Promise<HostProfile> {
    return this.hostService.onboard(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user host profile' })
  @ApiResponse({ status: 200, description: 'Host profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Host profile not found' })
  async getProfile(@CurrentUser('id') userId: string): Promise<HostProfile> {
    return this.hostService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard, OriginGuard, HostGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update host profile information' })
  @ApiResponse({ status: 200, description: 'Host profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - host profile required' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateHostProfileDto,
  ): Promise<HostProfile> {
    return this.hostService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard, HostGuard)
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get host dashboard statistics and recent listings' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - host profile required' })
  async getDashboard(@CurrentHost('id') hostProfileId: string): Promise<HostDashboardStats> {
    return this.hostService.getDashboard(hostProfileId);
  }
}
