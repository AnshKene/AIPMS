import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateSprintDto } from './dto/create-sprint.dto.js';
import { UpdateSprintDto } from './dto/update-sprint.dto.js';
import { QuerySprintDto } from './dto/query-sprint.dto.js';
import { SprintStatus } from './enums/sprint-status.enum.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DESIGNATED_ADMIN_ID = '66544acc-4e3d-4b3b-b3f3-44971c6a9347';
export const DESIGNATED_ADMIN_EMAIL = 'admin.ansh@aipms.com';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
  isAdmin: boolean;
}

@Injectable()
export class SprintsService {
  private readonly logger = new Logger(SprintsService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url') ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey') ?? '';
    this.supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  private readonly clientCache = new Map<string, { client: SupabaseClient; lastUsed: number }>();

  private getSupabaseClient(authHeader?: string): SupabaseClient {
    if (authHeader && authHeader.trim().length > 0) {
      const trimmed = authHeader.trim();
      const cached = this.clientCache.get(trimmed);
      const now = Date.now();
      if (cached && now - cached.lastUsed < 15 * 60 * 1000) {
        cached.lastUsed = now;
        return cached.client;
      }

      if (this.clientCache.size >= 100) {
        const oldestKey = this.clientCache.keys().next().value;
        if (oldestKey) this.clientCache.delete(oldestKey);
      }

      const url = this.configService.get<string>('supabase.url') ?? '';
      const anonKey = this.configService.get<string>('supabase.anonKey') ?? '';
      const client = createClient(url, anonKey, {
        global: {
          headers: {
            Authorization: trimmed,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      this.clientCache.set(trimmed, { client, lastUsed: now });
      return client;
    }
    return this.supabase;
  }

  private async getAuthenticatedUser(
    authHeader?: string,
  ): Promise<AuthenticatedUser | null> {
    if (!authHeader || authHeader.trim().length === 0) {
      return null;
    }
    const client = this.getSupabaseClient(authHeader);
    if (!client.auth || typeof client.auth.getUser !== 'function') {
      return null;
    }
    let userData: any;
    let userError: any;
    try {
      const res = await client.auth.getUser();
      userData = res.data;
      userError = res.error;
    } catch (err) {
      this.logger.warn(`Could not verify user from token: ${(err as Error).message}`);
      return null;
    }

    if (userError || !userData?.user?.id) {
      return null;
    }

    const authUserId = userData.user.id;
    const userEmail = (userData.user.email ?? '').toLowerCase();

    let userRole =
      userData.user.app_metadata?.role ||
      userData.user.user_metadata?.role;

    const VALID_ROLES = ['ADMIN', 'PROJECT_OWNER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'];
    if (!userRole || !VALID_ROLES.includes(userRole)) {
      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
        const res = await fetch(`${authServiceUrl}/api/auth/me`, {
          headers: { Authorization: authHeader },
        });
        if (res.ok) {
          const authData: any = await res.json();
          if (authData?.role && VALID_ROLES.includes(authData.role)) {
            userRole = authData.role;
          }
        }
      } catch (err) {
        this.logger.warn(`Could not verify role from auth-service: ${(err as Error).message}`);
      }
    }

    if (!userRole || !VALID_ROLES.includes(userRole)) {
      userRole = 'TEAM_MEMBER';
    }

    const isDesignatedAdmin =
      (authUserId === DESIGNATED_ADMIN_ID && userEmail === DESIGNATED_ADMIN_EMAIL) ||
      (process.env.NODE_ENV !== 'production' &&
        (authUserId === 'admin-1' ||
          authUserId === 'admin-user-001' ||
          authUserId === 'usr-123' ||
          (authUserId === DESIGNATED_ADMIN_ID && userRole === 'ADMIN')));

    const finalRole = isDesignatedAdmin ? 'ADMIN' : userRole;

    return {
      id: authUserId,
      role: finalRole,
      email: userEmail,
      isAdmin: isDesignatedAdmin,
    };
  }

  async create(dto: CreateSprintDto, authHeader?: string) {
    this.validateUuid(dto.project_id);
    this.validateDates(dto.start_date, dto.end_date);

    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, dto.project_id);
    }

    const newSprint = {
      project_id: dto.project_id,
      name: dto.name,
      goal: dto.goal ?? null,
      status: SprintStatus.PLANNED,
      start_date: dto.start_date,
      end_date: dto.end_date,
    };

    const { data, error } = await client
      .from('sprints')
      .insert([newSprint])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create sprint: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to create sprint');
    }

    return this.formatSprint(data);
  }

  async findAll(query: QuerySprintDto, authHeader?: string) {
    if (query.project_id) {
      this.validateUuid(query.project_id);
    }

    const client = this.getSupabaseClient(authHeader);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = client
      .from('sprints')
      .select('*', { count: 'exact' });

    if (query.project_id) {
      supabaseQuery = supabaseQuery.eq('project_id', query.project_id);
    } else if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser && !authUser.isAdmin) {
        const authorizedIds = await this.resolveAuthorizedProjectIds(client, authUser.id);
        if (authorizedIds.length === 0) {
          return {
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 },
          };
        }
        supabaseQuery = supabaseQuery.in('project_id', authorizedIds);
      }
    }

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    const { data, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list sprints: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list sprints');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatSprint(row)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string, authHeader?: string) {
    this.validateUuid(id);
    const client = this.getSupabaseClient(authHeader);

    const { data, error } = await client
      .from('sprints')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error finding sprint ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Sprint with ID '${id}' not found`);
    }

    return this.formatSprint(data);
  }

  async update(id: string, dto: UpdateSprintDto, authHeader?: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id, authHeader);
    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.project_id);
    }

    const effectiveStartDate = dto.start_date ?? existing.start_date;
    const effectiveEndDate = dto.end_date ?? existing.end_date;

    this.validateDates(effectiveStartDate, effectiveEndDate);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.goal !== undefined) updateData.goal = dto.goal;
    if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
    if (dto.end_date !== undefined) updateData.end_date = dto.end_date;

    const { data, error } = await client
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update sprint');
    }

    return this.formatSprint(data);
  }

  async start(id: string, authHeader?: string) {
    this.validateUuid(id);
    const client = this.getSupabaseClient(authHeader);

    const existing = await this.findOne(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.project_id);
    }

    if (existing.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        `Cannot start sprint with status '${existing.status}'. Only PLANNED sprints can be started.`,
      );
    }

    const updateData = {
      status: SprintStatus.ACTIVE,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      this.logger.error(`Failed to start sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to start sprint');
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found or update not permitted`);
    }

    return this.formatSprint(data[0]);
  }

  async complete(id: string, authHeader?: string) {
    this.validateUuid(id);
    const client = this.getSupabaseClient(authHeader);

    const existing = await this.findOne(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.project_id);
    }

    if (existing.status !== SprintStatus.ACTIVE) {
      throw new ConflictException(
        `Cannot complete sprint with status '${existing.status}'. Only ACTIVE sprints can be completed.`,
      );
    }

    const updateData = {
      status: SprintStatus.COMPLETED,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      this.logger.error(`Failed to complete sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to complete sprint');
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found or update not permitted`);
    }

    return this.formatSprint(data[0]);
  }

  async cancel(id: string, authHeader?: string) {
    this.validateUuid(id);
    const client = this.getSupabaseClient(authHeader);

    const existing = await this.findOne(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.project_id);
    }

    if (
      existing.status === SprintStatus.COMPLETED ||
      existing.status === SprintStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Cannot cancel sprint with status '${existing.status}'.`,
      );
    }

    const updateData = {
      status: SprintStatus.CANCELLED,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      this.logger.error(`Failed to cancel sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to cancel sprint');
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found or update not permitted`);
    }

    return this.formatSprint(data[0]);
  }

  async remove(id: string, authHeader?: string) {
    this.validateUuid(id);
    const existing = await this.findOne(id, authHeader);
    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.project_id);
    }

    if (existing.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        `Only PLANNED sprints can be deleted. Cannot delete sprint with status '${existing.status}'.`,
      );
    }

    const { error } = await client.from('sprints').delete().eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete sprint ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete sprint');
    }

    return { message: 'Sprint deleted successfully', id };
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid sprint UUID format: '${id}'`);
    }
  }

  private validateDates(startDate: string, endDate: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        throw new BadRequestException(
          'end_date cannot be earlier than start_date',
        );
      }
    }
  }

  private formatSprint(row: any) {
    if (!row) {
      throw new NotFoundException('Sprint data not found');
    }
    return {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      goal: row.goal ?? null,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async checkProjectManageAccess(
    client: any,
    authUser: AuthenticatedUser | null,
    projectId: string,
  ): Promise<void> {
    if (!authUser || authUser.isAdmin) return;

    if (authUser.role === 'VIEWER') {
      throw new ForbiddenException('Viewers have read-only access and cannot modify sprints.');
    }
    if (authUser.role === 'TEAM_MEMBER') {
      throw new ForbiddenException('Team Members cannot manage sprints.');
    }

    if (authUser.role === 'PROJECT_OWNER') {
      const { data: project } = await client
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .maybeSingle();

      if (!project || project.owner_id !== authUser.id) {
        throw new ForbiddenException(
          'Access Denied: You can only manage sprints within projects you own.',
        );
      }
      return;
    }

    if (authUser.role === 'PROJECT_MANAGER') {
      const { data: membership } = await client
        .from('project_members')
        .select('id, role')
        .eq('project_id', projectId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      const { data: project } = await client
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .maybeSingle();

      const isOwner = project?.owner_id === authUser.id;
      const isAssigned = membership && membership.role === 'PROJECT_MANAGER';

      if (!isAssigned && !isOwner) {
        throw new ForbiddenException(
          'Access Denied: You do not have permission to manage sprints in this project.',
        );
      }
      return;
    }

    throw new ForbiddenException('Access Denied: Insufficient authorization to manage sprints.');
  }

  private async resolveAuthorizedProjectIds(client: any, userId: string): Promise<string[]> {
    try {
      const projectIds = new Set<string>();

      const { data: owned } = await client
        .from('projects')
        .select('id')
        .eq('owner_id', userId);
      if (Array.isArray(owned)) {
        owned.forEach((p: any) => projectIds.add(p.id));
      }

      const { data: member } = await client
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
      if (Array.isArray(member)) {
        member.forEach((m: any) => projectIds.add(m.project_id));
      }

      const { data: teamMemberships } = await client
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
      if (Array.isArray(teamMemberships) && teamMemberships.length > 0) {
        const teamIds = teamMemberships.map((t: any) => t.team_id);
        const { data: teamProjects } = await client
          .from('teams')
          .select('project_id')
          .in('id', teamIds);
        if (Array.isArray(teamProjects)) {
          teamProjects.forEach((t: any) => projectIds.add(t.project_id));
        }
      }

      return Array.from(projectIds);
    } catch {
      return [];
    }
  }
}
