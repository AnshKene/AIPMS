import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
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

    it('should persist role changes durably to Supabase app_metadata via admin client', async () => {
      const mockUpdateUserById = vi.fn().mockResolvedValue({ error: null });
      (service as any).adminSupabase = {
        auth: {
          admin: {
            updateUserById: mockUpdateUserById,
          },
        },
      };

      const result = await service.updateUserRole('member-user-003', Role.PROJECT_MANAGER);
      expect(result.role).toBe(Role.PROJECT_MANAGER);
      expect(mockUpdateUserById).toHaveBeenCalledWith('member-user-003', {
        app_metadata: { role: Role.PROJECT_MANAGER },
      });
    });

    it('should fail safely when Supabase role persistence fails and NOT alter local user role', async () => {
      const mockUpdateUserById = vi.fn().mockResolvedValue({
        error: { message: 'Database connection failed' },
      });
      (service as any).adminSupabase = {
        auth: {
          admin: {
            updateUserById: mockUpdateUserById,
          },
        },
      };

      // Attempting to promote member-user-003 to ADMIN when DB write fails
      await expect(
        service.updateUserRole('member-user-003', Role.ADMIN),
      ).rejects.toThrow(InternalServerErrorException);

      // Ensure permissions were not silently granted
      const allUsers = await service.listUsers();
      const target = allUsers.find((u) => u.id === 'member-user-003');
      expect(target?.role).toBe(Role.TEAM_MEMBER);
    });

    it('should reject unauthorized role changes when requester is not an administrator', async () => {
      await expect(
        service.updateUserRole('member-user-003', Role.ADMIN, Role.TEAM_MEMBER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateUserRole('member-user-003', Role.ADMIN, Role.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateUserRole('member-user-003', Role.ADMIN, Role.PROJECT_MANAGER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow authorized role changes when requester is an administrator', async () => {
      const result = await service.updateUserRole(
        'member-user-003',
        Role.PROJECT_MANAGER,
        Role.ADMIN,
        'admin-user-001',
      );
      expect(result.role).toBe(Role.PROJECT_MANAGER);
    });
  });

  describe('security: client metadata spoofing & restart survival', () => {
    it('should ignore client-editable user_metadata when determining role during login', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'spoof-token',
            refresh_token: 'spoof-refresh',
            expires_at: 1700000000,
          },
          user: {
            id: 'untrusted-client-user',
            email: 'untrusted@example.com',
            user_metadata: { name: 'Attacker', role: 'ADMIN' }, // Spoofed client metadata
            app_metadata: {}, // Authoritative app_metadata lacks admin role
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signInWithPassword: mockSignIn },
      };

      const result = await service.login({
        email: 'untrusted@example.com',
        password: 'password123',
      });

      // Role must strictly be TEAM_MEMBER, never elevated to ADMIN from user_metadata
      expect(result.user.role).toBe(Role.TEAM_MEMBER);
    });

    it('should ignore client-editable user_metadata in getCurrentUser and rely on app_metadata', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'untrusted-client-user-2',
            email: 'viewer-user@example.com',
            user_metadata: { name: 'Viewer Spoofing Admin', role: 'ADMIN' }, // Spoofed
            app_metadata: { role: Role.VIEWER }, // Trusted server-side role
            created_at: '2026-09-25T20:00:00.000Z',
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await service.getCurrentUser('valid-viewer-token');
      expect(result.role).toBe(Role.VIEWER);
    });

    it('should survive service restart and retrieve role from persistent app_metadata', async () => {
      // Simulate a brand new service instance (restart / separate replica) without prior in-memory state
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

      const restartedService = module.get<AuthService>(AuthService);

      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'new-replica-user',
            email: 'replica-admin@example.com',
            user_metadata: { name: 'Replica User' },
            app_metadata: { role: Role.ADMIN }, // Persisted in Supabase
            created_at: '2026-09-25T20:00:00.000Z',
          },
        },
        error: null,
      });
      (restartedService as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await restartedService.getCurrentUser('replica-token');
      expect(result.role).toBe(Role.ADMIN);
      expect(result.id).toBe('new-replica-user');
    });

    it('should synchronize durable user roles across replicas from Supabase admin listUsers', async () => {
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

      const newReplica = module.get<AuthService>(AuthService);
      (newReplica as any).adminSupabase = {
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: 'replica-persisted-pm',
                    email: 'persistedpm@aipms.com',
                    user_metadata: { name: 'Persisted PM' },
                    app_metadata: { role: Role.PROJECT_MANAGER },
                    created_at: new Date().toISOString(),
                  },
                ],
              },
              error: null,
            }),
          },
        },
      };

      const allUsers = await newReplica.listUsers();
      const syncedUser = allUsers.find((u) => u.id === 'replica-persisted-pm');
      expect(syncedUser).toBeDefined();
      expect(syncedUser?.role).toBe(Role.PROJECT_MANAGER);
    });
  });
});
