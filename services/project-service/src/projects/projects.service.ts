import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
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

  async create(dto: CreateProjectDto) {
    this.validateDates(dto.startDate, dto.endDate);

    const newProject = {
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? ProjectStatus.PLANNING,
      start_date: dto.startDate ?? null,
      end_date: dto.endDate ?? null,
      owner_id: dto.ownerId,
    };

    const { data, error } = await this.supabase
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

  async findAll(query: QueryProjectDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = this.supabase
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

  async findOne(id: string) {
    this.validateUuid(id);

    const { data, error } = await this.supabase
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

  async update(id: string, dto: UpdateProjectDto) {
    this.validateUuid(id);

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Project with ID '${id}' not found`);
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

    const { data, error } = await this.supabase
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

  async archive(id: string) {
    this.validateUuid(id);

    await this.findOne(id);

    const updateData = {
      status: ProjectStatus.ARCHIVED,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to archive project ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to archive project');
    }

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
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
