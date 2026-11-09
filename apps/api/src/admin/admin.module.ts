import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { PaymentsModule } from '../payments/payments.module';

// Guards
import { AdminGuard } from './guards/admin.guard';

// Services
import { AdminAuditService } from './services/admin-audit.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminHostsService } from './services/admin-hosts.service';
import { AdminPropertiesService } from './services/admin-properties.service';
import { AdminReviewsService } from './services/admin-reviews.service';
import { AdminReportsService } from './services/admin-reports.service';
import { AdminBookingsService } from './services/admin-bookings.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminAiUsageService } from './services/admin-ai-usage.service';

// Controllers
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminHostsController } from './controllers/admin-hosts.controller';
import { AdminPropertiesController } from './controllers/admin-properties.controller';
import { AdminReviewsController } from './controllers/admin-reviews.controller';
import { ReportsController } from './controllers/reports.controller';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminBookingsController } from './controllers/admin-bookings.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminAiUsageController } from './controllers/admin-ai-usage.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';

@Module({
  imports: [PrismaModule, RedisModule, PaymentsModule],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminHostsController,
    AdminPropertiesController,
    AdminReviewsController,
    ReportsController,
    AdminReportsController,
    AdminBookingsController,
    AdminPaymentsController,
    AdminAiUsageController,
    AdminAuditController,
  ],
  providers: [
    AdminGuard,
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminHostsService,
    AdminPropertiesService,
    AdminReviewsService,
    AdminReportsService,
    AdminBookingsService,
    AdminPaymentsService,
    AdminAiUsageService,
  ],
  exports: [AdminGuard, AdminAuditService],
})
export class AdminModule {}

