import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { WorkerSchedulerService } from './worker-scheduler.service';

/**
 * Dedicated Background Worker Process for StayScape.
 *
 * Responsibilities:
 * - Consumes BullMQ jobs: booking hold expiration, payment webhook processing,
 *   refund processing, booking completion sweeps, and reconciliation sweeps.
 * - Does NOT bind to an HTTP port or expose an HTTP web server.
 * - Gracefully terminates in-flight jobs on SIGTERM / SIGINT before exit.
 */
async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('WorkerBootstrap');
  process.env['ENABLE_WORKERS'] = 'true';

  logger.log('Initializing StayScape Background Worker application context...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Enable NestJS shutdown hooks to cleanly close BullMQ workers, Redis, and Prisma
  app.enableShutdownHooks();

  // Initialize singleton repeatable schedulers
  try {
    const scheduler = app.get(WorkerSchedulerService, { strict: false });
    if (scheduler) {
      await scheduler.initRepeatableJobs();
    }
  } catch (err: unknown) {
    logger.warn(
      `WorkerSchedulerService not available or failed to initialize: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  logger.log('StayScape Background Worker successfully started and listening for BullMQ jobs.');

  const handleShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down worker gracefully...`);
    try {
      await app.close();
      logger.log('Worker context closed cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during worker shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.on('SIGINT', () => void handleShutdown('SIGINT'));
}

void bootstrapWorker();

