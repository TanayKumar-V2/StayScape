import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RefundService } from '../services/refund.service';

export interface RefundJobData {
  refundId: string;
  paymentTransactionId: string;
  amountPaise: number;
  reason: string;
}

@Processor('payment-refunds')
export class PaymentRefundProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentRefundProcessor.name);

  constructor(private readonly refundService: RefundService) {
    super();
  }

  async process(job: Job<RefundJobData>): Promise<void> {
    const { refundId, amountPaise, reason } = job.data;
    this.logger.log(
      `Processing refund job for refund ID "${refundId}" (₹${amountPaise / 100}): ${reason}`,
    );

    await this.refundService.executeRefund(refundId);
  }
}
