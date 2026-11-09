import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { AdminReportsService } from '../services/admin-reports.service';
import { CreateReportDto } from '../dto/admin-actions.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({
    keyPrefix: 'report_create',
    limit: 10,
    windowSeconds: 60,
    byUser: true,
    failClosed: true,
  })
  async submitReport(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(userId, dto);
  }
}
