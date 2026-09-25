import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK independently of external services', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'AIPMS API Gateway',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should forward valid registration request and return 201 Created', async () => {
      const mockAuthResponse = {
        message: 'Registration successful',
        user: { id: 'usr-123', email: 'user@example.com', name: 'Example User' },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockAuthResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'secure-password',
          name: 'Example User',
        })
        .expect(201);

      expect(response.body).toEqual(mockAuthResponse);
    });

    it('should reject invalid payloads at Gateway layer with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should forward valid login request and return access tokens', async () => {
      const mockLoginResponse = {
        accessToken: 'mock-access-token',
        user: { id: 'usr-123', email: 'user@example.com' },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockLoginResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'secure-password',
        })
        .expect(200);

      expect(response.body).toEqual(mockLoginResponse);
    });

    it('should pass downstream 401 error through Gateway cleanly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ statusCode: 401, message: 'Invalid credentials' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should forward Authorization header to Auth Service', async () => {
      const mockUserResponse = {
        id: 'usr-123',
        email: 'user@example.com',
        name: 'Example User',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockUserResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer valid-jwt-token',
          }),
        }),
      );
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should forward Authorization header and return logout response', async () => {
      const mockLogoutResponse = { message: 'Logout successful' };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockLogoutResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockLogoutResponse);
    });
  });

  describe('Auth Service Unavailability', () => {
    it('should return controlled 503 Service Unavailable when Auth Service cannot be reached', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('fetch failed'),
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'secure-password',
        })
        .expect(503);

      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('Auth service is currently unavailable');
    });
  });
});
