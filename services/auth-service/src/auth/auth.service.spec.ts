import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { Role } from './roles.enum.js';
import { AuditService } from '../audit/audit.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const mockAuditService = {
    recordEvent: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    queryLogs: vi.fn().mockResolvedValue({ items: [], meta: { total: 0 } }),
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
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' },
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.message).toBe('Registration successful');
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email is already registered', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered', status: 422 },
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on general signup error', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' },
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      await expect(
        service.register({
          email: 'test@example.com',
          password: '123',
          name: 'Weak Password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore role in registration payload for public signups and assign TEAM_MEMBER', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-hacker-999',
            email: 'hacker@example.com',
            user_metadata: { name: 'Hacker User' },
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      const result = await service.register({
        email: 'hacker@example.com',
        password: 'password123',
        name: 'Hacker User',
        role: 'ADMIN',
      } as any);

      expect(result.user.role).toBe(Role.TEAM_MEMBER);
    });
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: 1700000000,
          },
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' },
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signInWithPassword: mockSignIn },
      };

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });
      (service as any).supabase = {
        auth: { signInWithPassword: mockSignIn },
      };

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user info when valid token is provided', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' },
            created_at: '2026-09-25T20:00:00.000Z',
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await service.getCurrentUser('valid-token');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });
      (service as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      await expect(service.getCurrentUser('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is empty', async () => {
      await expect(service.getCurrentUser('')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should return success message on logout', async () => {
      const result = await service.logout('some-token');
      expect(result.message).toBe('Logout successful');
    });

    it('should throw UnauthorizedException when token is empty', async () => {
      await expect(service.logout('')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully and persist role', async () => {
      const updated = await service.updateUserRole('member-user-003', Role.PROJECT_MANAGER);
      expect(updated.role).toBe(Role.PROJECT_MANAGER);

      // Verify role persistence on listUsers
      const allUsers = await service.listUsers();
      const target = allUsers.find((u) => u.id === 'member-user-003');
      expect(target?.role).toBe(Role.PROJECT_MANAGER);
    });

    it('should reject invalid role enum values', async () => {
      await expect(
        service.updateUserRole('member-user-003', 'SUPERMAN' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not found', async () => {
      await expect(
        service.updateUserRole('non-existent-id', Role.PROJECT_MANAGER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent demoting the last active administrator', async () => {
      // admin-user-001 is the only initial ADMIN
      await expect(
        service.updateUserRole('admin-user-001', Role.TEAM_MEMBER),
      ).rejects.toThrow('Cannot demote the last active administrator');
    });

    it('should allow demoting an admin if multiple active administrators exist', async () => {
      // Promote member-user-003 to ADMIN first
      await service.updateUserRole('member-user-003', Role.ADMIN);

      // Now demoting admin-user-001 should succeed since member-user-003 is also an ADMIN
      const demoted = await service.updateUserRole('admin-user-001', Role.PROJECT_MANAGER);
      expect(demoted.role).toBe(Role.PROJECT_MANAGER);
    });
  });
});
