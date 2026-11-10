import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WorkerSchedulerService {
  private readonly logger = new Logger(WorkerSchedulerService.name);

  constructor(
    @InjectQueue('booking-completion')
    private readonly bookingCompletionQueue: Queue,
    @InjectQueue('payment-reconciliation')
    private readonly paymentReconciliationQueue: Queue,
  ) {}

  /**
   * Registers deterministic repeatable jobs in BullMQ.
   * BullMQ uses hash-based deduplication in Redis for repeatable jobs,
   * guaranteeing that only a single singleton job is scheduled per logical task.
   */
  async initRepeatableJobs(): Promise<void> {
    this.logger.log('Configuring singleton repeatable jobs in BullMQ...');

    try {
      // 1. Booking completion: run every 15 minutes
      await this.bookingCompletionQueue.upsertJobScheduler(
        'singleton-booking-completion',
        { pattern: '*/15 * * * *' },
        {
          name: 'periodic-booking-completion',
          data: { triggeredAt: new Date().toISOString() },
          opts: {
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        },
      );
      this.logger.log('Configured periodic-booking-completion scheduler (every 15m).');

      // 2. Payment reconciliation & refund recovery: run every 30 minutes
      await this.paymentReconciliationQueue.upsertJobScheduler(
        'singleton-payment-reconciliation',
        { pattern: '*/30 * * * *' },
        {
          name: 'periodic-payment-reconciliation',
          data: { checkWindowMinutes: 60, checkRefundRecoveries: true },
          opts: {
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        },
      );
      this.logger.log('Configured periodic-payment-reconciliation scheduler (every 30m).');
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialize repeatable worker jobs: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
