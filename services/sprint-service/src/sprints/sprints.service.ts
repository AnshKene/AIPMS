import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateSprintDto } from './dto/create-sprint.dto.js';
import { UpdateSprintDto } from './dto/update-sprint.dto.js';
import { QuerySprintDto } from './dto/query-sprint.dto.js';
import { SprintStatus } from './enums/sprint-status.enum.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  async create(dto: CreateSprintDto) {
    this.validateUuid(dto.project_id);
    this.validateDates(dto.start_date, dto.end_date);

    const newSprint = {
      project_id: dto.project_id,
      name: dto.name,
      goal: dto.goal ?? null,
      status: SprintStatus.PLANNED,
      start_date: dto.start_date,
      end_date: dto.end_date,
    };

    const { data, error } = await this.supabase
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

  async findAll(query: QuerySprintDto) {
    if (query.project_id) {
      this.validateUuid(query.project_id);
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = this.supabase
      .from('sprints')
      .select('*', { count: 'exact' });

    if (query.project_id) {
      supabaseQuery = supabaseQuery.eq('project_id', query.project_id);
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

  async findOne(id: string) {
    this.validateUuid(id);

    const { data, error } = await this.supabase
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

  async update(id: string, dto: UpdateSprintDto) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

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

    const { data, error } = await this.supabase
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

  async start(id: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

    if (existing.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        `Cannot start sprint with status '${existing.status}'. Only PLANNED sprints can be started.`,
      );
    }

    const updateData = {
      status: SprintStatus.ACTIVE,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to start sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to start sprint');
    }

    return this.formatSprint(data);
  }

  async complete(id: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

    if (existing.status !== SprintStatus.ACTIVE) {
      throw new ConflictException(
        `Cannot complete sprint with status '${existing.status}'. Only ACTIVE sprints can be completed.`,
      );
    }

    const updateData = {
      status: SprintStatus.COMPLETED,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to complete sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to complete sprint');
    }

    return this.formatSprint(data);
  }

  async cancel(id: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

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

    const { data, error } = await this.supabase
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to cancel sprint ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to cancel sprint');
    }

    return this.formatSprint(data);
  }

  async remove(id: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

    if (existing.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        `Only PLANNED sprints can be deleted. Cannot delete sprint with status '${existing.status}'.`,
      );
    }

    const { error } = await this.supabase
      .from('sprints')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete sprint ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete sprint');
    }

    return { message: 'Sprint deleted successfully', id };
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid UUID format: '${id}'`);
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
}
