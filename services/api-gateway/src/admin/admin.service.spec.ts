import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { AdminService } from './admin.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let configService: ConfigService;

  const mockConfigValues: Record<string, string | number> = {
    AUTH_SERVICE_URL: 'http://aipms-auth-service:3001',
    PROJECT_SERVICE_URL: 'http://aipms-project-service:3002',
    TEAM_SERVICE_URL: 'http://aipms-team-service:3003',
    TASK_SERVICE_URL: 'http://aipms-task-service:3004',
    SPRINT_SERVICE_URL: 'http://aipms-sprint-service:3005',
    RISK_SERVICE_URL: 'http://aipms-risk-service:3006',
    REPORTING_SERVICE_URL: 'http://aipms-reporting-service:3007',
    AI_SERVICE_URL: 'http://aipms-ai-service:3009',
    PORT: 3000,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultVal?: unknown) => mockConfigValues[key] ?? defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceBaseUrl', () => {
    it('should resolve downstream URLs from environment variables when configured', () => {
      expect(service.getServiceBaseUrl('auth-service', 3001)).toBe('http://aipms-auth-service:3001');
      expect(service.getServiceBaseUrl('project-service', 3002)).toBe('http://aipms-project-service:3002');
      expect(service.getServiceBaseUrl('team-service', 3003)).toBe('http://aipms-team-service:3003');
      expect(service.getServiceBaseUrl('task-service', 3004)).toBe('http://aipms-task-service:3004');
      expect(service.getServiceBaseUrl('sprint-service', 3005)).toBe('http://aipms-sprint-service:3005');
      expect(service.getServiceBaseUrl('risk-service', 3006)).toBe('http://aipms-risk-service:3006');
      expect(service.getServiceBaseUrl('reporting-service', 3007)).toBe('http://aipms-reporting-service:3007');
      expect(service.getServiceBaseUrl('ai-service', 3009)).toBe('http://aipms-ai-service:3009');
    });

    it('should strip trailing slashes from configured environment URLs', () => {
      vi.spyOn(configService, 'get').mockReturnValue('http://custom-auth:8080///' as any);
      expect(service.getServiceBaseUrl('auth-service', 3001)).toBe('http://custom-auth:8080');
    });

    it('should fallback to localhost:port for local development when env var is unset', () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined as any);
      expect(service.getServiceBaseUrl('auth-service', 3001)).toBe('http://localhost:3001');
      expect(service.getServiceBaseUrl('project-service', 3002)).toBe('http://localhost:3002');
    });
  });

  describe('checkAllServicesHealth', () => {
    it('should check health using configured DNS URLs and mark healthy services', async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      vi.stubGlobal('fetch', globalFetch);

      const health = await service.checkAllServicesHealth();

      expect(health.status).toBe('HEALTHY');
      expect(health.summary.healthy).toBe(9);
      expect(health.summary.offline).toBe(0);

      const authCheck = health.services.find((s) => s.service === 'auth-service');
      expect(authCheck).toBeDefined();
      expect(authCheck?.url).toBe('http://aipms-auth-service:3001/api/health');
    });

    it('should handle offline and degraded services gracefully without throwing', async () => {
      const globalFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('auth-service')) {
          return Promise.reject(new Error('Connection refused'));
        }
        if (url.includes('risk-service')) {
          return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: 'ok' }) });
      });
      vi.stubGlobal('fetch', globalFetch);

      const health = await service.checkAllServicesHealth();

      expect(health.summary.offline).toBe(1);
      expect(health.summary.degraded).toBe(1);
      expect(health.summary.healthy).toBe(7);
      expect(health.status).toBe('DEGRADED');
    });
  });

  describe('getAdminOverview', () => {
    it('should fetch metrics from configured downstream URLs', async () => {
      const globalFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: 'ok' }) });
        }
        if (url.includes('/api/auth/users')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [
              { id: 'u-1', email: 'admin@aipms.com', role: 'ADMIN' },
              { id: 'u-2', email: 'dev@aipms.com', role: 'TEAM_MEMBER' },
            ],
          });
        }
        if (url.includes('/api/projects')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 'p-1' }] });
        }
        if (url.includes('/api/teams')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 't-1' }] });
        }
        if (url.includes('/api/auth/audit-logs')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });
      vi.stubGlobal('fetch', globalFetch);

      const overview = await service.getAdminOverview('Bearer token');

      expect(overview.metrics.totalUsers).toBe(2);
      expect(overview.metrics.roleBreakdown.ADMIN).toBe(1);
      expect(overview.metrics.roleBreakdown.TEAM_MEMBER).toBe(1);
      expect(overview.metrics.totalProjects).toBe(1);
      expect(overview.metrics.totalTeams).toBe(1);
    });

    it('should return safe fallback counts if downstream services are unreachable', async () => {
      const globalFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', globalFetch);

      const overview = await service.getAdminOverview('Bearer token');

      expect(overview.metrics.totalUsers).toBe(0);
      expect(overview.metrics.totalProjects).toBe(0);
      expect(overview.metrics.totalTeams).toBe(0);
    });
  });

  describe('getAuditLogs', () => {
    it('should call configured auth-service URL for audit logs', async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ id: 'a-1' }], meta: { total: 1 } }),
      });
      vi.stubGlobal('fetch', globalFetch);

      const res = await service.getAuditLogs({ limit: '10' }, 'Bearer token');

      expect(globalFetch).toHaveBeenCalledWith(
        'http://aipms-auth-service:3001/api/auth/audit-logs?limit=10',
        expect.objectContaining({ headers: { authorization: 'Bearer token' } }),
      );
      expect(res.items.length).toBe(1);
    });
  });
});
