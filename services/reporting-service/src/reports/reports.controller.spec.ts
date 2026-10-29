import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const validProjectId = '11111111-1111-4111-a111-111111111111';
  const validAuthHeader = 'Bearer valid-jwt-token';

  const mockReportsService = {
    getProjectOverview: vi.fn().mockResolvedValue({ projectId: validProjectId }),
    getTasksReport: vi.fn().mockResolvedValue({ projectId: validProjectId }),
    getSprintsReport: vi.fn().mockResolvedValue({ projectId: validProjectId }),
    getRisksReport: vi.fn().mockResolvedValue({ projectId: validProjectId }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Authentication Enforcement (DEFECT-06)', () => {
    it('should throw UnauthorizedException when authHeader is missing on getProjectOverview', async () => {
      await expect(controller.getProjectOverview(validProjectId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when authHeader is not Bearer on getTasksReport', async () => {
      await expect(
        controller.getTasksReport(validProjectId, 'Basic token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Bearer token is empty on getSprintsReport', async () => {
      await expect(
        controller.getSprintsReport(validProjectId, 'Bearer '),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when authHeader is missing on getRisksReport', async () => {
      await expect(controller.getRisksReport(validProjectId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should successfully call service when valid authHeader is provided', async () => {
      const result = await controller.getProjectOverview(
        validProjectId,
        validAuthHeader,
      );
      expect(result).toEqual({ projectId: validProjectId });
      expect(service.getProjectOverview).toHaveBeenCalledWith(
        validProjectId,
        validAuthHeader,
      );
    });
  });
});
