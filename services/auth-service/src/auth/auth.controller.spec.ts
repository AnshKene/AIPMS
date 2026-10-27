import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Role } from './roles.enum.js';

describe('AuthController (Security Direct Access Tests)', () => {
  let controller: AuthController;
  let authService: AuthService;

  const adminUser = {
    id: 'admin-001',
    email: 'admin@aipms.com',
    role: Role.ADMIN,
  };

  const memberUser = {
    id: 'member-002',
    email: 'member@aipms.com',
    role: Role.TEAM_MEMBER,
  };

  const viewerUser = {
    id: 'viewer-003',
    email: 'viewer@aipms.com',
    role: Role.VIEWER,
  };

  beforeEach(async () => {
    const mockAuthService = {
      getCurrentUser: vi.fn(async (token: string) => {
        if (token === 'admin-token') return adminUser;
        if (token === 'member-token') return memberUser;
        if (token === 'viewer-token') return viewerUser;
        throw new UnauthorizedException('Invalid or expired token');
      }),
      listUsers: vi.fn(async () => [adminUser, memberUser, viewerUser]),
      getDirectoryProfiles: vi.fn(async () => [
        { id: adminUser.id, name: 'Admin', email: adminUser.email, role: adminUser.role, status: 'ACTIVE' },
        { id: memberUser.id, name: 'Member', email: memberUser.email, role: memberUser.role, status: 'ACTIVE' },
      ]),
      getAuditLogs: vi.fn(async () => ({ data: [], total: 0 })),
      updateUserRole: vi.fn(),
      deactivateUser: vi.fn(),
      reactivateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Direct access to GET /auth/users (VULN-013)', () => {
    it('should reject direct access with no token', async () => {
      await expect(controller.listUsers(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject direct access with invalid token', async () => {
      await expect(
        controller.listUsers('Bearer garbage-invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject direct access with Team Member token', async () => {
      await expect(
        controller.listUsers('Bearer member-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject direct access with Viewer token', async () => {
      await expect(
        controller.listUsers('Bearer viewer-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow direct access with Admin token', async () => {
      const users = await controller.listUsers('Bearer admin-token');
      expect(users).toHaveLength(3);
      expect(authService.listUsers).toHaveBeenCalled();
    });
  });

  describe('Direct access to GET /auth/audit-logs (VULN-014)', () => {
    it('should reject direct access with no token', async () => {
      await expect(controller.getAuditLogs(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject direct access with invalid token', async () => {
      await expect(
        controller.getAuditLogs('Bearer garbage-invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject direct access with Team Member token', async () => {
      await expect(
        controller.getAuditLogs('Bearer member-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject direct access with Viewer token', async () => {
      await expect(
        controller.getAuditLogs('Bearer viewer-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow direct access with Admin token', async () => {
      const logs = await controller.getAuditLogs('Bearer admin-token');
      expect(logs).toBeDefined();
      expect(authService.getAuditLogs).toHaveBeenCalled();
    });
  });

  describe('Direct access to PATCH /auth/users/:id/role', () => {
    it('should reject direct access with no token', async () => {
      await expect(
        controller.updateUserRole('user-1', { role: Role.PROJECT_MANAGER }, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject direct access with invalid token', async () => {
      await expect(
        controller.updateUserRole(
          'user-1',
          { role: Role.PROJECT_MANAGER },
          'Bearer garbage-invalid-token',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject direct access with Team Member token', async () => {
      await expect(
        controller.updateUserRole(
          'user-1',
          { role: Role.PROJECT_MANAGER },
          'Bearer member-token',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject direct access with Viewer token', async () => {
      await expect(
        controller.updateUserRole(
          'user-1',
          { role: Role.PROJECT_MANAGER },
          'Bearer viewer-token',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow direct access with Admin token and forward caller context', async () => {
      await controller.updateUserRole(
        'user-1',
        { role: Role.PROJECT_MANAGER },
        'Bearer admin-token',
      );
      expect(authService.updateUserRole).toHaveBeenCalledWith(
        'user-1',
        Role.PROJECT_MANAGER,
        Role.ADMIN,
        'admin-001',
        'admin@aipms.com',
      );
    });
  });

  describe('Direct access to POST /auth/users/:id/deactivate', () => {
    it('should reject deactivation with no token', async () => {
      await expect(controller.deactivateUser('user-1', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject deactivation with non-admin token', async () => {
      await expect(controller.deactivateUser('user-1', 'Bearer member-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow deactivation with admin token and forward caller identity', async () => {
      await controller.deactivateUser('user-1', 'Bearer admin-token');
      expect(authService.deactivateUser).toHaveBeenCalledWith(
        'user-1',
        Role.ADMIN,
        'admin-001',
        'admin@aipms.com',
      );
    });
  });

  describe('Direct access to POST /auth/users/:id/reactivate', () => {
    it('should reject reactivation with no token', async () => {
      await expect(controller.reactivateUser('user-1', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject reactivation with non-admin token', async () => {
      await expect(controller.reactivateUser('user-1', 'Bearer member-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow reactivation with admin token and forward caller identity', async () => {
      await controller.reactivateUser('user-1', 'Bearer admin-token');
      expect(authService.reactivateUser).toHaveBeenCalledWith(
        'user-1',
        Role.ADMIN,
        'admin-001',
        'admin@aipms.com',
      );
    });
  });

  describe('Direct access to DELETE /auth/users/:id', () => {
    it('should reject deletion with no token', async () => {
      await expect(controller.deleteUser('user-1', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject deletion with non-admin token', async () => {
      await expect(controller.deleteUser('user-1', 'Bearer member-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow permanent deletion with admin token and forward caller identity', async () => {
      await controller.deleteUser('user-1', 'Bearer admin-token');
      expect(authService.deleteUser).toHaveBeenCalledWith(
        'user-1',
        Role.ADMIN,
        'admin-001',
        'admin@aipms.com',
      );
    });
  });

  describe('Direct access to GET /auth/directory', () => {
    it('should reject directory lookup when unauthenticated', async () => {
      await expect(controller.getDirectory(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow directory lookup for non-admin authenticated users', async () => {
      const res = await controller.getDirectory('Bearer member-token');
      expect(res).toBeDefined();
      expect(Array.isArray(res)).toBe(true);
      expect(authService.getDirectoryProfiles).toHaveBeenCalled();
    });
  });
});
