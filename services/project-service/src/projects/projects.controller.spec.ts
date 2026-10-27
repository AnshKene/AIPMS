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
    unarchive: vi.fn(),
    transferOwnership: vi.fn(),
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

  const validAuthHeader = 'Bearer valid-jwt-token';

  it('should reject calls without Authorization header (DEFECT-06)', async () => {
    const dto = { name: 'AIPMS' };
    await expect(controller.create(dto as any)).rejects.toThrow('Authentication token required');
    await expect(controller.findAll({})).rejects.toThrow('Authentication token required');
    await expect(controller.findOne(validUuid)).rejects.toThrow('Authentication token required');
    await expect(controller.update(validUuid, dto)).rejects.toThrow('Authentication token required');
    await expect(controller.archive(validUuid)).rejects.toThrow('Authentication token required');
    await expect(controller.unarchive(validUuid)).rejects.toThrow('Authentication token required');
    await expect(controller.transferOwnership(validUuid, { newOwnerId: 'any-id' })).rejects.toThrow('Authentication token required');
  });

  it('should call projectsService.create with valid authHeader', async () => {
    const dto = {
      name: 'AIPMS',
      status: ProjectStatus.PLANNING,
      ownerId: ownerUuid,
    };
    const expected = { id: validUuid, ...dto };
    mockProjectsService.create.mockResolvedValue(expected);

    const result = await controller.create(dto as any, validAuthHeader);
    expect(service.create).toHaveBeenCalledWith(dto, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.findAll with valid authHeader', async () => {
    const query = { page: 1, limit: 20 };
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    mockProjectsService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query, validAuthHeader);
    expect(service.findAll).toHaveBeenCalledWith(query, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.findOne with valid authHeader', async () => {
    const expected = { id: validUuid, name: 'AIPMS' };
    mockProjectsService.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(validUuid, validAuthHeader);
    expect(service.findOne).toHaveBeenCalledWith(validUuid, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.update with valid authHeader', async () => {
    const dto = { name: 'AIPMS Updated' };
    const expected = { id: validUuid, name: 'AIPMS Updated' };
    mockProjectsService.update.mockResolvedValue(expected);

    const result = await controller.update(validUuid, dto, validAuthHeader);
    expect(service.update).toHaveBeenCalledWith(validUuid, dto, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.archive with valid authHeader', async () => {
    const expected = { id: validUuid, status: 'ARCHIVED' };
    mockProjectsService.archive.mockResolvedValue(expected);

    const result = await controller.archive(validUuid, validAuthHeader);
    expect(service.archive).toHaveBeenCalledWith(validUuid, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.unarchive with valid authHeader', async () => {
    const expected = { id: validUuid, status: 'ACTIVE' };
    mockProjectsService.unarchive.mockResolvedValue(expected);

    const result = await controller.unarchive(validUuid, validAuthHeader);
    expect(service.unarchive).toHaveBeenCalledWith(validUuid, validAuthHeader);
    expect(result).toEqual(expected);
  });

  it('should call projectsService.transferOwnership with valid authHeader', async () => {
    const newOwnerUuid = 'b2c3d4e5-6789-41bc-c234-2345678901bc';
    const dto = { newOwnerId: newOwnerUuid };
    const expected = { id: validUuid, ownerId: newOwnerUuid };
    mockProjectsService.transferOwnership.mockResolvedValue(expected);

    const result = await controller.transferOwnership(validUuid, dto, validAuthHeader);
    expect(service.transferOwnership).toHaveBeenCalledWith(validUuid, dto, validAuthHeader);
    expect(result).toEqual(expected);
  });
});
