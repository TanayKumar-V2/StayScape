import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RazorpayService } from '../src/payments/razorpay.service';

describe('Razorpay Payments & Reservation Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let razorpayService: RazorpayService;

  let guestCookies: string[];
  let bookingReference: string;
  let generatedOrderId: string;

  const testSlug = 'the-alpine-hideaway-manali';

  beforeAll(async () => {
    jest.setTimeout(45000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Preserve exact request bytes so webhook signature validation exercises
    // the same raw-body contract as the production NestFactory bootstrap.
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    razorpayService = app.get(RazorpayService);

    // Register test guest
    const rand = Math.random().toString(36).substring(7);
    const email = `guest.pay.${rand}@example.com`;
    const regRes = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
        firstName: 'Rohan',
        lastName: 'Verma',
      })
      .expect(201);

    guestCookies = (regRes.headers['set-cookie'] as unknown as string[]) || [];

    // Create a temporary booking hold
    const holdRes = await request(app.getHttpServer() as Server)
      .post('/api/v1/bookings/holds')
      .set('Cookie', guestCookies)
      .send({
        propertySlug: testSlug,
        checkIn: '2026-11-20',
        checkOut: '2026-11-23',
        guestCount: 2,
      })
      .expect(201);

    bookingReference = holdRes.body.bookingReference;
  });

  afterAll(async () => {
    if (bookingReference) {
      await prisma.booking.deleteMany({
        where: { bookingReference },
      });
    }
    await app.close();
  });

  describe('POST /api/v1/bookings/:bookingReference/payments/order', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer() as Server)
        .post(`/api/v1/bookings/${bookingReference}/payments/order`)
        .expect(401);
    });

    it('should generate a payment order for an authenticated active hold', async () => {
      const res = await request(app.getHttpServer() as Server)
        .post(`/api/v1/bookings/${bookingReference}/payments/order`)
        .set('Cookie', guestCookies)
        .expect(200);

      expect(res.body).toHaveProperty('orderId');
      expect(res.body).toHaveProperty('amount');
      expect(res.body).toHaveProperty('currency', 'INR');
      expect(res.body).toHaveProperty('keyId');
      expect(res.body).toHaveProperty('bookingReference', bookingReference);
      expect(res.body.user).toHaveProperty('name', 'Rohan Verma');

      generatedOrderId = res.body.orderId;
    });

    it('should reuse existing active payment order if requested again', async () => {
      const res = await request(app.getHttpServer() as Server)
        .post(`/api/v1/bookings/${bookingReference}/payments/order`)
        .set('Cookie', guestCookies)
        .expect(200);

      expect(res.body.orderId).toBe(generatedOrderId);
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('should reject unauthenticated verification request with 401', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/payments/verify')
        .send({
          razorpayOrderId: generatedOrderId,
          razorpayPaymentId: 'pay_mock_123',
          razorpaySignature: 'invalid_sig',
        })
        .expect(401);
    });

    it('should reject invalid cryptographic payment signature with 400', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/payments/verify')
        .set('Cookie', guestCookies)
        .send({
          razorpayOrderId: generatedOrderId,
          razorpayPaymentId: 'pay_mock_123',
          razorpaySignature: '0000000000000000000000000000000000000000000000000000000000000000',
        })
        .expect(400);
    });

    it('should verify authentic payment signature and confirm booking', async () => {
      const testPaymentId = `pay_${Date.now()}`;
      const storedOrder = await prisma.paymentOrder.findUniqueOrThrow({
        where: { razorpayOrderId: generatedOrderId },
        select: { amountPaise: true, currency: true },
      });
      // Keep this E2E deterministic and avoid treating a fake provider response
      // as financial authority. The simulated order was persisted above; the
      // mock returns a captured payment bound to that exact stored order.
      jest.spyOn(razorpayService, 'fetchPayment').mockResolvedValue({
        id: testPaymentId,
        order_id: generatedOrderId,
        amount: storedOrder.amountPaise,
        currency: storedOrder.currency,
        status: 'captured',
        method: 'upi',
        captured: true,
        created_at: Math.floor(Date.now() / 1000),
      });
      const validSignature = razorpayService.generateTestPaymentSignature(
        generatedOrderId,
        testPaymentId,
      );

      const res = await request(app.getHttpServer() as Server)
        .post('/api/v1/payments/verify')
        .set('Cookie', guestCookies)
        .send({
          razorpayOrderId: generatedOrderId,
          razorpayPaymentId: testPaymentId,
          razorpaySignature: validSignature,
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('bookingReference', bookingReference);
      expect(res.body).toHaveProperty('status', 'CONFIRMED');

      // Verify database updated to CONFIRMED
      const booking = await prisma.booking.findUnique({
        where: { bookingReference },
      });
      expect(booking?.status).toBe('CONFIRMED');
      expect(booking?.confirmedAt).not.toBeNull();
    });
  });

  describe('GET /api/v1/bookings/:bookingReference/payment-status', () => {
    it('should return sanitized payment details for confirmed booking', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(`/api/v1/bookings/${bookingReference}/payment-status`)
        .set('Cookie', guestCookies)
        .expect(200);

      expect(res.body).toHaveProperty('bookingReference', bookingReference);
      expect(res.body).toHaveProperty('bookingStatus', 'CONFIRMED');
      expect(res.body).toHaveProperty('isPaid', true);
      expect(res.body.order).toHaveProperty('orderId', generatedOrderId);
      expect(res.body.transaction).toHaveProperty('status', 'CAPTURED');
    });
  });

  describe('POST /api/v1/webhooks/razorpay', () => {
    it('should reject webhook request missing signature with 400', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/webhooks/razorpay')
        .send({ event: 'payment.captured' })
        .expect(400);
    });

    it('should reject webhook with invalid signature with 400', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/webhooks/razorpay')
        .set('X-Razorpay-Signature', 'bad_signature_hex')
        .send({ event: 'payment.captured' })
        .expect(400);
    });

    it('should accept webhook with authentic signature and return 200', async () => {
      const payload = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: generatedOrderId,
              status: 'paid',
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const validSignature = razorpayService.generateTestWebhookSignature(rawBody);

      const res = await request(app.getHttpServer() as Server)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', validSignature)
        .set('X-Razorpay-Event-Id', `evt_${Date.now()}`)
        .send(payload)
        .expect(200);

      expect(res.body).toHaveProperty('received', true);
    });
  });
});
