import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { QueryTaskDto } from './dto/query-task.dto.js';
import { AddTaskDependencyDto } from './dto/add-task-dependency.dto.js';
import { QueryTaskDependencyDto } from './dto/query-task-dependency.dto.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
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

  async create(dto: CreateTaskDto) {
    this.validateDates(dto.startDate, dto.dueDate);

    const newTask = {
      project_id: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      assignee_id: dto.assigneeId ?? null,
      team_id: dto.teamId ?? null,
      start_date: dto.startDate ?? null,
      due_date: dto.dueDate ?? null,
    };

    const { data, error } = await this.supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create task: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to create task');
    }

    return this.formatTask(data);
  }

  async findAll(query: QueryTaskDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = this.supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    if (query.projectId) {
      supabaseQuery = supabaseQuery.eq('project_id', query.projectId);
    }

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.priority) {
      supabaseQuery = supabaseQuery.eq('priority', query.priority);
    }

    if (query.assigneeId) {
      supabaseQuery = supabaseQuery.eq('assignee_id', query.assigneeId);
    }

    if (query.teamId) {
      supabaseQuery = supabaseQuery.eq('team_id', query.teamId);
    }

    const { data, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list tasks: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list tasks');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatTask(row)),
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
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error finding task ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    return this.formatTask(data);
  }

  async update(id: string, dto: UpdateTaskDto) {
    this.validateUuid(id);

    const existing = await this.findOne(id);

    const effectiveStartDate = dto.startDate ?? existing.startDate;
    const effectiveDueDate = dto.dueDate ?? existing.dueDate;

    this.validateDates(effectiveStartDate, effectiveDueDate);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assigneeId !== undefined) updateData.assignee_id = dto.assigneeId;
    if (dto.teamId !== undefined) updateData.team_id = dto.teamId;
    if (dto.startDate !== undefined) updateData.start_date = dto.startDate;
    if (dto.dueDate !== undefined) updateData.due_date = dto.dueDate;

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update task ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update task');
    }

    return this.formatTask(data);
  }

  async remove(id: string) {
    this.validateUuid(id);

    await this.findOne(id);

    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete task ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete task');
    }

    return { message: 'Task deleted successfully', id };
  }

  async addDependency(taskId: string, dto: AddTaskDependencyDto) {
    this.validateUuid(taskId);
    this.validateUuid(dto.dependsOnTaskId);

    if (taskId === dto.dependsOnTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Verify both tasks exist
    await this.findOne(taskId);
    await this.findOne(dto.dependsOnTaskId);

    // Check if dependency already exists
    const { data: existingDep, error: existingError } = await this.supabase
      .from('task_dependencies')
      .select('*')
      .eq('task_id', taskId)
      .eq('depends_on_task_id', dto.dependsOnTaskId)
      .maybeSingle();

    if (existingError) {
      this.logger.error(`Error checking existing dependency: ${existingError.message}`);
      throw new BadRequestException(existingError.message);
    }

    if (existingDep) {
      throw new ConflictException('Dependency relationship already exists');
    }

    const newDep = {
      task_id: taskId,
      depends_on_task_id: dto.dependsOnTaskId,
    };

    const { data, error } = await this.supabase
      .from('task_dependencies')
      .insert([newDep])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to add dependency: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to add dependency');
    }

    return this.formatDependency(data);
  }

  async listDependencies(taskId: string, query: QueryTaskDependencyDto) {
    this.validateUuid(taskId);

    // Verify parent task exists
    await this.findOne(taskId);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const { data, count, error } = await this.supabase
      .from('task_dependencies')
      .select('*', { count: 'exact' })
      .eq('task_id', taskId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list dependencies for task ${taskId}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list dependencies');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatDependency(row)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async removeDependency(taskId: string, dependencyId: string) {
    this.validateUuid(taskId);
    this.validateUuid(dependencyId);

    // Verify parent task exists
    await this.findOne(taskId);

    const { data, error } = await this.supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId)
      .eq('task_id', taskId)
      .select();

    if (error) {
      this.logger.error(`Failed to remove dependency: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to remove dependency');
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('Dependency relationship not found');
    }

    return { message: 'Dependency removed successfully', taskId, dependencyId };
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid UUID format: '${id}'`);
    }
  }

  private validateDates(startDate?: string | null, dueDate?: string | null): void {
    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);
      if (due < start) {
        throw new BadRequestException(
          'Due date cannot be earlier than start date',
        );
      }
    }
  }

  private formatTask(row: any) {
    if (!row) {
      throw new NotFoundException('Task data not found');
    }
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description ?? null,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assignee_id ?? null,
      teamId: row.team_id ?? null,
      startDate: row.start_date ?? null,
      dueDate: row.due_date ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatDependency(row: any) {
    if (!row) {
      throw new NotFoundException('Dependency data not found');
    }
    return {
      id: row.id,
      taskId: row.task_id,
      dependsOnTaskId: row.depends_on_task_id,
      createdAt: row.created_at,
    };
  }
}
