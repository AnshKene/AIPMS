import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ProjectStatus } from './enums/project-status.enum.js';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockProjectsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  const validUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const ownerUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call projectsService.create', async () => {
    const dto = {
      name: 'AIPMS',
      status: ProjectStatus.PLANNING,
      ownerId: ownerUuid,
    };
    const expected = { id: validUuid, ...dto };
    mockProjectsService.create.mockResolvedValue(expected);

    const result = await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.findAll', async () => {
    const query = { page: 1, limit: 20 };
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    mockProjectsService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.findOne', async () => {
    const expected = { id: validUuid, name: 'AIPMS' };
    mockProjectsService.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(validUuid);
    expect(service.findOne).toHaveBeenCalledWith(validUuid);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.update', async () => {
    const dto = { name: 'AIPMS Updated' };
    const expected = { id: validUuid, name: 'AIPMS Updated' };
    mockProjectsService.update.mockResolvedValue(expected);

    const result = await controller.update(validUuid, dto);
    expect(service.update).toHaveBeenCalledWith(validUuid, dto);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.archive', async () => {
    const expected = { id: validUuid, status: 'ARCHIVED' };
    mockProjectsService.archive.mockResolvedValue(expected);

    const result = await controller.archive(validUuid);
    expect(service.archive).toHaveBeenCalledWith(validUuid);
    expect(result).toEqual(expected);
  });
});
