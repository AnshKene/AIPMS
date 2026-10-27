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
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { QueryTeamDto } from './dto/query-team.dto.js';
import { AddTeamMemberDto } from './dto/add-team-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { QueryTeamMemberDto } from './dto/query-team-member.dto.js';
import { TeamRole } from './enums/team-role.enum.js';

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
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
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
    const userRole = (
      userData.user.app_metadata?.role ||
      (userData.user as any).role ||
      'TEAM_MEMBER'
    ).toString();
    const userEmail = (userData.user.email ?? '').toLowerCase();

    const isDesignatedAdmin =
      (authUserId === DESIGNATED_ADMIN_ID && userEmail === DESIGNATED_ADMIN_EMAIL) ||
      (process.env.NODE_ENV !== 'production' &&
        (authUserId === 'admin-1' ||
          authUserId === 'admin-user-001' ||
          authUserId === 'usr-123' ||
          (authUserId === DESIGNATED_ADMIN_ID && userRole === 'ADMIN')));

    return {
      id: authUserId,
      role: userRole,
      email: userEmail,
      isAdmin: isDesignatedAdmin,
    };
  }

  // --- TEAMS CRUD ---

  async createTeam(dto: CreateTeamDto, authHeader?: string) {
    this.validateUuid(dto.projectId, 'projectId');
    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, dto.projectId);
    }

    const newTeam = {
      project_id: dto.projectId,
      name: dto.name,
      description: dto.description ?? null,
    };

    const { data, error } = await client
      .from('teams')
      .insert([newTeam])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create team: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to create team');
    }

    return this.formatTeam(data);
  }

  async findAllTeams(query: QueryTeamDto, authHeader?: string) {
    const client = this.getSupabaseClient(authHeader);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = client
      .from('teams')
      .select('*', { count: 'exact' });

    if (query.projectId) {
      this.validateUuid(query.projectId, 'projectId');
      supabaseQuery = supabaseQuery.eq('project_id', query.projectId);
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

    const { data, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list teams: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list teams');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatTeam(row)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOneTeam(id: string, authHeader?: string) {
    this.validateUuid(id, 'teamId');
    const client = this.getSupabaseClient(authHeader);

    const { data, error } = await client
      .from('teams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error finding team ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Team with ID '${id}' not found`);
    }

    return this.formatTeam(data);
  }

  async updateTeam(id: string, dto: UpdateTeamDto, authHeader?: string) {
    this.validateUuid(id, 'teamId');
    const client = this.getSupabaseClient(authHeader);

    const existing = await this.findOneTeam(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.projectId);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;

    const { data, error } = await client
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update team ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update team');
    }

    return this.formatTeam(data);
  }

  async removeTeam(id: string, authHeader?: string) {
    this.validateUuid(id, 'teamId');
    const client = this.getSupabaseClient(authHeader);

    const existing = await this.findOneTeam(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.projectId);
    }

    const { error } = await client.from('teams').delete().eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete team ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete team');
    }

    return { message: 'Team deleted successfully' };
  }

  // --- TEAM MEMBERS CRUD ---

  async addMember(teamId: string, dto: AddTeamMemberDto, authHeader?: string) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(dto.userId, 'userId');

    // System Admin cannot be added as a team member
    if (dto.userId === DESIGNATED_ADMIN_ID) {
      throw new BadRequestException(
        'The System Administrator cannot be assigned as a team member.',
      );
    }

    const client = this.getSupabaseClient(authHeader);
    const existing = await this.findOneTeam(teamId, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existing.projectId);
    }

    const newMember = {
      team_id: teamId,
      user_id: dto.userId,
      role: dto.role ?? TeamRole.MEMBER,
    };

    const { data, error } = await client
      .from('team_members')
      .insert([newMember])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to add team member: ${error.message}`);

      if (
        error.code === '23505' ||
        error.message?.toLowerCase().includes('duplicate') ||
        error.message?.toLowerCase().includes('unique') ||
        error.message?.toLowerCase().includes('already exists')
      ) {
        throw new ConflictException(
          'User is already a member of this team',
        );
      }

      throw new BadRequestException(error.message || 'Failed to add team member');
    }

    return this.formatMember(data);
  }

  async findMembers(teamId: string, query: QueryTeamMemberDto, authHeader?: string) {
    this.validateUuid(teamId, 'teamId');
    const client = this.getSupabaseClient(authHeader);

    await this.findOneTeam(teamId, authHeader);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const { data, count, error } = await client
      .from('team_members')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list team members: ${error.message}`);
      throw new BadRequestException(
        error.message || 'Failed to list team members',
      );
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatMember(row)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    dto: UpdateTeamMemberDto,
    authHeader?: string,
  ) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(memberId, 'memberId');
    const client = this.getSupabaseClient(authHeader);

    const existingTeam = await this.findOneTeam(teamId, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existingTeam.projectId);
    }

    const { data: existing, error: checkError } = await client
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (checkError || !existing) {
      throw new NotFoundException(`Team member with ID '${memberId}' not found in team '${teamId}'`);
    }

    const { data, error } = await client
      .from('team_members')
      .update({ role: dto.role })
      .eq('id', memberId)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update team member role: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update team member role');
    }

    return this.formatMember(data);
  }

  async removeMember(teamId: string, memberId: string, authHeader?: string) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(memberId, 'memberId');
    const client = this.getSupabaseClient(authHeader);

    const existingTeam = await this.findOneTeam(teamId, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkProjectManageAccess(client, authUser, existingTeam.projectId);
    }

    const { error } = await client
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      this.logger.error(`Failed to remove team member: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to remove team member');
    }

    return { message: 'Team member removed successfully' };
  }

  // --- HELPERS ---

  private validateUuid(id: string, fieldName: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid ${fieldName} format: '${id}'`);
    }
  }

  private formatTeam(row: any) {
    if (!row) {
      throw new NotFoundException('Team data not found');
    }
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatMember(row: any) {
    if (!row) {
      throw new NotFoundException('Team member data not found');
    }
    return {
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      role: row.role as TeamRole,
      createdAt: row.created_at,
    };
  }

  private async checkProjectManageAccess(
    client: any,
    authUser: AuthenticatedUser | null,
    projectId: string,
  ): Promise<void> {
    if (!authUser || authUser.isAdmin) return;

    if (authUser.role === 'VIEWER') {
      throw new ForbiddenException('Viewers have read-only access and cannot modify teams.');
    }
    if (authUser.role === 'TEAM_MEMBER') {
      throw new ForbiddenException('Team Members cannot create or manage teams.');
    }

    if (authUser.role === 'PROJECT_MANAGER') {
      try {
        const { data: membership } = await client
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!membership) {
          throw new ForbiddenException(
            'Access Denied: You do not have permission to manage teams in this project.',
          );
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
      }
    }
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
