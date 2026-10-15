import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';
import { ProxyService } from '../common/services/proxy.service.js';
import type { Request } from 'express';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'PROJECT_SERVICE_URL') return 'http://localhost:3002';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        ProxyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward request to Project Service', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/projects',
      headers: { authorization: 'Bearer token-123' },
    } as unknown as Request;

    const mockResponseData = [{ id: 'p-1', name: 'Project 1' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.forward(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3002/api/projects',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('should throw ServiceUnavailableException when Project Service fails to connect', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/projects',
      headers: {},
    } as unknown as Request;

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(service.forward(mockRequest)).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw GatewayTimeoutException when Project Service times out', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/projects',
      headers: {},
    } as unknown as Request;

    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'TimeoutError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutError);

    await expect(service.forward(mockRequest)).rejects.toThrow(GatewayTimeoutException);
  });
});
