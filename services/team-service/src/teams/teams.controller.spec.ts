import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import { TeamRole } from './enums/team-role.enum.js';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: TeamsService;

  const mockTeamsService = {
    createTeam: vi.fn(),
    findAllTeams: vi.fn(),
    findOneTeam: vi.fn(),
    updateTeam: vi.fn(),
    removeTeam: vi.fn(),
    addMember: vi.fn(),
    findMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  };

  const validTeamUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const validProjectUuid = 'e1b2c3d4-5678-40ab-b123-1234567890ab';
  const validUserUuid = 'f0a1b2c3-4567-49ab-a123-0123456789ab';
  const validMemberUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const validAuthHeader = 'Bearer valid-jwt-token';

  it('should reject calls without Authorization header (DEFECT-06)', async () => {
    const dto = { projectId: validProjectUuid, name: 'Dev Team' };
    await expect(controller.createTeam(dto)).rejects.toThrow('Authentication token required');
    await expect(controller.findAllTeams({})).rejects.toThrow('Authentication token required');
    await expect(controller.findOneTeam(validTeamUuid)).rejects.toThrow('Authentication token required');
    await expect(controller.addMember(validTeamUuid, { userId: validUserUuid })).rejects.toThrow('Authentication token required');
    await expect(controller.removeMember(validTeamUuid, validMemberUuid)).rejects.toThrow('Authentication token required');
  });

  it('should call teamsService.createTeam with valid authHeader', async () => {
    const dto = { projectId: validProjectUuid, name: 'Dev Team' };
    const expected = { id: validTeamUuid, ...dto };
    mockTeamsService.createTeam.mockResolvedValue(expected);

    const result = await controller.createTeam(dto, validAuthHeader);
    expect(service.createTeam).toHaveBeenCalledWith(dto, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call teamsService.findAllTeams with valid authHeader', async () => {
    const query = { page: 1, limit: 20 };
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    mockTeamsService.findAllTeams.mockResolvedValue(expected);

    const result = await controller.findAllTeams(query, validAuthHeader);
    expect(service.findAllTeams).toHaveBeenCalledWith(query, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call teamsService.findOneTeam with valid authHeader', async () => {
    const expected = { id: validTeamUuid, name: 'Dev Team' };
    mockTeamsService.findOneTeam.mockResolvedValue(expected);

    const result = await controller.findOneTeam(validTeamUuid, validAuthHeader);
    expect(service.findOneTeam).toHaveBeenCalledWith(validTeamUuid, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call teamsService.addMember with valid authHeader', async () => {
    const dto = { userId: validUserUuid, role: TeamRole.TEAM_LEAD };
    const expected = { id: validMemberUuid, teamId: validTeamUuid, ...dto };
    mockTeamsService.addMember.mockResolvedValue(expected);

    const result = await controller.addMember(validTeamUuid, dto, validAuthHeader);
    expect(service.addMember).toHaveBeenCalledWith(validTeamUuid, dto, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call teamsService.removeMember with valid authHeader', async () => {
    const expected = { message: 'Team member removed successfully' };
    mockTeamsService.removeMember.mockResolvedValue(expected);

    const result = await controller.removeMember(validTeamUuid, validMemberUuid, validAuthHeader);
    expect(service.removeMember).toHaveBeenCalledWith(validTeamUuid, validMemberUuid, validAuthHeader);
    expect(result).toEqual(expected);
  });
});
