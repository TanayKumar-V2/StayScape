import {
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
import { AdminPaymentsService } from '../services/admin-payments.service';
import { AdminPaginationQueryDto } from '../dto/admin-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  @Get('payments')
  async getPayments(
    @Query()
    query: AdminPaginationQueryDto & {
      bookingReference?: string;
      providerPaymentId?: string;
    },
  ) {
    return this.paymentsService.getPayments(query);
  }

  @Get('refunds')
  async getRefunds(
    @Query() query: AdminPaginationQueryDto & { bookingReference?: string },
  ) {
    return this.paymentsService.getRefunds(query);
  }

  @Post('refunds/:refundId/retry')
  async retryRefund(
    @AdminUser() admin: AuthenticatedAdminUser,
    @Param('refundId') refundId: string,
  ) {
    return this.paymentsService.retryRefund(admin.id, refundId);
  }
}

