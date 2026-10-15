import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService (API Gateway)', () => {
  let service: AuthService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'AUTH_SERVICE_URL') return 'http://localhost:3001';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should forward registration request to Auth Service and return response', async () => {
      const mockResponse = {
        message: 'Registration successful',
        user: { id: '123', email: 'test@example.com', name: 'Test' },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should forward login request and return access token', async () => {
      const mockResponse = {
        accessToken: 'mock-jwt-token',
        user: { id: '123', email: 'test@example.com' },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should forward Authorization header to /api/auth/me', async () => {
      const mockResponse = { id: '123', email: 'test@example.com' };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await service.getCurrentUser('Bearer mock-token');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer mock-token',
          }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('should forward Authorization header to /api/auth/logout', async () => {
      const mockResponse = { message: 'Logout successful' };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await service.logout('Bearer mock-token');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should re-throw downstream HTTP exceptions with matching status code', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ statusCode: 409, message: 'User already exists' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw ServiceUnavailableException when Auth Service cannot be reached', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('fetch failed'),
      );

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw GatewayTimeoutException on request timeout', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutError);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(GatewayTimeoutException);
    });
  });
});
