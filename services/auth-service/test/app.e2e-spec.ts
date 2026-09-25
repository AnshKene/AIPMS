import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with health details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('AIPMS Auth Service');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 Bad Request on empty payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 Bad Request on invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 Bad Request on short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 Bad Request on empty payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 Bad Request on missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toContain('Authorization header');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });
});
