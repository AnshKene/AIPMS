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
});
