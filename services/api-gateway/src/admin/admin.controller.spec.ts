import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminService = {
    getAdminOverview: vi.fn().mockResolvedValue({
      metrics: {
        totalUsers: 4,
        roleBreakdown: { ADMIN: 1, PROJECT_MANAGER: 1, TEAM_MEMBER: 1, VIEWER: 1 },
        totalProjects: 7,
        totalTeams: 2,
        systemHealth: 'HEALTHY',
        servicesHealthy: '9/9',
      },
      recentActivity: [],
      healthSummary: { healthy: 9, degraded: 0, offline: 0, total: 9 },
      timestamp: new Date().toISOString(),
    }),
    getAuditLogs: vi.fn().mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
    }),
    checkAllServicesHealth: vi.fn().mockResolvedValue({
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      services: [],
      summary: { healthy: 9, degraded: 0, offline: 0, total: 9 },
    }),
    getWorkspaces: vi.fn().mockResolvedValue({
      projects: [],
      teams: [],
      meta: { totalProjects: 0, totalTeams: 0 },
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return admin overview metrics', async () => {
    const res = await controller.getOverview('Bearer mock-token');
    expect(res.metrics.totalUsers).toBe(4);
    expect(res.metrics.systemHealth).toBe('HEALTHY');
    expect(mockAdminService.getAdminOverview).toHaveBeenCalled();
  });

  it('should query audit logs with filters', async () => {
    const res = await controller.getAuditLogs('ROLE_ASSIGNED', 'admin-001', 'test', '1', '10', 'Bearer mock-token');
    expect(res.meta.total).toBe(0);
    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(
      { action: 'ROLE_ASSIGNED', actorId: 'admin-001', search: 'test', page: '1', limit: '10' },
      'Bearer mock-token',
    );
  });

  it('should return aggregated system health checks', async () => {
    const res = await controller.getSystemHealth();
    expect(res.status).toBe('HEALTHY');
    expect(mockAdminService.checkAllServicesHealth).toHaveBeenCalled();
  });

  it('should return workspace governance details', async () => {
    const res = await controller.getWorkspaces('Bearer mock-token');
    expect(res.meta.totalProjects).toBe(0);
    expect(mockAdminService.getWorkspaces).toHaveBeenCalledWith('Bearer mock-token');
  });
});
