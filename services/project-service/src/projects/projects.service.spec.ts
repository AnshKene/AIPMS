import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ProjectsService, DESIGNATED_ADMIN_ID } from './projects.service.js';
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

    it('should automatically derive ownerId from verified auth session when omitted', async () => {
      const mockProject = {
        id: validUuid,
        name: 'Auto-Owner Project',
        description: 'Derived ownership',
        status: ProjectStatus.PLANNING,
        owner_id: ownerUuid,
        created_at: '2026-09-25T20:00:00.000Z',
        updated_at: '2026-09-25T20:00:00.000Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER', isProjectOwner: true } } },
        error: null,
      });

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        auth: { getUser: mockGetUser },
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      });

      const result = await service.create(
        {
          name: 'Auto-Owner Project',
          description: 'Derived ownership',
        },
        'Bearer mock-user-token',
      );

      expect(result.ownerId).toBe(ownerUuid);
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ owner_id: ownerUuid }),
      ]);
    });

    it('should reject attempted ownership spoofing when client supplies conflicting ownerId', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER', isProjectOwner: true } } },
        error: null,
      });

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      await expect(
        service.create(
          {
            name: 'Spoofed Project',
            ownerId: '99999999-9999-4999-a999-999999999999',
          },
          'Bearer mock-user-token',
        ),
      ).rejects.toThrow('Cannot create project on behalf of another user');
    });

    it('should reject invalid or expired Bearer token with UnauthorizedException and not fall back to dto.ownerId', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      await expect(
        service.create(
          {
            name: 'Attacker Project',
            ownerId: '99999999-9999-4999-a999-999999999999',
          },
          'Bearer expired-fake-token',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when auth getUser throws an error with UnauthorizedException', async () => {
      const mockGetUser = vi.fn().mockRejectedValue(new Error('Network or signature error'));

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      await expect(
        service.create(
          {
            name: 'Attacker Project',
            ownerId: '99999999-9999-4999-a999-999999999999',
          },
          'Bearer corrupted-token',
        ),
      ).rejects.toThrow(UnauthorizedException);
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
    it('should archive a project by setting status to ARCHIVED and previous_status to current status', async () => {
      const existingProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'PLANNING',
        owner_id: ownerUuid,
      };

      const archivedProject = {
        ...existingProject,
        status: 'ARCHIVED',
        previous_status: 'PLANNING',
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
      expect(result.previousStatus).toBe('PLANNING');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ARCHIVED',
          previous_status: 'PLANNING',
        }),
      );
    });

    it('should preserve existing previous_status when archiving an already ARCHIVED project', async () => {
      const existingArchivedProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'ARCHIVED',
        previous_status: 'PLANNING',
        owner_id: ownerUuid,
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingArchivedProject) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: existingArchivedProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      await service.archive(validUuid);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          previous_status: 'ARCHIVED',
        }),
      );
    });
  });

  describe('unarchive', () => {
    it.each([
      ['PLANNING', ProjectStatus.PLANNING],
      ['ACTIVE', ProjectStatus.ACTIVE],
      ['ON_HOLD', ProjectStatus.ON_HOLD],
      ['COMPLETED', ProjectStatus.COMPLETED],
    ])('should restore status to %s when unarchiving', async (statusName, statusEnum) => {
      const archivedProject = {
        id: validUuid,
        name: 'AIPMS',
        status: 'ARCHIVED',
        previous_status: statusEnum,
        owner_id: ownerUuid,
      };

      const restoredProject = {
        ...archivedProject,
        status: statusEnum,
        previous_status: null,
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](archivedProject) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: restoredProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.unarchive(validUuid);
      expect(result.status).toBe(statusEnum);
      expect(result.previousStatus).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: statusEnum,
          previous_status: null,
        }),
      );
    });

    it('should fall back to ACTIVE when unarchiving legacy project with NULL previous_status', async () => {
      const legacyArchivedProject = {
        id: validUuid,
        name: 'AIPMS Legacy',
        status: 'ARCHIVED',
        previous_status: null,
        owner_id: ownerUuid,
      };

      const restoredProject = {
        ...legacyArchivedProject,
        status: 'ACTIVE',
        previous_status: null,
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](legacyArchivedProject) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: restoredProject, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.unarchive(validUuid);
      expect(result.status).toBe('ACTIVE');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ACTIVE',
          previous_status: null,
        }),
      );
    });

    it.each([
      ['PLANNING', ProjectStatus.PLANNING],
      ['ACTIVE', ProjectStatus.ACTIVE],
      ['ON_HOLD', ProjectStatus.ON_HOLD],
      ['COMPLETED', ProjectStatus.COMPLETED],
    ])('should throw BadRequestException when trying to unarchive a non-archived %s project', async (_, statusEnum) => {
      const nonArchivedProject = {
        id: validUuid,
        name: 'Active Project',
        status: statusEnum,
        owner_id: ownerUuid,
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](nonArchivedProject) as any);

      await expect(service.unarchive(validUuid)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Project Owner authorization', () => {
    const otherUserUuid = 'b2c3d4e5-6789-41bc-a234-2345678901bc';
    const adminUuid = '66544acc-4e3d-4b3b-b3f3-44971c6a9347';

    describe('create with role enforcement', () => {
      it('should reject project creation by VIEWER role with ForbiddenException', async () => {
        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'VIEWER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.create({ name: 'Viewer Project' }, 'Bearer viewer-token'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow ADMIN to specify another user as initial ownerId', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Admin Delegated Project',
          owner_id: otherUserUuid,
          status: 'PLANNING',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockProject, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

        const mockGetUser = vi.fn().mockResolvedValue({
          data: {
            user: {
              id: adminUuid,
              email: 'admin.ansh@aipms.com',
              app_metadata: { role: 'ADMIN' },
            },
          },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ insert: mockInsert }),
        });

        const result = await service.create(
          { name: 'Admin Delegated Project', ownerId: otherUserUuid },
          'Bearer admin-token',
        );

        expect(result.ownerId).toBe(otherUserUuid);
      });
    });

    describe('update with ownership enforcement', () => {
      it('should reject arbitrary attempt to change ownerId via update payload', async () => {
        await expect(
          service.update(validUuid, { name: 'Attempted Hijack', ownerId: otherUserUuid } as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow project owner to update settings on their own project', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Owner Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };
        const updatedProject = {
          ...existingProject,
          name: 'Owner Project Updated',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockSingle = vi.fn().mockResolvedValue({ data: updatedProject, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ update: mockUpdate }),
        });

        const result = await service.update(
          validUuid,
          { name: 'Owner Project Updated' },
          'Bearer owner-token',
        );

        expect(result.name).toBe('Owner Project Updated');
      });

      it('should deny a non-owner Project Manager on another user project with ForbiddenException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Other User Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.update(validUuid, { name: 'Unauthorized Update' }, 'Bearer other-pm-token'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should deny VIEWER role from updating project settings with ForbiddenException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'VIEWER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.update(validUuid, { name: 'Viewer Update' }, 'Bearer viewer-token'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow System Admin to update any project settings', async () => {
        const existingProject = {
          id: validUuid,
          name: 'User Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };
        const updatedProject = {
          ...existingProject,
          name: 'Admin Overridden Name',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockSingle = vi.fn().mockResolvedValue({ data: updatedProject, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        const mockGetUser = vi.fn().mockResolvedValue({
          data: {
            user: {
              id: adminUuid,
              email: 'admin.ansh@aipms.com',
              app_metadata: { role: 'ADMIN' },
            },
          },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ update: mockUpdate }),
        });

        const result = await service.update(
          validUuid,
          { name: 'Admin Overridden Name' },
          'Bearer admin-token',
        );

        expect(result.name).toBe('Admin Overridden Name');
      });
    });

    describe('archive and unarchive with ownership enforcement', () => {
      it('should deny non-owner from archiving project with ForbiddenException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.archive(validUuid, 'Bearer other-user-token'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should deny non-owner from unarchiving project with ForbiddenException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'ARCHIVED',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.unarchive(validUuid, 'Bearer other-user-token'),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('transferOwnership', () => {
      it('should allow owner to transfer ownership to another user', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };
        const transferredProject = {
          ...existingProject,
          owner_id: otherUserUuid,
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockSingle = vi.fn().mockResolvedValue({ data: transferredProject, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ update: mockUpdate }),
        });

        const result = await service.transferOwnership(
          validUuid,
          { newOwnerId: otherUserUuid },
          'Bearer owner-token',
        );

        expect(result.ownerId).toBe(otherUserUuid);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ owner_id: otherUserUuid }),
        );
      });

      it('should deny non-owner from transferring project ownership with ForbiddenException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.transferOwnership(
            validUuid,
            { newOwnerId: 'c3d4e5f6-7890-42cd-a345-3456789012cd' },
            'Bearer non-owner-token',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject ownership transfer of an archived project with BadRequestException', async () => {
        const existingArchived = {
          id: validUuid,
          name: 'Archived Project',
          owner_id: ownerUuid,
          status: 'ARCHIVED',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingArchived) as any);

        await expect(
          service.transferOwnership(validUuid, { newOwnerId: otherUserUuid }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject invalid newOwnerId format with BadRequestException', async () => {
        await expect(
          service.transferOwnership(validUuid, { newOwnerId: 'not-a-valid-uuid' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ownership transfer to the current owner with BadRequestException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        await expect(
          service.transferOwnership(validUuid, { newOwnerId: ownerUuid }),
        ).rejects.toThrow('The specified user is already the current owner of this project.');
      });

      it('should reject ownership transfer to the System Administrator with BadRequestException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        await expect(
          service.transferOwnership(validUuid, { newOwnerId: DESIGNATED_ADMIN_ID }),
        ).rejects.toThrow('The System Administrator cannot be designated as a project owner.');
      });

      it('should reject ownership transfer to a VIEWER member with BadRequestException', async () => {
        const existingProject = {
          id: validUuid,
          name: 'Project',
          owner_id: ownerUuid,
          status: 'PLANNING',
        };
        const viewerTargetId = '99999999-9999-4999-a999-999999999999';

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](existingProject) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'project_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { user_id: viewerTargetId, role: 'VIEWER' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.transferOwnership(validUuid, { newOwnerId: viewerTargetId }, 'Bearer owner-token'),
        ).rejects.toThrow('Viewers cannot be designated as project owners.');
      });
    });

    describe('project creation RBAC enforcement', () => {
      it('should deny TEAM_MEMBER from creating projects with ForbiddenException', async () => {
        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: 'member-user-1', app_metadata: { role: 'TEAM_MEMBER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        });

        await expect(
          service.create({ name: 'Unauthorized Team Member Project' }, 'Bearer token-member'),
        ).rejects.toThrow('Team Members cannot create projects.');
      });

      it('should deny PROJECT_MANAGER from creating projects by default with ForbiddenException', async () => {
        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: 'pm-user-1', app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        });

        await expect(
          service.create({ name: 'Unauthorized PM Project' }, 'Bearer token-pm'),
        ).rejects.toThrow('Project Managers cannot create projects by default.');
      });

      it('should deny VIEWER from creating projects with ForbiddenException', async () => {
        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: 'viewer-user-1', app_metadata: { role: 'VIEWER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.create({ name: 'Unauthorized Viewer Project' }, 'Bearer token-viewer'),
        ).rejects.toThrow('Viewers have read-only access and cannot create projects.');
      });
    });

    describe('project_members management', () => {
      const pmUserUuid = 'c3d4e5f6-7890-42cd-a345-3456789012cd';

      it('should allow project owner to assign a Project Manager', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
          error: null,
        });

        const mockInsertedMember = {
          id: 'mem-1',
          project_id: validUuid,
          user_id: pmUserUuid,
          role: 'PROJECT_MANAGER',
          created_at: '2026-10-26T00:00:00Z',
          created_by: ownerUuid,
        };

        const mockInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInsertedMember, error: null }),
          }),
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ insert: mockInsert }),
        });

        const result = await service.addMember(
          validUuid,
          { userId: pmUserUuid },
          'Bearer owner-token',
        );

        expect(result.userId).toBe(pmUserUuid);
        expect(result.role).toBe('PROJECT_MANAGER');
      });

      it('should gracefully fallback and assign member when created_by column is missing from schema cache', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
          error: null,
        });

        const mockInsertedMember = {
          id: 'mem-1',
          project_id: validUuid,
          user_id: pmUserUuid,
          role: 'PROJECT_MANAGER',
          created_at: '2026-10-26T00:00:00Z',
        };

        let insertCallCount = 0;
        const mockInsert = vi.fn().mockImplementation((payload) => {
          insertCallCount++;
          if (insertCallCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Could not find the 'created_by' column of 'project_members' in the schema cache" },
                }),
              }),
            };
          }
          expect(payload[0].created_by).toBeUndefined();
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsertedMember, error: null }),
            }),
          };
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ insert: mockInsert }),
        });

        const result = await service.addMember(
          validUuid,
          { userId: pmUserUuid },
          'Bearer owner-token',
        );

        expect(insertCallCount).toBe(2);
        expect(result.userId).toBe(pmUserUuid);
        expect(result.role).toBe('PROJECT_MANAGER');
      });

      it('should deny non-owner from assigning project members with ForbiddenException', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.addMember(
            validUuid,
            { userId: pmUserUuid },
            'Bearer non-owner-token',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject assigning System Admin as a project member', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.addMember(
            validUuid,
            { userId: '66544acc-4e3d-4b3b-b3f3-44971c6a9347' },
            'Bearer owner-token',
          ),
        ).rejects.toThrow('The System Administrator cannot be assigned as a project member.');
      });

      it('should reject assigning the project owner as a project member', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.addMember(
            validUuid,
            { userId: ownerUuid },
            'Bearer owner-token',
          ),
        ).rejects.toThrow('The project owner cannot be added as a project member. Ownership is already established.');
      });

      it('should allow owner to remove a project member', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: ownerUuid, app_metadata: { role: 'PROJECT_OWNER' } } },
          error: null,
        });

        const mockDelete = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn().mockReturnValue({ delete: mockDelete }),
        });

        const result = await service.removeMember(
          validUuid,
          pmUserUuid,
          'Bearer owner-token',
        );

        expect(result.message).toBe('Project member removed successfully');
      });

      it('should deny non-owner from removing a project member', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Test Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatProject'](mockProject) as any);

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: otherUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        await expect(
          service.removeMember(
            validUuid,
            pmUserUuid,
            'Bearer non-owner-token',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow assigned Project Manager to access and view their assigned project', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Assigned PM Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: pmUserUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn((table: string) => {
            if (table === 'projects') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
                  }),
                }),
              };
            }
            if (table === 'project_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: 'mem-1', role: 'PROJECT_MANAGER' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }),
        });

        const result = await service.findOne(validUuid, 'Bearer pm-token');
        expect(result.id).toBe(validUuid);
        expect(result.name).toBe('Assigned PM Project');
      });

      it('should deny unassigned Project Manager from accessing a project even when knowing the UUID', async () => {
        const mockProject = {
          id: validUuid,
          name: 'Unassigned PM Project',
          owner_id: ownerUuid,
          status: 'ACTIVE',
        };

        const unassignedPmUuid = 'b1c2d3e4-5678-49ab-a012-123456789012';

        const mockGetUser = vi.fn().mockResolvedValue({
          data: { user: { id: unassignedPmUuid, app_metadata: { role: 'PROJECT_MANAGER' } } },
          error: null,
        });

        (service as any).getSupabaseClient = vi.fn().mockReturnValue({
          auth: { getUser: mockGetUser },
          from: vi.fn((table: string) => {
            if (table === 'projects') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
                  }),
                }),
              };
            }
            if (table === 'project_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }),
        });

        await expect(
          service.findOne(validUuid, 'Bearer unassigned-pm-token'),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});

