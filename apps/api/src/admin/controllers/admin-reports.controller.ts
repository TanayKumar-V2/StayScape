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
import { AdminReportsService } from '../services/admin-reports.service';
import { AdminReportQueryDto } from '../dto/admin-query.dto';
import { AssignReportDto, UpdateReportStatusDto } from '../dto/admin-actions.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get()
  async getReports(@Query() query: AdminReportQueryDto) {
    return this.reportsService.getReports(query);
  }

  @Get(':reportId')
  async getReportDetails(@Param('reportId') reportId: string) {
    return this.reportsService.getReportDetails(reportId);
  }

  @Patch(':reportId/assign')
  async assignReport(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('reportId') reportId: string,
    @Body() dto: AssignReportDto,
  ) {
    return this.reportsService.assignReport(admin.id, reportId, dto);
  }

  @Patch(':reportId/status')
  async updateReportStatus(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateReportStatus(admin.id, reportId, dto);
  }
}

