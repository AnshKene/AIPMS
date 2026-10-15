import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Role } from '../enums/roles.enum.js';
import { AuthService } from '../../auth/auth.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const path: string = req.path || req.originalUrl || '';

    // Allow public unauthenticated routes (login, register, forgot-password, reset-password, health check)
    if (
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/reset-password') ||
      path.includes('/health')
    ) {
      return true;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Authentication token required');
    }

    let userRole = Role.TEAM_MEMBER;
    let currentUser: Record<string, unknown> | null = null;

    try {
      currentUser = (await this.authService.getCurrentUser(authHeader)) as Record<string, unknown>;
      req.user = currentUser;
      if (currentUser && typeof currentUser.role === 'string') {
        userRole = currentUser.role as Role;
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // If specific roles decorator is provided on endpoint
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(userRole);
      if (!hasRole) {
        throw new ForbiddenException(
          `Access Denied: Role '${userRole}' does not have permission to access this endpoint`,
        );
      }
      return true;
    }

    // Default RBAC matrix enforcement across microservice proxy endpoints
    const method = (req.method || 'GET').toUpperCase();

    // 1. ADMIN has unrestricted full access
    if (userRole === Role.ADMIN) {
      return true;
    }

    // 2. Restricted system management endpoints (/auth/users, /admin, /users)
    if (path.includes('/users') || path.includes('/admin')) {
      throw new ForbiddenException(
        `Access Denied: Role '${userRole}' cannot perform administrative user management`,
      );
    }

    // 3. VIEWER role enforcement (Read-only access)
    if (userRole === Role.VIEWER) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        throw new ForbiddenException(
          `Access Denied: Viewer role is restricted to read-only operations`,
        );
      }
      return true;
    }

    // 4. TEAM_MEMBER role enforcement
    if (userRole === Role.TEAM_MEMBER) {
      // Cannot delete projects, sprints, risks, or teams
      if (method === 'DELETE') {
        throw new ForbiddenException(
          `Access Denied: Team Members are not permitted to delete resources`,
        );
      }
      // Cannot create or edit projects directly (reserved for PM & ADMIN)
      if (['POST', 'PUT', 'PATCH'].includes(method) && path.includes('/projects')) {
        throw new ForbiddenException(
          `Access Denied: Team Members cannot create or modify project settings`,
        );
      }
      return true;
    }

    // 5. PROJECT_MANAGER role enforcement
    if (userRole === Role.PROJECT_MANAGER) {
      // Allowed full project, task, sprint, risk, report, AI CRUD operations
      return true;
    }

    return true;
  }
}
