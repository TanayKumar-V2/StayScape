import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Availability & Booking Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let guestUserCookiesA: string[];
  let guestUserCookiesB: string[];
  let hostUserCookies: string[];

  const testSlug = 'the-alpine-hideaway-manali';

  beforeAll(async () => {
    jest.setTimeout(45000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await prisma.booking.deleteMany({
      where: { propertySlugSnapshot: testSlug },
    });

    // 1. Register Guest User A
    const randA = Math.random().toString(36).substring(7);
    const emailA = `guest.a.${randA}@example.com`;
    const resA = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/register')
      .send({
        email: emailA,
        password: 'Password123!',
        firstName: 'Guest',
        lastName: 'Alpha',
      })
      .expect(201);
    guestUserCookiesA = (resA.headers['set-cookie'] as unknown as string[]) || [];

    // 2. Register Guest User B
    const randB = Math.random().toString(36).substring(7);
    const emailB = `guest.b.${randB}@example.com`;
    const resB = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/register')
      .send({
        email: emailB,
        password: 'Password123!',
        firstName: 'Guest',
        lastName: 'Beta',
      })
      .expect(201);
    guestUserCookiesB = (resB.headers['set-cookie'] as unknown as string[]) || [];

    // 3. Login as Seeded Host (host@stayscape.com owns 'the-alpine-hideaway-manali')
    const resHost = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/login')
      .send({
        email: 'host@stayscape.com',
        password: 'HostPassphrase2026!',
      })
      .expect(200);
    hostUserCookies = (resHost.headers['set-cookie'] as unknown as string[]) || [];
  });

  afterAll(async () => {
    try {
      await prisma.booking.deleteMany({
        where: { propertySlugSnapshot: testSlug },
      });
    } catch {
      // Ignore cleanup error if already closed
    }
    await app.close();
  });

  describe('Public Availability Endpoints', () => {
    it('GET /api/v1/properties/:slug/availability should return calendar ranges', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(`/api/v1/properties/${testSlug}/availability?startDate=2027-01-01&endDate=2027-01-31`)
        .expect(200);

      expect(res.body).toHaveProperty('propertySlug', testSlug);
      expect(res.body).toHaveProperty('startDate', '2027-01-01');
      expect(res.body).toHaveProperty('endDate', '2027-01-31');
      expect(Array.isArray(res.body.unavailableRanges)).toBe(true);
    });

    it('POST /api/v1/properties/:slug/availability/check should quote available price breakdown', async () => {
      const res = await request(app.getHttpServer() as Server)
        .post(`/api/v1/properties/${testSlug}/availability/check`)
        .send({
          checkIn: '2027-03-01',
          checkOut: '2027-03-05',
          guestCount: 2,
        })
        .expect(200);

      expect(res.body.available).toBe(true);
      expect(res.body.stay).toEqual({
        checkIn: '2027-03-01',
        checkOut: '2027-03-05',
        nights: 4,
        guestCount: 2,
      });
      expect(res.body.priceBreakdown).toHaveProperty('pricePerNightPaise');
      expect(res.body.priceBreakdown).toHaveProperty('nightlySubtotalPaise');
      expect(res.body.priceBreakdown).toHaveProperty('cleaningFeePaise');
      expect(res.body.priceBreakdown).toHaveProperty('totalAmountPaise');
      expect(res.body.priceBreakdown.currency).toBe('INR');
      expect(res.body.priceBreakdown.totalAmountPaise).toBe(
        res.body.priceBreakdown.nightlySubtotalPaise + res.body.priceBreakdown.cleaningFeePaise,
      );
    });

    it('POST /api/v1/properties/:slug/availability/check should reject invalid dates', async () => {
      const res = await request(app.getHttpServer() as Server)
        .post(`/api/v1/properties/${testSlug}/availability/check`)
        .send({
          checkIn: '2027-03-05',
          checkOut: '2027-03-01', // checkout before checkin
          guestCount: 2,
        })
        .expect(200);

      expect(res.body.available).toBe(false);
      expect(res.body.reason).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('Authentication & Host Guarding', () => {
    it('POST /api/v1/bookings/holds without auth cookie should return 401', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .send({
          propertySlug: testSlug,
          checkIn: '2027-04-01',
          checkOut: '2027-04-05',
          guestCount: 2,
        })
        .expect(401);
    });

    it('POST /api/v1/bookings/holds should prevent host from booking their own property (403)', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .set('Cookie', hostUserCookies)
        .send({
          propertySlug: testSlug,
          checkIn: '2027-04-01',
          checkOut: '2027-04-05',
          guestCount: 2,
        })
        .expect(403);
    });
  });

  describe('Booking Hold Lifecycle & Cancellation', () => {
    let createdRef: string;

    it('POST /api/v1/bookings/holds should create a temporary 10-minute hold', async () => {
      const res = await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .set('Cookie', guestUserCookiesA)
        .send({
          propertySlug: testSlug,
          checkIn: '2027-07-01',
          checkOut: '2027-07-04',
          guestCount: 2,
        })
        .expect(201);

      expect(res.body.status).toBe('HOLD');
      expect(res.body.bookingReference).toMatch(/^STY-[2-9A-HJ-NP-Z]{8}$/);
      expect(res.body.holdExpiresAt).toBeDefined();
      expect(res.body.stay.nights).toBe(3);
      createdRef = res.body.bookingReference;
    });

    it('GET /api/v1/bookings/:reference should retrieve the hold details', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(`/api/v1/bookings/${createdRef}`)
        .set('Cookie', guestUserCookiesA)
        .expect(200);

      expect(res.body.bookingReference).toBe(createdRef);
      expect(res.body.status).toBe('HOLD');
      expect(res.body.property.slug).toBe(testSlug);
    });

    it('must not reveal another guest booking by reference', async () => {
      await request(app.getHttpServer() as Server)
        .get(`/api/v1/bookings/${createdRef}`)
        .set('Cookie', guestUserCookiesB)
        .expect(404);
    });

    it('GET /api/v1/bookings/me should list the active hold in user history', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get('/api/v1/bookings/me')
        .set('Cookie', guestUserCookiesA)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
      const found = res.body.items.some((b: any) => b.bookingReference === createdRef);
      expect(found).toBe(true);
    });

    it('DELETE /api/v1/bookings/:reference/hold should cancel the temporary hold', async () => {
      const res = await request(app.getHttpServer() as Server)
        .delete(`/api/v1/bookings/${createdRef}/hold`)
        .set('Cookie', guestUserCookiesA)
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancelledAt).toBeDefined();
    });
  });

  describe('Concurrency & Double-Booking Prevention (Real Neon PostgreSQL)', () => {
    it('should allow adjacent non-overlapping bookings [checkIn, checkOut)', async () => {
      // Booking 1: 2027-08-10 to 2027-08-15
      const res1 = await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .set('Cookie', guestUserCookiesA)
        .send({
          propertySlug: testSlug,
          checkIn: '2027-08-10',
          checkOut: '2027-08-15',
          guestCount: 2,
        })
        .expect(201);

      // Booking 2: 2027-08-15 to 2027-08-20 (Check-in on same day Booking 1 checks out)
      const res2 = await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .set('Cookie', guestUserCookiesB)
        .send({
          propertySlug: testSlug,
          checkIn: '2027-08-15',
          checkOut: '2027-08-20',
          guestCount: 2,
        })
        .expect(201);

      expect(res1.body.status).toBe('HOLD');
      expect(res2.body.status).toBe('HOLD');
    });

    it('should reject overlapping sequential hold with 409 Conflict', async () => {
      // Active hold on 2027-08-10 to 2027-08-15 already exists from previous test.
      // Attempting to book 2027-08-12 to 2027-08-17 must fail with 409 Conflict.
      const res = await request(app.getHttpServer() as Server)
        .post('/api/v1/bookings/holds')
        .set('Cookie', guestUserCookiesB)
        .send({
          propertySlug: testSlug,
          checkIn: '2027-08-12',
          checkOut: '2027-08-17',
          guestCount: 2,
        })
        .expect(409);

      expect(res.body.message).toContain('no longer available');
    });

    it('should serialize concurrent requests and reject one with 409 Conflict', async () => {
      // Simulate User A and User B concurrently trying to reserve 2027-09-01 to 2027-09-05
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer() as Server)
          .post('/api/v1/bookings/holds')
          .set('Cookie', guestUserCookiesA)
          .send({
            propertySlug: testSlug,
            checkIn: '2027-09-01',
            checkOut: '2027-09-05',
            guestCount: 2,
          }),
        request(app.getHttpServer() as Server)
          .post('/api/v1/bookings/holds')
          .set('Cookie', guestUserCookiesB)
          .send({
            propertySlug: testSlug,
            checkIn: '2027-09-01',
            checkOut: '2027-09-05',
            guestCount: 2,
          }),
      ]);

      const statuses = [resA.status, resB.status];

      // Exactly ONE request must succeed with 201, and the other MUST receive 409 Conflict!
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);
    });
  });
});
