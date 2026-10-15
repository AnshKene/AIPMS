import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { RisksService } from '../src/risks/risks.service.js';

describe('Risk Service (e2e)', () => {
  let app: INestApplication;
  let risksService: RisksService;

  const validUuid = '11111111-1111-4111-a111-111111111111';
  const projectUuid = '22222222-2222-4222-a222-222222222222';
  const ownerUuid = '33333333-3333-4333-a333-333333333333';

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

    risksService = moduleFixture.get<RisksService>(RisksService);

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
      expect(response.body.service).toBe('AIPMS Risk Service');
    });
  });

  describe('POST /api/risks', () => {
    it('should create a risk on valid payload with calculated risk_score and default OPEN status', async () => {
      const createdRisk = {
        id: validUuid,
        project_id: projectUuid,
        title: 'Database Delay Risk',
        description: 'Detailed description',
        probability: 'MEDIUM',
        impact: 'HIGH',
        risk_score: 6,
        status: 'OPEN',
        mitigation_plan: 'Detailed mitigation plan',
        owner_id: ownerUuid,
        due_date: '2026-10-15T00:00:00Z',
        created_at: '2026-09-26T12:00:00Z',
        updated_at: '2026-09-26T12:00:00Z',
      };

      vi.spyOn(risksService, 'create').mockResolvedValue(createdRisk as any);

      const response = await request(app.getHttpServer())
        .post('/api/risks')
        .send({
          project_id: projectUuid,
          title: 'Database Delay Risk',
          description: 'Detailed description',
          probability: 'MEDIUM',
          impact: 'HIGH',
          mitigation_plan: 'Detailed mitigation plan',
          owner_id: ownerUuid,
          due_date: '2026-10-15T00:00:00Z',
        })
        .expect(201);

      expect(response.body).toEqual(createdRisk);
      expect(response.body.risk_score).toBe(6);
      expect(response.body.status).toBe('OPEN');
    });

    it('should return 400 Bad Request on invalid payload (missing project_id)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/risks')
        .send({
          title: 'Missing Project Risk',
          probability: 'MEDIUM',
          impact: 'HIGH',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 Bad Request on invalid enum value', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/risks')
        .send({
          project_id: projectUuid,
          title: 'Invalid Enum Risk',
          probability: 'EXTREME',
          impact: 'HIGH',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/risks', () => {
    it('should return risk list with pagination meta and support filtering', async () => {
      const paginatedResult = {
        data: [
          {
            id: validUuid,
            project_id: projectUuid,
            title: 'Database Delay Risk',
            probability: 'MEDIUM',
            impact: 'HIGH',
            risk_score: 6,
            status: 'OPEN',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(risksService, 'findAll').mockResolvedValue(paginatedResult as any);

      const response = await request(app.getHttpServer())
        .get(`/api/risks?project_id=${projectUuid}&status=OPEN&page=1&limit=20`)
        .expect(200);

      expect(response.body).toEqual(paginatedResult);
    });
  });

  describe('GET /api/risks/:id', () => {
    it('should return risk by valid ID', async () => {
      const risk = {
        id: validUuid,
        project_id: projectUuid,
        title: 'Database Delay Risk',
        risk_score: 6,
      };

      vi.spyOn(risksService, 'findOne').mockResolvedValue(risk as any);

      const response = await request(app.getHttpServer())
        .get(`/api/risks/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(risk);
    });

    it('should return 400 Bad Request on invalid UUID parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/risks/not-a-valid-uuid')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 404 Not Found when risk does not exist', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      vi.spyOn(risksService, 'findOne').mockRejectedValue(
        new NotFoundException(`Risk with ID '${validUuid}' not found`),
      );

      const response = await request(app.getHttpServer())
        .get(`/api/risks/${validUuid}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/risks/:id', () => {
    it('should update risk on valid payload', async () => {
      const updatedRisk = {
        id: validUuid,
        title: 'Updated Risk Title',
        status: 'MITIGATING',
        risk_score: 9,
      };

      vi.spyOn(risksService, 'update').mockResolvedValue(updatedRisk as any);

      const response = await request(app.getHttpServer())
        .patch(`/api/risks/${validUuid}`)
        .send({
          title: 'Updated Risk Title',
          status: 'MITIGATING',
          probability: 'HIGH',
          impact: 'HIGH',
        })
        .expect(200);

      expect(response.body).toEqual(updatedRisk);
    });
  });

  describe('DELETE /api/risks/:id', () => {
    it('should delete existing risk', async () => {
      const deleteResult = { message: 'Risk deleted successfully', id: validUuid };
      vi.spyOn(risksService, 'remove').mockResolvedValue(deleteResult as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/risks/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(deleteResult);
    });

    it('should return 404 Not Found when deleting non-existent risk', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      vi.spyOn(risksService, 'remove').mockRejectedValue(
        new NotFoundException(`Risk with ID '${validUuid}' not found`),
      );

      const response = await request(app.getHttpServer())
        .delete(`/api/risks/${validUuid}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });
});
