import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { Role } from '../enums/roles.enum.js';
import { AuthService } from '../../auth/auth.service.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let authService: AuthService;

  beforeEach(() => {
    reflector = new Reflector();
    authService = {
      getCurrentUser: vi.fn(),
    } as unknown as AuthService;
    guard = new RolesGuard(reflector, authService);
  });

  const createMockContext = (options: {
    path?: string;
    method?: string;
    authHeader?: string;
  }): ExecutionContext => {
    const request = {
      path: options.path ?? '/projects',
      method: options.method ?? 'GET',
      headers: {
        authorization: options.authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('public routes', () => {
    it('should allow public login endpoint without token', async () => {
      const context = createMockContext({ path: '/auth/login' });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should allow public health check endpoint without token', async () => {
      const context = createMockContext({ path: '/health' });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });

  describe('unauthenticated requests', () => {
    it('should throw UnauthorizedException when authorization header is missing', async () => {
      const context = createMockContext({ path: '/projects' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token validation fails', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('JWT expired'));
      const context = createMockContext({
        path: '/projects',
        authHeader: 'Bearer expired-token',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('role-based authorization', () => {
    it('should allow ADMIN full access to any endpoint', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: Role.ADMIN,
      } as any);

      const context = createMockContext({
        path: '/admin/audit-logs',
        method: 'GET',
        authHeader: 'Bearer admin-token',
      });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should allow designated administrator Ansh full access', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: '66544acc-4e3d-4b3b-b3f3-44971c6a9347',
        email: 'admin.ansh@aipms.com',
        name: 'Ansh',
        role: Role.ADMIN,
      } as any);

      const context = createMockContext({
        path: '/admin/users',
        method: 'GET',
        authHeader: 'Bearer ansh-admin-token',
      });
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should reject imposter claiming ADMIN in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
          id: 'imposter-id-999',
          email: 'imposter@example.com',
          role: Role.ADMIN,
        } as any);

        const context = createMockContext({
          path: '/admin/users',
          method: 'GET',
          authHeader: 'Bearer imposter-token',
        });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should reject test ID admin-1 claiming ADMIN in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
          id: 'admin-1',
          email: 'admin1@example.com',
          role: Role.ADMIN,
        } as any);

        const context = createMockContext({
          path: '/admin/users',
          method: 'GET',
          authHeader: 'Bearer admin-1-token',
        });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should reject test ID admin-user-001 claiming ADMIN in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
          id: 'admin-user-001',
          email: 'admin@aipms.com',
          role: Role.ADMIN,
        } as any);

        const context = createMockContext({
          path: '/admin/users',
          method: 'GET',
          authHeader: 'Bearer admin-user-001-token',
        });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should reject test ID usr-123 claiming ADMIN in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
          id: 'usr-123',
          email: 'user@example.com',
          role: Role.ADMIN,
        } as any);

        const context = createMockContext({
          path: '/admin/users',
          method: 'GET',
          authHeader: 'Bearer usr-123-token',
        });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should block non-ADMIN from administrative user management endpoints', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'member-1',
        role: Role.TEAM_MEMBER,
      } as any);

      const context = createMockContext({
        path: '/auth/users/some-id/role',
        method: 'PATCH',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should enforce VIEWER read-only permissions and block write operations', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'viewer-1',
        role: Role.VIEWER,
      } as any);

      // VIEWER GET should be allowed
      const readContext = createMockContext({
        path: '/projects',
        method: 'GET',
        authHeader: 'Bearer viewer-token',
      });
      expect(await guard.canActivate(readContext)).toBe(true);

      // VIEWER POST should be blocked
      const postContext = createMockContext({
        path: '/projects',
        method: 'POST',
        authHeader: 'Bearer viewer-token',
      });
      await expect(guard.canActivate(postContext)).rejects.toThrow(ForbiddenException);

      // VIEWER PATCH should be blocked
      const patchContext = createMockContext({
        path: '/tasks/123',
        method: 'PATCH',
        authHeader: 'Bearer viewer-token',
      });
      await expect(guard.canActivate(patchContext)).rejects.toThrow(ForbiddenException);

      // VIEWER DELETE should be blocked
      const deleteContext = createMockContext({
        path: '/tasks/123',
        method: 'DELETE',
        authHeader: 'Bearer viewer-token',
      });
      await expect(guard.canActivate(deleteContext)).rejects.toThrow(ForbiddenException);
    });

    it('should block TEAM_MEMBER from deleting resources', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'member-1',
        role: Role.TEAM_MEMBER,
      } as any);

      const deleteContext = createMockContext({
        path: '/tasks/123',
        method: 'DELETE',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(deleteContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Security Regression Tests - Health Bypass (VULN-015) & RBAC Hardening', () => {
    it('should block unauthenticated access to administrative health endpoint /api/admin/health', async () => {
      const context = createMockContext({ path: '/api/admin/health' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should block unauthenticated access to health sub-paths like /health/admin', async () => {
      const context = createMockContext({ path: '/health/admin' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should block unauthenticated access to encoded administrative paths like /api%2fadmin/health', async () => {
      const context = createMockContext({ path: '/api%2fadmin/health' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow legitimate public health check with query parameters', async () => {
      const context = createMockContext({ path: '/api/health?probe=readiness' });
      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should reject unknown roles with ForbiddenException', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'hacker-1',
        role: 'SUPER_ADMIN_IMPOSTOR',
      } as any);

      const context = createMockContext({
        path: '/projects',
        method: 'GET',
        authHeader: 'Bearer hacker-token',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should reject missing authorization metadata with ForbiddenException', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'no-role-user',
      } as any);

      const context = createMockContext({
        path: '/projects',
        method: 'GET',
        authHeader: 'Bearer no-role-token',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should block TEAM_MEMBER from modifying teams', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'member-1',
        role: Role.TEAM_MEMBER,
      } as any);

      const postTeam = createMockContext({
        path: '/api/teams',
        method: 'POST',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(postTeam)).rejects.toThrow('Team Members cannot manage teams');

      const patchTeam = createMockContext({
        path: '/api/teams/t1',
        method: 'PATCH',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(patchTeam)).rejects.toThrow('Team Members cannot manage teams');
    });

    it('should block TEAM_MEMBER from modifying sprints', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'member-1',
        role: Role.TEAM_MEMBER,
      } as any);

      const postSprint = createMockContext({
        path: '/api/sprints',
        method: 'POST',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(postSprint)).rejects.toThrow('Team Members cannot manage sprints');
    });

    it('should block TEAM_MEMBER from creating or updating projects', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'member-1',
        role: Role.TEAM_MEMBER,
      } as any);

      const postProject = createMockContext({
        path: '/api/projects',
        method: 'POST',
        authHeader: 'Bearer member-token',
      });
      await expect(guard.canActivate(postProject)).rejects.toThrow('Team Members cannot create or modify project');
    });
  });
});
