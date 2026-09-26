import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { SprintsService } from '../src/sprints/sprints.service.js';

describe('Sprint Service (e2e)', () => {
  let app: INestApplication;
  let sprintsService: SprintsService;

  const validUuid = '11111111-1111-4111-a111-111111111111';
  const projectUuid = '22222222-2222-4222-b222-222222222222';

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

    sprintsService = moduleFixture.get<SprintsService>(SprintsService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('AIPMS Sprint Service');
    });
  });

  describe('POST /api/sprints', () => {
    it('should create a sprint on valid payload with initial status PLANNED', async () => {
      const createdSprint = {
        id: validUuid,
        project_id: projectUuid,
        name: 'Sprint 1',
        goal: 'Implement authentication and project management',
        status: 'PLANNED',
        start_date: '2026-10-01T00:00:00Z',
        end_date: '2026-10-14T23:59:59Z',
        created_at: '2026-09-26T12:00:00Z',
        updated_at: '2026-09-26T12:00:00Z',
      };

      vi.spyOn(sprintsService, 'create').mockResolvedValue(createdSprint as any);

      const response = await request(app.getHttpServer())
        .post('/api/sprints')
        .send({
          project_id: projectUuid,
          name: 'Sprint 1',
          goal: 'Implement authentication and project management',
          start_date: '2026-10-01T00:00:00Z',
          end_date: '2026-10-14T23:59:59Z',
        })
        .expect(201);

      expect(response.body).toEqual(createdSprint);
      expect(response.body.status).toBe('PLANNED');
    });

    it('should return 400 Bad Request when end_date < start_date', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sprints')
        .send({
          project_id: projectUuid,
          name: 'Invalid Sprint',
          start_date: '2026-10-20T00:00:00Z',
          end_date: '2026-10-10T00:00:00Z',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 Bad Request on invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sprints')
        .send({
          name: '',
          project_id: 'not-a-uuid',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/sprints', () => {
    it('should return sprint list with pagination meta', async () => {
      const paginatedResult = {
        data: [
          {
            id: validUuid,
            project_id: projectUuid,
            name: 'Sprint 1',
            status: 'PLANNED',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(sprintsService, 'findAll').mockResolvedValue(paginatedResult as any);

      const response = await request(app.getHttpServer())
        .get('/api/sprints?page=1&limit=20')
        .expect(200);

      expect(response.body).toEqual(paginatedResult);
    });
  });

  describe('GET /api/sprints/:id', () => {
    it('should return sprint by valid ID', async () => {
      const sprint = {
        id: validUuid,
        project_id: projectUuid,
        name: 'Sprint 1',
        status: 'PLANNED',
      };

      vi.spyOn(sprintsService, 'findOne').mockResolvedValue(sprint as any);

      const response = await request(app.getHttpServer())
        .get(`/api/sprints/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(sprint);
    });

    it('should return 400 Bad Request on invalid UUID parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sprints/not-a-valid-uuid')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/sprints/:id', () => {
    it('should update sprint on valid payload', async () => {
      const updatedSprint = {
        id: validUuid,
        name: 'Sprint 1 Updated',
        goal: 'Updated goal',
      };

      vi.spyOn(sprintsService, 'update').mockResolvedValue(updatedSprint as any);

      const response = await request(app.getHttpServer())
        .patch(`/api/sprints/${validUuid}`)
        .send({
          name: 'Sprint 1 Updated',
          goal: 'Updated goal',
        })
        .expect(200);

      expect(response.body).toEqual(updatedSprint);
    });
  });

  describe('Lifecycle Transitions (Start, Complete, Cancel)', () => {
    it('POST /api/sprints/:id/start should transition PLANNED -> ACTIVE', async () => {
      const startedSprint = { id: validUuid, status: 'ACTIVE' };
      vi.spyOn(sprintsService, 'start').mockResolvedValue(startedSprint as any);

      const response = await request(app.getHttpServer())
        .post(`/api/sprints/${validUuid}/start`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('POST /api/sprints/:id/start should return 409 Conflict if already COMPLETED', async () => {
      const { ConflictException } = await import('@nestjs/common');
      vi.spyOn(sprintsService, 'start').mockRejectedValue(
        new ConflictException('Cannot start sprint with status COMPLETED'),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/sprints/${validUuid}/start`)
        .expect(409);

      expect(response.body.statusCode).toBe(409);
    });

    it('POST /api/sprints/:id/complete should transition ACTIVE -> COMPLETED', async () => {
      const completedSprint = { id: validUuid, status: 'COMPLETED' };
      vi.spyOn(sprintsService, 'complete').mockResolvedValue(completedSprint as any);

      const response = await request(app.getHttpServer())
        .post(`/api/sprints/${validUuid}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('POST /api/sprints/:id/cancel should transition ACTIVE -> CANCELLED', async () => {
      const cancelledSprint = { id: validUuid, status: 'CANCELLED' };
      vi.spyOn(sprintsService, 'cancel').mockResolvedValue(cancelledSprint as any);

      const response = await request(app.getHttpServer())
        .post(`/api/sprints/${validUuid}/cancel`)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('DELETE /api/sprints/:id', () => {
    it('should delete a PLANNED sprint', async () => {
      const deleteResult = { message: 'Sprint deleted successfully', id: validUuid };
      vi.spyOn(sprintsService, 'remove').mockResolvedValue(deleteResult as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/sprints/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(deleteResult);
    });

    it('should return 409 Conflict when deleting a non-PLANNED sprint', async () => {
      const { ConflictException } = await import('@nestjs/common');
      vi.spyOn(sprintsService, 'remove').mockRejectedValue(
        new ConflictException('Only PLANNED sprints can be deleted'),
      );

      const response = await request(app.getHttpServer())
        .delete(`/api/sprints/${validUuid}`)
        .expect(409);

      expect(response.body.statusCode).toBe(409);
    });
  });
});
