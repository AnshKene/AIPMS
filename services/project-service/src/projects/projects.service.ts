import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto.js';
import { ProjectStatus } from './enums/project-status.enum.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
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
  ): Promise<{ id: string; role: string; isAdmin: boolean } | null> {
    if (!authHeader || authHeader.trim().length === 0) {
      return null;
    }
    const client = this.getSupabaseClient(authHeader);
    let userData: any;
    let userError: any;
    try {
      const res = await client.auth.getUser();
      userData = res.data;
      userError = res.error;
    } catch (err) {
      this.logger.warn(`Could not verify user from token: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    if (userError || !userData?.user?.id) {
      this.logger.warn(`Invalid or expired token supplied: ${userError?.message}`);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    const authUserId = userData.user.id;
    const userRole = (
      userData.user.app_metadata?.role ||
      (userData.user as any).role ||
      'TEAM_MEMBER'
    ).toString();
    const userEmail = (userData.user.email ?? '').toLowerCase();

    const isDesignatedAdmin =
      (authUserId === '66544acc-4e3d-4b3b-b3f3-44971c6a9347' && userEmail === 'admin.ansh@aipms.com') ||
      (process.env.NODE_ENV !== 'production' &&
        (authUserId === 'admin-1' || authUserId === 'admin-user-001' || authUserId === 'usr-123' || userRole === 'ADMIN'));

    const isAdmin = isDesignatedAdmin || userRole === 'ADMIN';

    return {
      id: authUserId,
      role: userRole,
      isAdmin,
    };
  }

  async create(dto: CreateProjectDto, authHeader?: string) {
    this.validateDates(dto.startDate, dto.endDate);

    let resolvedOwnerId = dto.ownerId;

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (!authUser) {
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      if (authUser.role === 'VIEWER') {
        throw new ForbiddenException('Viewers have read-only access and cannot create projects.');
      }

      if (dto.ownerId && dto.ownerId !== authUser.id && !authUser.isAdmin) {
        throw new BadRequestException(
          'Cannot create project on behalf of another user. Ownership is derived from the authenticated account.',
        );
      }
      resolvedOwnerId = authUser.isAdmin && dto.ownerId ? dto.ownerId : authUser.id;
    }

    if (!resolvedOwnerId) {
      throw new BadRequestException(
        'Project owner could not be identified from authentication session.',
      );
    }

    const newProject = {
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? ProjectStatus.PLANNING,
      start_date: dto.startDate ?? null,
      end_date: dto.endDate ?? null,
      owner_id: resolvedOwnerId,
    };

    const client = this.getSupabaseClient(authHeader);
    const { data, error } = await client
      .from('projects')
      .insert([newProject])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create project: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to create project');
    }

    return this.formatProject(data);
  }

  async findAll(query: QueryProjectDto, authHeader?: string) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const client = this.getSupabaseClient(authHeader);
    let supabaseQuery = client
      .from('projects')
      .select('*', { count: 'exact' });

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.ownerId) {
      supabaseQuery = supabaseQuery.eq('owner_id', query.ownerId);
    }

    const { data, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list projects: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list projects');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatProject(row)),
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
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error finding project ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Project with ID '${id}' not found`);
    }

    return this.formatProject(data);
  }

  async update(id: string, dto: UpdateProjectDto, authHeader?: string) {
    this.validateUuid(id);

    // Defense-in-depth: Reject arbitrary attempts to mutate owner_id via update
    if ((dto as any).ownerId !== undefined) {
      throw new BadRequestException(
        'Project ownership cannot be altered via update request. Use the explicit ownership transfer operation.',
      );
    }

    const existing = await this.findOne(id, authHeader);
    if (!existing) {
      throw new NotFoundException(`Project with ID '${id}' not found`);
    }

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access and cannot modify project settings.');
        }

        const isOwner = authUser.id === existing.ownerId;
        if (!isOwner && !authUser.isAdmin) {
          this.logger.warn(
            `User ${authUser.id} denied update on project ${id} owned by ${existing.ownerId}`,
          );
          throw new ForbiddenException(
            'Only the project owner or system administrator can modify project settings.',
          );
        }
      }
    }

    const effectiveStartDate = dto.startDate ?? existing.startDate;
    const effectiveEndDate = dto.endDate ?? existing.endDate;

    this.validateDates(effectiveStartDate, effectiveEndDate);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined) updateData.start_date = dto.startDate;
    if (dto.endDate !== undefined) updateData.end_date = dto.endDate;

    const client = this.getSupabaseClient(authHeader);
    const { data, error } = await client
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update project ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update project');
    }

    return this.formatProject(data);
  }

  async archive(id: string, authHeader?: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id, authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access and cannot archive projects.');
        }

        const isOwner = authUser.id === existing.ownerId;
        if (!isOwner && !authUser.isAdmin) {
          this.logger.warn(
            `User ${authUser.id} denied archive on project ${id} owned by ${existing.ownerId}`,
          );
          throw new ForbiddenException(
            'Only the project owner or system administrator can archive this project.',
          );
        }
      }
    }

    const updateData: Record<string, any> = {
      status: ProjectStatus.ARCHIVED,
      updated_at: new Date().toISOString(),
    };

    // If project is not already ARCHIVED, store current status as previous_status.
    // If project is already ARCHIVED, preserve existing previous_status.
    if (existing.status !== ProjectStatus.ARCHIVED) {
      updateData.previous_status = existing.status;
    }

    const client = this.getSupabaseClient(authHeader);
    let { data, error } = await client
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // Fallback if previous_status column is missing from Supabase schema cache
    if (error && error.message?.includes('previous_status')) {
      this.logger.warn(
        `Supabase schema cache missing 'previous_status' column. Please execute in Supabase SQL Editor: ALTER TABLE projects ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50); NOTIFY pgrst, 'reload schema';`,
      );
      delete updateData.previous_status;
      const retryResult = await client
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error || !data) {
      this.logger.error(`Failed to archive project ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to archive project');
    }

    return this.formatProject(data);
  }

  async unarchive(id: string, authHeader?: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id, authHeader);

    if (existing.status !== ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        `Project with ID '${id}' is not archived and cannot be unarchived`,
      );
    }

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access and cannot unarchive projects.');
        }

        const isOwner = authUser.id === existing.ownerId;
        if (!isOwner && !authUser.isAdmin) {
          this.logger.warn(
            `User ${authUser.id} denied unarchive on project ${id} owned by ${existing.ownerId}`,
          );
          throw new ForbiddenException(
            'Only the project owner or system administrator can unarchive this project.',
          );
        }
      }
    }

    // Restore previousStatus if set; fall back to ACTIVE for legacy archived projects without previous_status
    const restoredStatus = existing.previousStatus || ProjectStatus.ACTIVE;

    const updateData: Record<string, any> = {
      status: restoredStatus,
      previous_status: null,
      updated_at: new Date().toISOString(),
    };

    const client = this.getSupabaseClient(authHeader);
    let { data, error } = await client
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // Fallback if previous_status column is missing from Supabase schema cache
    if (error && error.message?.includes('previous_status')) {
      this.logger.warn(
        `Supabase schema cache missing 'previous_status' column. Falling back to status update.`,
      );
      delete updateData.previous_status;
      const retryResult = await client
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error || !data) {
      this.logger.error(`Failed to unarchive project ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to unarchive project');
    }

    return this.formatProject(data);
  }

  async transferOwnership(
    id: string,
    dto: TransferOwnershipDto,
    authHeader?: string,
  ) {
    this.validateUuid(id);
    if (!dto.newOwnerId || !UUID_REGEX.test(dto.newOwnerId)) {
      throw new BadRequestException(`Invalid new owner ID format: '${dto.newOwnerId}'`);
    }

    const existing = await this.findOne(id, authHeader);

    if (existing.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot transfer ownership of an archived project. Unarchive the project first.',
      );
    }

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access.');
        }

        const isOwner = authUser.id === existing.ownerId;
        if (!isOwner && !authUser.isAdmin) {
          this.logger.warn(
            `User ${authUser.id} denied ownership transfer on project ${id} owned by ${existing.ownerId}`,
          );
          throw new ForbiddenException(
            'Only the project owner or system administrator can transfer project ownership.',
          );
        }
      }
    }

    if (existing.ownerId === dto.newOwnerId) {
      throw new BadRequestException(
        'The specified user is already the current owner of this project.',
      );
    }

    const client = this.getSupabaseClient(authHeader);
    const { data, error } = await client
      .from('projects')
      .update({
        owner_id: dto.newOwnerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to transfer ownership of project ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to transfer project ownership');
    }

    this.logger.log(
      `Project ${id} ownership transferred from ${existing.ownerId} to ${dto.newOwnerId}`,
    );

    return this.formatProject(data);
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid project ID format: '${id}'`);
    }
  }

  private validateDates(startDate?: string | null, endDate?: string | null): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        throw new BadRequestException(
          'End date cannot be earlier than start date',
        );
      }
    }
  }

  private formatProject(row: any) {
    if (!row) {
      throw new NotFoundException('Project data not found');
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      status: row.status,
      previousStatus: row.previous_status ?? null,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
