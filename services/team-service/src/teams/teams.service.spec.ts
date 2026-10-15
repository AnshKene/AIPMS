import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TeamsService } from './teams.service.js';
import { TeamRole } from './enums/team-role.enum.js';

describe('TeamsService', () => {
  let service: TeamsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const validTeamUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const validProjectUuid = 'e1b2c3d4-5678-40ab-b123-1234567890ab';
  const validUserUuid = 'f0a1b2c3-4567-49ab-a123-0123456789ab';
  const validMemberUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      const mockTeam = {
        id: validTeamUuid,
        project_id: validProjectUuid,
        name: 'Dev Team',
        description: 'Development team',
        created_at: '2026-09-25T20:00:00.000Z',
        updated_at: '2026-09-25T20:00:00.000Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockTeam, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const result = await service.createTeam({
        projectId: validProjectUuid,
        name: 'Dev Team',
        description: 'Development team',
      });

      expect(result.id).toBe(validTeamUuid);
      expect(result.projectId).toBe(validProjectUuid);
      expect(result.name).toBe('Dev Team');
    });

    it('should throw BadRequestException on invalid projectId UUID', async () => {
      await expect(
        service.createTeam({
          projectId: 'invalid-uuid',
          name: 'Dev Team',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllTeams', () => {
    it('should return paginated list of teams', async () => {
      const mockTeams = [
        {
          id: validTeamUuid,
          project_id: validProjectUuid,
          name: 'Dev Team',
          created_at: '2026-09-25T20:00:00.000Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTeams,
        count: 1,
        error: null,
      });
      const mockRange = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ range: mockRange });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findAllTeams({ page: 1, limit: 20 });

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOneTeam', () => {
    it('should return team by valid ID', async () => {
      const mockTeam = {
        id: validTeamUuid,
        project_id: validProjectUuid,
        name: 'Dev Team',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockTeam, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findOneTeam(validTeamUuid);
      expect(result.id).toBe(validTeamUuid);
    });

    it('should throw BadRequestException on invalid UUID', async () => {
      await expect(service.findOneTeam('bad-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when team not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(service.findOneTeam(validTeamUuid)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member to a team successfully', async () => {
      const mockTeam = { id: validTeamUuid, project_id: validProjectUuid, name: 'Dev Team' };
      const mockMember = {
        id: validMemberUuid,
        team_id: validTeamUuid,
        user_id: validUserUuid,
        role: 'TEAM_LEAD',
        created_at: '2026-09-25T20:00:00.000Z',
      };

      vi.spyOn(service, 'findOneTeam').mockResolvedValue(service['formatTeam'](mockTeam) as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: mockMember, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const result = await service.addMember(validTeamUuid, {
        userId: validUserUuid,
        role: TeamRole.TEAM_LEAD,
      });

      expect(result.id).toBe(validMemberUuid);
      expect(result.role).toBe('TEAM_LEAD');
    });

    it('should throw ConflictException on duplicate membership (code 23505)', async () => {
      const mockTeam = { id: validTeamUuid, project_id: validProjectUuid, name: 'Dev Team' };
      vi.spyOn(service, 'findOneTeam').mockResolvedValue(service['formatTeam'](mockTeam) as any);

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      await expect(
        service.addMember(validTeamUuid, {
          userId: validUserUuid,
          role: TeamRole.MEMBER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
