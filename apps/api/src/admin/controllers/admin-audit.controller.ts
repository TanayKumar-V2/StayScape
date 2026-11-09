import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminAuditLogQueryDto } from '../dto/admin-query.dto';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  async getAuditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.auditService.getAuditLogs(query);
  }
}

