import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminAiUsageService } from '../services/admin-ai-usage.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAiUsageController {
  constructor(private readonly aiUsageService: AdminAiUsageService) {}

  @Get('usage')
  async getAiUsage(@Query() query: AdminPaginationQueryDto) {
    return this.aiUsageService.getAiUsageStats(query);
  }
}

