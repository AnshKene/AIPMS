import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';
import { ProjectStatus } from './enums/project-status.enum.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const validUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const ownerUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project successfully', async () => {
      const mockProject = {
        id: validUuid,
        name: 'AIPMS',
        description: 'AI-Based System',
        status: 'PLANNING',
        start_date: '2026-09-25T00:00:00.000Z',
        end_date: '2026-12-31T00:00:00.000Z',
        owner_id: ownerUuid,
        created_at: '2026-09-25T20:00:00.000Z',
        updated_at: '2026-09-25T20:00:00.000Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const result = await service.create({
        name: 'AIPMS',
        description: 'AI-Based System',
        status: ProjectStatus.PLANNING,
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        ownerId: ownerUuid,
      });

      expect(result.id).toBe(validUuid);
      expect(result.name).toBe('AIPMS');
      expect(result.ownerId).toBe(ownerUuid);
    });

    it('should throw BadRequestException when end date is earlier than start date', async () => {
      await expect(
        service.create({
          name: 'Invalid Date Project',
          startDate: '2026-12-31T00:00:00.000Z',
          endDate: '2026-09-25T00:00:00.000Z',
          ownerId: ownerUuid,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of projects', async () => {
      const mockProjects = [
        {
          id: validUuid,
          name: 'AIPMS',
          status: 'PLANNING',
          owner_id: ownerUuid,
          created_at: '2026-09-25T20:00:00.000Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockProjects,
        count: 1,
        error: null,
      });
      const mockRange = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ range: mockRange });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a project by valid ID', async () => {
      const mockProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'PLANNING',
        owner_id: ownerUuid,
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockProject, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findOne(validUuid);
      expect(result.id).toBe(validUuid);
    });

    it('should throw BadRequestException on invalid UUID format', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when project is not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(service.findOne(validUuid)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const existingProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'PLANNING',
        owner_id: ownerUuid,
      };

      const updatedProject = {
        ...existingProject,
        name: 'AIPMS Updated',
        status: 'ACTIVE',
      };

      // Mock findOne first
      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.update(validUuid, {
        name: 'AIPMS Updated',
        status: ProjectStatus.ACTIVE,
      });

      expect(result.name).toBe('AIPMS Updated');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('archive', () => {
    it('should archive a project by setting status to ARCHIVED', async () => {
      const existingProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'PLANNING',
        owner_id: ownerUuid,
      };

      const archivedProject = {
        ...existingProject,
        status: 'ARCHIVED',
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: archivedProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.archive(validUuid);
      expect(result.status).toBe('ARCHIVED');
    });
  });
});
