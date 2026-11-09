import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminAnalyticsQueryDto, AdminDashboardOverviewQueryDto } from '../dto/admin-query.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  async getOverview(@Query() query: AdminDashboardOverviewQueryDto): Promise<unknown> {
    return await this.dashboardService.getOverview(query);
  }

  @Get('analytics')
  async getAnalytics(@Query() query: AdminAnalyticsQueryDto): Promise<unknown> {
    return await this.dashboardService.getAnalytics(query);
  }
}
