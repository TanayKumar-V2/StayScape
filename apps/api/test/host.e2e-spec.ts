import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Host & Property Management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.setTimeout(30000);
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Amenities Catalogue', () => {
    it('GET /api/v1/amenities should return 200 with grouped amenities catalogue', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/api/v1/amenities')
        .expect(200);

      expect(response.body).toHaveProperty('amenities');
      expect(response.body).toHaveProperty('grouped');
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.amenities)).toBe(true);
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });

  describe('Host Authorization Guarding', () => {
    it('POST /api/v1/host/onboarding without auth cookie should return 401', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/host/onboarding')
        .send({
          displayName: 'Test Host',
          termsAccepted: true,
        })
        .expect(401);
    });

    it('GET /api/v1/host/profile without auth cookie should return 401', async () => {
      await request(app.getHttpServer() as Server)
        .get('/api/v1/host/profile')
        .expect(401);
    });

    it('GET /api/v1/host/dashboard without auth cookie should return 401', async () => {
      await request(app.getHttpServer() as Server)
        .get('/api/v1/host/dashboard')
        .expect(401);
    });

    it('POST /api/v1/host/properties without auth cookie should return 401', async () => {
      await request(app.getHttpServer() as Server)
        .post('/api/v1/host/properties')
        .send({
          title: 'Unauthenticated property creation attempt',
        })
        .expect(401);
    });
  });

  describe('Public Property Discovery & Intelligent Search', () => {
    it('GET /api/v1/properties should return published properties with pagination metadata', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/api/v1/properties')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);

      const first = response.body.data[0];
      expect(first).toHaveProperty('slug');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('city');
      expect(first).toHaveProperty('pricePerNightPaise');
      expect(first).toHaveProperty('approximateCoordinates');
      // Privacy guarantees: exact street address or postal code must NEVER be exposed publicly
      expect(first.addressLine1).toBeUndefined();
      expect(first.postalCode).toBeUndefined();
    });

    it('GET /api/v1/properties?destination=Manali should filter properties by destination', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/api/v1/properties?destination=Manali')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      for (const item of response.body.data) {
        expect(item.city.toLowerCase()).toContain('manali');
      }
    });

    it('GET /api/v1/properties/destinations should return aggregated destination list', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/api/v1/properties/destinations')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      const dest = response.body.data[0];
      expect(dest).toHaveProperty('city');
      expect(dest).toHaveProperty('propertyCount');
      expect(dest.propertyCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/properties/:slug should return sanitized property details', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/api/v1/properties/the-alpine-hideaway-manali')
        .expect(200);

      expect(response.body.slug).toBe('the-alpine-hideaway-manali');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('houseRules');
      expect(response.body).toHaveProperty('amenities');
      expect(response.body).toHaveProperty('images');
      expect(response.body).toHaveProperty('host');
      expect(response.body.addressLine1).toBeUndefined();
      expect(response.body.postalCode).toBeUndefined();
      expect(response.body.host.contactPhone).toBeUndefined();
    });

    it('GET /api/v1/properties/:slug should return 404 for non-existent property', async () => {
      await request(app.getHttpServer() as Server)
        .get('/api/v1/properties/non-existent-listing-slug-xyz')
        .expect(404);
    });
  });
});
