import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(AuthService.prototype, 'getCurrentUser').mockImplementation(async (authHeader?: string) => {
      if (!authHeader) {
        throw new Error('Authentication token required');
      }
      return {
        id: 'usr-123',
        email: 'user@example.com',
        name: 'Example User',
        role: 'ADMIN',
      };
    });

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
        role: 'ADMIN',
      };

      vi.spyOn(AuthService.prototype, 'getCurrentUser').mockRestore();

      vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
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

  // ─── Microservices Forwarding Integration Tests ──────────────────────────────

  describe('Project Service Routing (/api/projects)', () => {
    it('should forward GET /api/projects with Authorization header', async () => {
      const mockProjects = [{ id: 'proj-1', name: 'Project Alpha' }];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockProjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(response.body).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer bearer-token',
          }),
        }),
      );
    });

    it('should handle Project Service unavailability cleanly with 503', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', 'Bearer bearer-token')
        .expect(503);

      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('Project service is currently unavailable');
    });
  });

  describe('Team Service Routing (/api/teams)', () => {
    it('should forward GET /api/teams with Authorization header', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Dev Team' }];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockTeams), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/teams')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(response.body).toEqual(mockTeams);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/teams',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer bearer-token',
          }),
        }),
      );
    });

    it('should propagate downstream 404 error from Team Service', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ statusCode: 404, message: 'Team not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/teams/invalid-id')
        .set('Authorization', 'Bearer bearer-token')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Task Service Routing (/api/tasks)', () => {
    it('should forward POST /api/tasks with body and Authorization header', async () => {
      const mockTask = { id: 'task-1', title: 'Task 1', status: 'TODO' };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockTask), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer bearer-token')
        .send({ title: 'Task 1', projectId: 'p-1' })
        .expect(201);

      expect(response.body).toEqual(mockTask);
    });

    it('should handle Task Service timeout with 504 Gateway Timeout', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutError);

      const response = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer bearer-token')
        .expect(504);

      expect(response.body.statusCode).toBe(504);
      expect(response.body.message).toContain('Task service request timed out');
    });
  });

  describe('Sprint Service Routing (/api/sprints)', () => {
    it('should forward GET /api/sprints with Authorization header', async () => {
      const mockSprints = [{ id: 'sprint-1', name: 'Sprint 1' }];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockSprints), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/sprints')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(response.body).toEqual(mockSprints);
    });
  });

  describe('Risk Service Routing (/api/risks)', () => {
    it('should forward GET /api/risks with Authorization header', async () => {
      const mockRisks = [{ id: 'risk-1', title: 'Risk 1' }];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockRisks), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/risks')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(response.body).toEqual(mockRisks);
    });
  });

  describe('Reporting Service Routing (/api/reports)', () => {
    it('should forward GET /api/reports/projects/:id/overview with Authorization header', async () => {
      const mockOverview = { projectId: 'p-1', tasks: { totalTasks: 5 } };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockOverview), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/reports/projects/p-1/overview')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(response.body).toEqual(mockOverview);
    });
  });

  describe('AI Service Routing (/api/ai)', () => {
    it('should forward POST /api/ai/projects/:id/health-summary with Authorization header', async () => {
      const mockAiResponse = {
        projectId: 'p-1',
        analysisType: 'health-summary',
        summary: 'All tasks on schedule.',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockAiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/ai/projects/p-1/health-summary')
        .set('Authorization', 'Bearer bearer-token')
        .send({})
        .expect(200);

      expect(response.body).toEqual(mockAiResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3009/api/ai/projects/p-1/health-summary',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authorization: 'Bearer bearer-token',
          }),
        }),
      );
    });

    it('should handle AI Service unavailability cleanly with 503', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

      const response = await request(app.getHttpServer())
        .post('/api/ai/projects/p-1/health-summary')
        .expect(503);

      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('AI service is currently unavailable');
    });
  });

  describe('PATCH /api/auth/users/:id/role', () => {
    it('should allow ADMIN to update a user role and forward request to Auth Service', async () => {
      const mockUpdatedUser = {
        id: 'member-user-003',
        email: 'member@aipms.com',
        role: 'PROJECT_MANAGER',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUpdatedUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await request(app.getHttpServer())
        .patch('/api/auth/users/member-user-003/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'PROJECT_MANAGER' })
        .expect(200);

      expect(response.body.role).toBe('PROJECT_MANAGER');
    });

    it('should reject role update attempt by non-admin with 403 Forbidden', async () => {
      vi.spyOn(AuthService.prototype, 'getCurrentUser').mockResolvedValueOnce({
        id: 'member-user-003',
        email: 'member@aipms.com',
        role: 'TEAM_MEMBER',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/auth/users/member-user-003/role')
        .set('Authorization', 'Bearer member-token')
        .send({ role: 'ADMIN' })
        .expect(403);

      expect(response.body.statusCode).toBe(403);
    });

    it('should reject invalid role enum with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/auth/users/member-user-003/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'SUPERMAN' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });
});
