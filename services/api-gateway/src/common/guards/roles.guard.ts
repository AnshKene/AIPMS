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
  private static readonly PUBLIC_ROUTES = new Set([
    '/',
    '/health',
    '/api/health',
    '/auth/login',
    '/api/auth/login',
    '/auth/register',
    '/api/auth/register',
    '/auth/forgot-password',
    '/api/auth/forgot-password',
    '/auth/reset-password',
    '/api/auth/reset-password',
  ]);

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
    const rawPath: string = req.path || req.originalUrl || '';
    const method = (req.method || 'GET').toUpperCase();

    // Normalize path: strip query parameters, hash fragments, decode URI components, and collapse duplicate slashes
    const pathWithoutQuery = rawPath.split('?')[0].split('#')[0];
    let normalizedPath = '/';
    try {
      normalizedPath = decodeURIComponent(pathWithoutQuery).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    } catch {
      normalizedPath = pathWithoutQuery.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }

    // Exact route matching for public endpoints (eliminates bypass via /api/admin/health or encoded paths)
    if (RolesGuard.PUBLIC_ROUTES.has(normalizedPath)) {
      return true;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Authentication token required');
    }

    let currentUser: Record<string, unknown> | null = null;
    let userRole: Role | null = null;

    try {
      currentUser = (await this.authService.getCurrentUser(authHeader)) as Record<string, unknown>;
      req.user = currentUser;
      if (currentUser && typeof currentUser.role === 'string') {
        const candidateRole = currentUser.role as Role;
        if (Object.values(Role).includes(candidateRole)) {
          userRole = candidateRole;
        }
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Unknown roles and missing authorization metadata must not grant access by default
    if (!userRole) {
      throw new ForbiddenException('Access Denied: Invalid, unknown, or missing role authorization');
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

    // 1. ADMIN has unrestricted full access
    if (userRole === Role.ADMIN) {
      return true;
    }

    // 2. Restricted administrative and user management endpoints
    if (
      normalizedPath.includes('/users') ||
      normalizedPath.includes('/admin') ||
      normalizedPath.includes('/audit-logs')
    ) {
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
      // Cannot delete resources
      if (method === 'DELETE') {
        throw new ForbiddenException(
          `Access Denied: Team Members are not permitted to delete resources`,
        );
      }
      // Cannot manage teams or team membership
      if (['POST', 'PUT', 'PATCH'].includes(method) && normalizedPath.includes('/teams')) {
        throw new ForbiddenException(
          `Access Denied: Team Members cannot manage teams or team memberships`,
        );
      }
      // Cannot manage sprints
      if (['POST', 'PUT', 'PATCH'].includes(method) && normalizedPath.includes('/sprints')) {
        throw new ForbiddenException(
          `Access Denied: Team Members cannot manage sprints`,
        );
      }
      // Cannot create or edit projects directly (reserved for PM & ADMIN)
      if (['POST', 'PUT', 'PATCH'].includes(method) && normalizedPath.includes('/projects')) {
        throw new ForbiddenException(
          `Access Denied: Team Members cannot create or modify project settings`,
        );
      }
      return true;
    }

    // 5. PROJECT_MANAGER role enforcement
    if (userRole === Role.PROJECT_MANAGER) {
      return true;
    }

    throw new ForbiddenException('Access Denied: Insufficient authorization');
  }
}
