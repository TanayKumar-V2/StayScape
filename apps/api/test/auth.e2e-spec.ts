import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Endpoints (e2e)', () => {
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

  describe('POST /api/v1/auth/register input validation', () => {
    it('should reject registration when password is shorter than 10 characters', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'valid@example.com',
          password: 'short',
        })
        .expect(400);
    });

    it('should reject registration when email is malformed', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'not-an-email',
          password: 'StrongPassphrase123!',
        })
        .expect(400);
    });

    it('should reject registration with untrusted Origin header', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/v1/auth/register')
        .set('Origin', 'https://malicious-site.com')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'attacker@example.com',
          password: 'StrongPassphrase123!',
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/auth/login credentials check', () => {
    it('should return 401 on non-existent account or wrong credentials without revealing existence', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent-user-xyz@stayscape.local',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me protection', () => {
    it('should return 401 when no auth cookie or bearer token is provided', () => {
      return request(app.getHttpServer() as Server)
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/users/me protection', () => {
    it('should return 401 when unauthenticated', () => {
      return request(app.getHttpServer() as Server)
        .patch('/api/v1/users/me')
        .send({ firstName: 'Hacker' })
        .expect(401);
    });
  });
});
