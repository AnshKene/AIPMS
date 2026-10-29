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
import { AuthService, SEEDED_USER_IDS } from './auth.service.js';
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

    it('should never assign ADMIN role based on specific email (such as ak@gmail.com) during registration', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-ak-100',
            email: 'ak@gmail.com',
            user_metadata: { name: 'AK User' },
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      const result = await service.register({
        email: 'ak@gmail.com',
        password: 'password123',
        name: 'AK User',
      });

      expect(result.user.role).toBe(Role.TEAM_MEMBER);
    });

    it('should prevent self-assigning ADMIN using submitted role or metadata during registration', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-malicious-101',
            email: 'malicious@example.com',
            user_metadata: { name: 'Malicious User', role: 'ADMIN' },
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signUp: mockSignUp },
      };

      const result = await service.register({
        email: 'malicious@example.com',
        password: 'password123',
        name: 'Malicious User',
        role: 'ADMIN',
      } as any);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'malicious@example.com',
        password: 'password123',
        options: {
          data: { name: 'Malicious User' },
        },
      });
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

    it('should never grant in-memory ADMIN role to a different Supabase user ID with admin@aipms.com', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_at: 1700000000,
          },
          user: {
            id: 'unauthorized-user-999',
            email: 'admin@aipms.com',
            user_metadata: { name: 'Imposter' },
            app_metadata: {},
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { signInWithPassword: mockSignIn },
      };

      const result = await service.login({
        email: 'admin@aipms.com',
        password: 'password123',
      });

      expect(result.user.role).toBe(Role.TEAM_MEMBER);
      expect(result.user.id).toBe('unauthorized-user-999');
    });

    it('should strictly default to TEAM_MEMBER in production when app_metadata is missing', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const mockSignIn = vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'prod-token',
              refresh_token: 'prod-refresh',
              expires_at: 1700000000,
            },
            user: {
              id: 'admin-user-001',
              email: 'admin@aipms.com',
              user_metadata: { name: 'Admin' },
              app_metadata: {},
            },
          },
          error: null,
        });
        (service as any).supabase = {
          auth: { signInWithPassword: mockSignIn },
        };

        const result = await service.login({
          email: 'admin@aipms.com',
          password: 'password123',
        });

        expect(result.user.role).toBe(Role.TEAM_MEMBER);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should not seed demo administrator users in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            AuthService,
            { provide: ConfigService, useValue: mockConfigService },
            { provide: AuditService, useValue: mockAuditService },
          ],
        }).compile();

        const prodService = module.get<AuthService>(AuthService);
        const users = await prodService.listUsers();
        expect(users).toHaveLength(0);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
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

    it('should accurately recognize designated administrator Ansh from trusted app_metadata', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: AuthService.DESIGNATED_ADMIN_ID,
            email: AuthService.DESIGNATED_ADMIN_EMAIL,
            user_metadata: { name: 'Ansh' },
            app_metadata: { role: Role.ADMIN },
            created_at: '2026-10-21T00:00:00.000Z',
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await service.getCurrentUser('ansh-admin-token');

      expect(result.id).toBe(AuthService.DESIGNATED_ADMIN_ID);
      expect(result.email).toBe(AuthService.DESIGNATED_ADMIN_EMAIL);
      expect(result.name).toBe('Ansh');
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should fail safe to TEAM_MEMBER if an unauthorized user claims ADMIN in app_metadata', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'unauthorized-user-888',
            email: 'imposter@example.com',
            user_metadata: { name: 'Imposter' },
            app_metadata: { role: Role.ADMIN },
            created_at: '2026-10-21T00:00:00.000Z',
          },
        },
        error: null,
      });
      (service as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await service.getCurrentUser('imposter-token');

      expect(result.role).toBe(Role.TEAM_MEMBER);
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
      const target = allUsers.find((u) => u.id === SEEDED_USER_IDS.MEMBER || u.id === 'member-user-003');
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

    it('should reject attempts to promote another account to ADMIN', async () => {
      await expect(
        service.updateUserRole('member-user-003', Role.ADMIN),
      ).rejects.toThrow('Only the designated system administrator');
    });

    it('should prevent demoting or modifying the designated administrator', async () => {
      await expect(
        service.updateUserRole(AuthService.DESIGNATED_ADMIN_ID, Role.PROJECT_MANAGER),
      ).rejects.toThrow('The designated system administrator account cannot be modified or demoted');
    });

    it('should persist legitimate role changes durably to Supabase app_metadata via admin client', async () => {
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
      expect(mockUpdateUserById).toHaveBeenCalledWith(SEEDED_USER_IDS.MEMBER, {
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

      // Attempting to update member-user-003 to PROJECT_MANAGER when DB write fails
      await expect(
        service.updateUserRole('member-user-003', Role.PROJECT_MANAGER),
      ).rejects.toThrow(InternalServerErrorException);

      // Ensure permissions were not silently granted
      const allUsers = await service.listUsers();
      const target = allUsers.find((u) => u.id === SEEDED_USER_IDS.MEMBER || u.id === 'member-user-003');
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

    it('should record the real administrator email in the audit log when updating user role', async () => {
      await service.updateUserRole(
        'member-user-003',
        Role.PROJECT_MANAGER,
        Role.ADMIN,
        'custom-admin-id',
        'realadmin@company.com',
      );

      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'custom-admin-id',
          actorEmail: 'realadmin@company.com',
          action: 'ROLE_ASSIGNED',
          targetResource: SEEDED_USER_IDS.MEMBER,
          outcome: 'SUCCESS',
        }),
      );
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

    it('should survive service restart and retrieve designated admin role from persistent app_metadata', async () => {
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
            id: AuthService.DESIGNATED_ADMIN_ID,
            email: AuthService.DESIGNATED_ADMIN_EMAIL,
            user_metadata: { name: 'Ansh' },
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
      expect(result.id).toBe(AuthService.DESIGNATED_ADMIN_ID);
      expect(result.email).toBe(AuthService.DESIGNATED_ADMIN_EMAIL);
    });

    it('should survive service restart and retrieve persistent PROJECT_MANAGER role from app_metadata', async () => {
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
            id: 'persisted-pm-user',
            email: 'pm@example.com',
            user_metadata: { name: 'PM User' },
            app_metadata: { role: Role.PROJECT_MANAGER },
            created_at: '2026-09-25T20:00:00.000Z',
          },
        },
        error: null,
      });
      (restartedService as any).supabase = {
        auth: { getUser: mockGetUser },
      };

      const result = await restartedService.getCurrentUser('pm-replica-token');
      expect(result.role).toBe(Role.PROJECT_MANAGER);
      expect(result.id).toBe('persisted-pm-user');
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

    it('should sanitize impostor ADMIN claim in listUsers response and internal cache', async () => {
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

      const serviceInstance = module.get<AuthService>(AuthService);
      (serviceInstance as any).adminSupabase = {
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: 'imposter-user-123',
                    email: 'imposter@aipms.com',
                    user_metadata: { name: 'Imposter User' },
                    app_metadata: { role: Role.ADMIN },
                    created_at: new Date().toISOString(),
                  },
                  {
                    id: AuthService.DESIGNATED_ADMIN_ID,
                    email: AuthService.DESIGNATED_ADMIN_EMAIL,
                    user_metadata: { name: 'Ansh' },
                    app_metadata: { role: Role.ADMIN },
                    created_at: new Date().toISOString(),
                  },
                ],
              },
              error: null,
            }),
          },
        },
      };

      const allUsers = await serviceInstance.listUsers();

      // Verify impostor role in list response is sanitized down to TEAM_MEMBER
      const imposterInList = allUsers.find((u) => u.id === 'imposter-user-123');
      expect(imposterInList).toBeDefined();
      expect(imposterInList?.role).toBe(Role.TEAM_MEMBER);

      // Verify impostor role in internal usersMap cache is also sanitized down to TEAM_MEMBER
      const cachedImposter = (serviceInstance as any).usersMap.get('imposter-user-123');
      expect(cachedImposter).toBeDefined();
      expect(cachedImposter.role).toBe(Role.TEAM_MEMBER);

      // Verify designated administrator retains ADMIN in list response and cache
      const designatedInList = allUsers.find((u) => u.id === AuthService.DESIGNATED_ADMIN_ID);
      expect(designatedInList).toBeDefined();
      expect(designatedInList?.role).toBe(Role.ADMIN);
    });
  });

  describe('User Lifecycle Management (Deactivation, Reactivation, Deletion)', () => {
    describe('deactivateUser', () => {
      it('should allow System Admin to deactivate an ordinary active user', async () => {
        const result = await service.deactivateUser(
          'member-user-003',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        expect(result.status).toBe('INACTIVE');
        expect(result.deactivatedAt).toBeDefined();
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_DEACTIVATED',
            targetResource: SEEDED_USER_IDS.MEMBER,
            newValue: 'INACTIVE',
          }),
        );
      });

      it('should reject deactivation when requester is not an ADMIN', async () => {
        await expect(
          service.deactivateUser(
            'member-user-003',
            Role.TEAM_MEMBER,
            'member-user-003',
            'member@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject deactivation of the designated System Admin', async () => {
        await expect(
          service.deactivateUser(
            AuthService.DESIGNATED_ADMIN_ID,
            Role.ADMIN,
            'admin-user-001',
            'admin@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject self-deactivation by an administrator', async () => {
        await expect(
          service.deactivateUser(
            'admin-user-001',
            Role.ADMIN,
            'admin-user-001',
            'admin@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject deactivation of an already inactive account', async () => {
        await service.deactivateUser(
          'viewer-user-004',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        await expect(
          service.deactivateUser(
            'viewer-user-004',
            Role.ADMIN,
            AuthService.DESIGNATED_ADMIN_ID,
            AuthService.DESIGNATED_ADMIN_EMAIL,
          ),
        ).rejects.toThrow(ConflictException);
      });

      it('should reject deactivation if the user owns active projects', async () => {
        (service as any).adminSupabase = {
          from: vi.fn((table: string) => {
            if (table === 'projects') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'p-1', name: 'Critical Production Project' }],
                  error: null,
                }),
              };
            }
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        };

        await expect(
          service.deactivateUser(
            'pm-user-002',
            Role.ADMIN,
            AuthService.DESIGNATED_ADMIN_ID,
            AuthService.DESIGNATED_ADMIN_EMAIL,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('reactivateUser', () => {
      it('should allow System Admin to reactivate an inactive user', async () => {
        // First deactivate
        await service.deactivateUser(
          'member-user-003',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        // Then reactivate
        const reactivated = await service.reactivateUser(
          'member-user-003',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        expect(reactivated.status).toBe('ACTIVE');
        expect(reactivated.deactivatedAt).toBeNull();
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_REACTIVATED',
            targetResource: SEEDED_USER_IDS.MEMBER,
            newValue: 'ACTIVE',
          }),
        );
      });

      it('should reject reactivating an already active user', async () => {
        await expect(
          service.reactivateUser(
            'pm-user-002',
            Role.ADMIN,
            AuthService.DESIGNATED_ADMIN_ID,
            AuthService.DESIGNATED_ADMIN_EMAIL,
          ),
        ).rejects.toThrow(ConflictException);
      });

      it('should reject reactivation when requester is not an ADMIN', async () => {
        await expect(
          service.reactivateUser(
            'member-user-003',
            Role.PROJECT_MANAGER,
            'pm-user-002',
            'pm@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('session enforcement for deactivated accounts', () => {
      it('should reject login for a deactivated user', async () => {
        await service.deactivateUser(
          'viewer-user-004',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        (service as any).supabase = {
          auth: {
            signInWithPassword: vi.fn().mockResolvedValue({
              data: {
                session: { access_token: 'fake-token' },
                user: { id: 'viewer-user-004', email: 'viewer@aipms.com' },
              },
              error: null,
            }),
          },
        };

        await expect(
          service.login({
            email: 'viewer@aipms.com',
            password: 'password123',
          }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject active token validation (me/session) for a deactivated user', async () => {
        await service.deactivateUser(
          'member-user-003',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        (service as any).supabase = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: { id: 'member-user-003', email: 'member@aipms.com' },
              },
              error: null,
            }),
          },
        };

        await expect(service.getCurrentUser('token-for-deactivated')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('deleteUser', () => {
      it('should require deactivation before permanent account deletion (two-step enforcement)', async () => {
        // Active user cannot be deleted directly
        await expect(
          service.deleteUser(
            'member-user-003',
            Role.ADMIN,
            AuthService.DESIGNATED_ADMIN_ID,
            AuthService.DESIGNATED_ADMIN_EMAIL,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject permanent deletion of the designated System Admin', async () => {
        await expect(
          service.deleteUser(
            AuthService.DESIGNATED_ADMIN_ID,
            Role.ADMIN,
            'admin-user-001',
            'admin@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject self-deletion by an administrator', async () => {
        await expect(
          service.deleteUser(
            'admin-user-001',
            Role.ADMIN,
            'admin-user-001',
            'admin@aipms.com',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject deletion if user owns projects', async () => {
        await service.deactivateUser(
          'pm-user-002',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        (service as any).adminSupabase = {
          from: vi.fn((table: string) => {
            if (table === 'projects') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'p-10', name: 'Legacy Project' }],
                  error: null,
                }),
              };
            }
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        };

        await expect(
          service.deleteUser(
            'pm-user-002',
            Role.ADMIN,
            AuthService.DESIGNATED_ADMIN_ID,
            AuthService.DESIGNATED_ADMIN_EMAIL,
          ),
        ).rejects.toThrow(ConflictException);
      });

      it('should successfully delete deactivated user, unassign tasks, remove memberships, and record audit log', async () => {
        // Step 1: Deactivate
        await service.deactivateUser(
          'viewer-user-004',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
        const mockDbFrom = vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

        (service as any).adminSupabase = {
          from: mockDbFrom,
          auth: {
            admin: {
              deleteUser: mockDeleteUser,
            },
          },
        };

        // Step 2: Delete
        const result = await service.deleteUser(
          'viewer-user-004',
          Role.ADMIN,
          AuthService.DESIGNATED_ADMIN_ID,
          AuthService.DESIGNATED_ADMIN_EMAIL,
        );

        expect(result.userId).toBe(SEEDED_USER_IDS.VIEWER);
        expect(mockDeleteUser).toHaveBeenCalledWith(SEEDED_USER_IDS.VIEWER);
        expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_DELETED',
            targetResource: SEEDED_USER_IDS.VIEWER,
            outcome: 'SUCCESS',
          }),
        );
      });
    });
  });

  describe('getDirectoryProfiles', () => {
    it('should return safe user directory profiles without sensitive metadata', async () => {
      const mockListUsers = vi.fn().mockResolvedValue({
        data: {
          users: [
            {
              id: 'user-active-1',
              email: 'active@aipms.com',
              user_metadata: { name: 'Active User' },
              app_metadata: { role: Role.TEAM_MEMBER, status: 'ACTIVE' },
              created_at: new Date().toISOString(),
            },
            {
              id: 'user-inactive-2',
              email: 'inactive@aipms.com',
              user_metadata: { name: 'Inactive User' },
              app_metadata: { role: Role.PROJECT_MANAGER, status: 'INACTIVE', deactivated_at: '2026-10-27T10:00:00Z' },
              created_at: new Date().toISOString(),
            },
          ],
        },
        error: null,
      });

      (service as any).adminSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 'user-active-1', email: 'active@aipms.com', name: 'Active User', role: Role.TEAM_MEMBER, status: 'ACTIVE' },
              { id: 'user-inactive-2', email: 'inactive@aipms.com', name: 'Inactive User', role: Role.PROJECT_MANAGER, status: 'INACTIVE', deactivated_at: '2026-10-27T10:00:00Z' },
            ],
            error: null,
          }),
        })),
        auth: {
          admin: {
            listUsers: mockListUsers,
          },
        },
      };

      const profiles = await service.getDirectoryProfiles();
      const active = profiles.find((p) => p.id === 'user-active-1');
      const inactive = profiles.find((p) => p.id === 'user-inactive-2');

      expect(active).toEqual(
        expect.objectContaining({
          id: 'user-active-1',
          name: 'Active User',
          email: 'active@aipms.com',
          role: Role.TEAM_MEMBER,
          status: 'ACTIVE',
        }),
      );
      expect(inactive).toEqual(
        expect.objectContaining({
          id: 'user-inactive-2',
          name: 'Inactive User',
          email: 'inactive@aipms.com',
          role: Role.PROJECT_MANAGER,
          status: 'INACTIVE',
          deactivatedAt: '2026-10-27T10:00:00Z',
        }),
      );
    });
  });

  describe('Audit Verification: Global Roles, Demo Accounts & Ownership Distinctions', () => {
    it('should default accounts to TEAM_MEMBER when app_metadata.role is missing and account is not in devUsers seed', async () => {
      // Demonstrates why vyas@aipms.com and aryan@aipms.com displayed as MEMBER in UI:
      // When authenticating with Supabase Auth without app_metadata.role, an unseeded ID defaults to TEAM_MEMBER
      const unseededUserMock = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '86a1b0c5-6785-46ad-8397-18c106c01402', // vyas@aipms.com
            email: 'vyas@aipms.com',
            user_metadata: { name: 'Vyas Thakre' },
            app_metadata: {}, // Missing app_metadata.role
            created_at: '2026-10-28T13:00:00.000Z',
          },
        },
        error: null,
      });

      (service as any).supabase = {
        auth: { getUser: unseededUserMock },
      };

      const result = await service.getCurrentUser('mock-token-unseeded');
      expect(result.role).toBe(Role.TEAM_MEMBER);
      expect(result.id).toBe('86a1b0c5-6785-46ad-8397-18c106c01402');
    });

    it('should resolve PROJECT_OWNER when app_metadata contains trusted role claim', async () => {
      const ownerMock = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '86a1b0c5-6785-46ad-8397-18c106c01402',
            email: 'vyas@aipms.com',
            user_metadata: { name: 'Vyas Thakre' },
            app_metadata: { role: Role.PROJECT_OWNER }, // Authoritative claim
            created_at: '2026-10-28T13:00:00.000Z',
          },
        },
        error: null,
      });

      (service as any).supabase = {
        auth: { getUser: ownerMock },
      };

      const result = await service.getCurrentUser('mock-token-owner');
      expect(result.role).toBe(Role.PROJECT_OWNER);
    });

    it('should resolve PROJECT_MANAGER when app_metadata contains trusted role claim', async () => {
      const pmMock = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '351723e1-0e4d-41e8-ad4e-3b6363711359',
            email: 'aryan@aipms.com',
            user_metadata: { name: 'Aryan Radke' },
            app_metadata: { role: Role.PROJECT_MANAGER }, // Authoritative claim
            created_at: '2026-10-28T13:00:00.000Z',
          },
        },
        error: null,
      });

      (service as any).supabase = {
        auth: { getUser: pmMock },
      };

      const result = await service.getCurrentUser('mock-token-pm');
      expect(result.role).toBe(Role.PROJECT_MANAGER);
    });

    it('should compute workspace ownership strictly by project ownerId, independent of project memberships', () => {
      const vyasId = '86a1b0c5-6785-46ad-8397-18c106c01402';
      const aryanId = '351723e1-0e4d-41e8-ad4e-3b6363711359';

      const mockProjects = [
        { id: 'p1', name: 'Customer CRM Portal', ownerId: vyasId },
        { id: 'p2', name: 'AIPMS Platform Development', ownerId: vyasId },
        { id: 'p3', name: 'E-Commerce Modernization', ownerId: vyasId },
        { id: 'p4', name: 'Healthcare Appointment System', ownerId: '57bb7ac6-484f-40bd-a8ea-fd469e1e497a' },
      ];

      const mockMemberships = [
        { projectId: 'p1', userId: aryanId, role: 'PROJECT_MANAGER' },
        { projectId: 'p2', userId: aryanId, role: 'PROJECT_MANAGER' },
        { projectId: 'p3', userId: aryanId, role: 'PROJECT_MANAGER' },
      ];

      // Ownership calculation mirrors frontend page.tsx getUserOwnedProjects
      const vyasOwned = mockProjects.filter((p) => p.ownerId === vyasId);
      const aryanOwned = mockProjects.filter((p) => p.ownerId === aryanId);

      // Membership calculation (accessible projects)
      const aryanAccessibleMemberships = mockMemberships.filter((m) => m.userId === aryanId);

      expect(vyasOwned).toHaveLength(3);
      expect(aryanOwned).toHaveLength(0); // Aryan owns 0 projects
      expect(aryanAccessibleMemberships).toHaveLength(3); // But manages 3 projects at project level
    });
  });
});

