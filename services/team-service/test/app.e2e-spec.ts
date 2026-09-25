import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { TeamsService } from '../src/teams/teams.service.js';

describe('Team Service (e2e)', () => {
  let app: INestApplication;
  let teamsService: TeamsService;

  const validTeamUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const validProjectUuid = 'e1b2c3d4-5678-40ab-b123-1234567890ab';
  const validUserUuid = 'f0a1b2c3-4567-49ab-a123-0123456789ab';
  const validMemberUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

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

    teamsService = moduleFixture.get<TeamsService>(TeamsService);

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
      expect(response.body.service).toBe('AIPMS Team Service');
    });
  });

  describe('POST /api/teams', () => {
    it('should create a team on valid payload', async () => {
      const createdTeam = {
        id: validTeamUuid,
        projectId: validProjectUuid,
        name: 'Dev Team',
        description: 'AIPMS dev team',
        createdAt: '2026-09-25T20:00:00.000Z',
        updatedAt: '2026-09-25T20:00:00.000Z',
      };

      vi.spyOn(teamsService, 'createTeam').mockResolvedValue(createdTeam as any);

      const response = await request(app.getHttpServer())
        .post('/api/teams')
        .send({
          projectId: validProjectUuid,
          name: 'Dev Team',
          description: 'AIPMS dev team',
        })
        .expect(201);

      expect(response.body).toEqual(createdTeam);
    });

    it('should return 400 Bad Request on invalid UUID or missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/teams')
        .send({
          projectId: 'invalid-uuid',
          name: '',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/teams', () => {
    it('should return paginated list of teams', async () => {
      const result = {
        data: [{ id: validTeamUuid, name: 'Dev Team' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(teamsService, 'findAllTeams').mockResolvedValue(result as any);

      const response = await request(app.getHttpServer())
        .get('/api/teams?page=1&limit=20')
        .expect(200);

      expect(response.body).toEqual(result);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team by valid ID', async () => {
      const team = { id: validTeamUuid, name: 'Dev Team' };
      vi.spyOn(teamsService, 'findOneTeam').mockResolvedValue(team as any);

      const response = await request(app.getHttpServer())
        .get(`/api/teams/${validTeamUuid}`)
        .expect(200);

      expect(response.body).toEqual(team);
    });

    it('should return 400 Bad Request on invalid UUID parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/teams/not-a-valid-uuid')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/teams/:teamId/members', () => {
    it('should add a member on valid payload', async () => {
      const createdMember = {
        id: validMemberUuid,
        teamId: validTeamUuid,
        userId: validUserUuid,
        role: 'TEAM_LEAD',
        createdAt: '2026-09-25T20:00:00.000Z',
      };

      vi.spyOn(teamsService, 'addMember').mockResolvedValue(createdMember as any);

      const response = await request(app.getHttpServer())
        .post(`/api/teams/${validTeamUuid}/members`)
        .send({
          userId: validUserUuid,
          role: 'TEAM_LEAD',
        })
        .expect(201);

      expect(response.body).toEqual(createdMember);
    });

    it('should return 400 Bad Request on invalid role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/teams/${validTeamUuid}/members`)
        .send({
          userId: validUserUuid,
          role: 'INVALID_ROLE',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/teams/:teamId/members', () => {
    it('should return members of a team', async () => {
      const result = {
        data: [{ id: validMemberUuid, userId: validUserUuid, role: 'MEMBER' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(teamsService, 'findMembers').mockResolvedValue(result as any);

      const response = await request(app.getHttpServer())
        .get(`/api/teams/${validTeamUuid}/members`)
        .expect(200);

      expect(response.body).toEqual(result);
    });
  });

  describe('DELETE /api/teams/:teamId/members/:memberId', () => {
    it('should remove member from team', async () => {
      const responseMessage = { message: 'Team member removed successfully' };
      vi.spyOn(teamsService, 'removeMember').mockResolvedValue(responseMessage as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/teams/${validTeamUuid}/members/${validMemberUuid}`)
        .expect(200);

      expect(response.body).toEqual(responseMessage);
    });
  });
});
