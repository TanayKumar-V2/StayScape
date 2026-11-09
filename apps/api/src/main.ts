import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { securityHeaders } from './common/middleware/security-headers.middleware';
import {
  originValidator,
  requestLoggingMiddleware,
} from './common/middleware/request-context.middleware';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env['NODE_ENV'] === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  // ── Global API prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Cookie Parser ─────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Explicit allow-list only. Wildcard origins are never used with credentials.
  const corsOrigins = [
    process.env['WEB_ORIGIN'] ?? 'http://localhost:3000',
    ...(process.env['WEB_ORIGINS'] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  });

  // ── Security middleware (order matters) ──────────────────────────────────
  // 1. Correlation IDs + structured access logs for every request.
  app.use(requestLoggingMiddleware());
  // 2. Security response headers (HSTS only for HTTPS environments).
  app.use(securityHeaders({ hsts: process.env['HSTS_ENABLED'] === 'true' }));
  // 3. CSRF origin validation on state-changing requests. The Razorpay
  //    webhook path is exempt — it is authenticated by raw-body HMAC.
  app.use(originValidator(() => corsOrigins));

  // ── Global exception filter ───────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global validation pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger documentation (disabled in production) ────────────────────────
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('StayScape API')
      .setDescription(
        'REST API for the StayScape accommodation booking platform.\n\n' + 'Base path: `/api/v1`',
      )
      .setVersion('1.0.0')
      .addTag('health', 'Service health and readiness checks')
      .addTag('auth', 'Authentication, token rotation, and session management')
      .addTag('users', 'User profile management')
      .addTag('host', 'Host onboarding, profile, and dashboard')
      .addTag('amenities', 'Amenities catalogue')
      .addTag('host-properties', 'Host property listings, management, and publishing')
      .addCookieAuth('stayscape_access')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger docs available at /api/docs');
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start listening ───────────────────────────────────────────────────────
  const port = parseInt(process.env['PORT'] ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on port ${port}`);
  logger.log(`Environment: ${isProduction ? 'production' : (process.env['NODE_ENV'] ?? 'development')}`);
  logger.log(
    `Trusted proxies for client-IP derivation: ${(process.env['TRUSTED_PROXIES'] ?? 'none').split(',').join(', ') || 'none'}`,
  );
}

void bootstrap();
