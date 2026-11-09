import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import appConfig, { validationSchema } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HostModule } from './host/host.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { PropertiesModule } from './properties/properties.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { MessagesModule } from './messages/messages.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('app.redisUrl', 'redis://localhost:6379');
        const parsed = new URL(redisUrl);
        return {
          connection: {
            host: parsed.hostname || 'localhost',
            port: parseInt(parsed.port || '6379', 10),
            password: parsed.password || undefined,
            username: parsed.username || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),

    // ── Feature modules ──────────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    HostModule,
    AmenitiesModule,
    PropertiesModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
    AiModule,
    ReviewsModule,
    WishlistModule,
    MessagesModule,
    AdminModule,
  ],
})
export class AppModule {}
