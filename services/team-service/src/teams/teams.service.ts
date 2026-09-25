import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
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

  // --- TEAMS CRUD ---

  async createTeam(dto: CreateTeamDto) {
    this.validateUuid(dto.projectId, 'projectId');

    const newTeam = {
      project_id: dto.projectId,
      name: dto.name,
      description: dto.description ?? null,
    };

    const { data, error } = await this.supabase
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

  async findAllTeams(query: QueryTeamDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = this.supabase
      .from('teams')
      .select('*', { count: 'exact' });

    if (query.projectId) {
      this.validateUuid(query.projectId, 'projectId');
      supabaseQuery = supabaseQuery.eq('project_id', query.projectId);
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

  async findOneTeam(id: string) {
    this.validateUuid(id, 'teamId');

    const { data, error } = await this.supabase
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

  async updateTeam(id: string, dto: UpdateTeamDto) {
    this.validateUuid(id, 'teamId');

    await this.findOneTeam(id);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;

    const { data, error } = await this.supabase
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

  async removeTeam(id: string) {
    this.validateUuid(id, 'teamId');

    await this.findOneTeam(id);

    const { error } = await this.supabase.from('teams').delete().eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete team ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete team');
    }

    return { message: 'Team deleted successfully' };
  }

  // --- TEAM MEMBERS CRUD ---

  async addMember(teamId: string, dto: AddTeamMemberDto) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(dto.userId, 'userId');

    await this.findOneTeam(teamId);

    const newMember = {
      team_id: teamId,
      user_id: dto.userId,
      role: dto.role ?? TeamRole.MEMBER,
    };

    const { data, error } = await this.supabase
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

  async findMembers(teamId: string, query: QueryTeamMemberDto) {
    this.validateUuid(teamId, 'teamId');

    await this.findOneTeam(teamId);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const { data, count, error } = await this.supabase
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
  ) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(memberId, 'memberId');

    await this.findOneTeam(teamId);

    const { data: existing, error: checkError } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (checkError || !existing) {
      throw new NotFoundException(
        `Team member with ID '${memberId}' not found in team '${teamId}'`,
      );
    }

    const { data, error } = await this.supabase
      .from('team_members')
      .update({ role: dto.role })
      .eq('id', memberId)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update member role: ${error?.message}`);
      throw new BadRequestException(
        error?.message || 'Failed to update member role',
      );
    }

    return this.formatMember(data);
  }

  async removeMember(teamId: string, memberId: string) {
    this.validateUuid(teamId, 'teamId');
    this.validateUuid(memberId, 'memberId');

    await this.findOneTeam(teamId);

    const { data: existing, error: checkError } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (checkError || !existing) {
      throw new NotFoundException(
        `Team member with ID '${memberId}' not found in team '${teamId}'`,
      );
    }

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      this.logger.error(`Failed to remove team member: ${error.message}`);
      throw new BadRequestException(
        error.message || 'Failed to remove team member',
      );
    }

    return { message: 'Team member removed successfully' };
  }

  // --- HELPERS ---

  private validateUuid(id: string, paramName: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid ${paramName} format: '${id}'`);
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
      throw new NotFoundException('Member data not found');
    }
    return {
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      role: row.role,
      createdAt: row.created_at,
    };
  }
}
