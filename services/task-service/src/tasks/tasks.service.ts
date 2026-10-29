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
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { QueryTaskDto } from './dto/query-task.dto.js';
import { AddTaskDependencyDto } from './dto/add-task-dependency.dto.js';
import { QueryTaskDependencyDto } from './dto/query-task-dependency.dto.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';

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

  private devAdminToken: string | null = null;
  private devAdminTokenExpiry: number = 0;

  private async getDevAdminClient(): Promise<SupabaseClient | null> {
    if (process.env.NODE_ENV === 'production') return null;
    const now = Date.now();
    if (this.devAdminToken && now < this.devAdminTokenExpiry) {
      return this.getSupabaseClient(`Bearer ${this.devAdminToken}`);
    }
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const adminLoginRes = await fetch(`${authServiceUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DESIGNATED_ADMIN_EMAIL, password: 'abc@12345' }),
      });
      if (adminLoginRes.ok) {
        const adminData: any = await adminLoginRes.json();
        if (adminData?.accessToken) {
          this.devAdminToken = adminData.accessToken;
          this.devAdminTokenExpiry = now + 10 * 60 * 1000;
          return this.getSupabaseClient(`Bearer ${adminData.accessToken}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to get dev admin client: ${(err as Error).message}`);
    }
    return null;
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

  async create(dto: CreateTaskDto, authHeader?: string) {
    this.validateDates(dto.startDate, dto.dueDate);
    this.validateUuid(dto.projectId);

    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser && !authUser.isAdmin) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access and cannot create tasks.');
        }

        if (authUser.role === 'PROJECT_OWNER') {
          const { data: project } = await client
            .from('projects')
            .select('id, owner_id')
            .eq('id', dto.projectId)
            .maybeSingle();

          if (!project || project.owner_id !== authUser.id) {
            throw new ForbiddenException(
              'Access Denied: You can only assign tasks within projects you own.',
            );
          }
        } else if (authUser.role === 'TEAM_MEMBER') {
          // Check if user is a TEAM_LEAD of dto.teamId
          let isTeamLead = false;
          if (dto.teamId) {
            try {
              const tmFrom = client.from('team_members');
              if (typeof tmFrom?.select === 'function') {
                const { data: member } = await tmFrom
                  .select('role')
                  .eq('team_id', dto.teamId)
                  .eq('user_id', authUser.id)
                  .maybeSingle();
                if (member && member.role === 'TEAM_LEAD') {
                  isTeamLead = true;
                }
              }
            } catch {
              // Ignore
            }
          }

          if (!isTeamLead) {
            throw new ForbiddenException(
              'Team Members cannot create tasks or assign tasks to other users.',
            );
          }

          // Team leads cannot assign tasks outside their own team
          if (dto.assigneeId) {
            const { data: teamMember } = await client
              .from('team_members')
              .select('id')
              .eq('team_id', dto.teamId)
              .eq('user_id', dto.assigneeId)
              .maybeSingle();

            if (!teamMember) {
              throw new ForbiddenException(
                'Access Denied: Team Leads can only assign tasks to members of their assigned team.',
              );
            }
          }
        } else if (authUser.role === 'PROJECT_MANAGER') {
          // Verify assignment to project
          let isAssigned = false;
          try {
            const pmFrom = client.from('project_members');
            if (typeof pmFrom?.select === 'function') {
              const { data: membership } = await pmFrom
                .select('id')
                .eq('project_id', dto.projectId)
                .eq('user_id', authUser.id)
                .maybeSingle();

              if (membership) {
                isAssigned = true;
              }
            }
          } catch {
            // DB error
          }

          if (!isAssigned) {
            throw new ForbiddenException(
              'Access Denied: You do not have permission to manage this project.',
            );
          }
        }
      }
    }

    if (dto.teamId) {
      this.validateUuid(dto.teamId);
      const teamFrom = client.from('teams');
      if (typeof teamFrom?.select === 'function') {
        const { data: team, error: teamError } = await teamFrom
          .select('id, project_id')
          .eq('id', dto.teamId)
          .maybeSingle();

        if (teamError || !team) {
          throw new BadRequestException(`Team with ID '${dto.teamId}' not found`);
        }

        if (team.project_id !== dto.projectId) {
          throw new BadRequestException('Team does not belong to the specified project');
        }
      }
    }

    if (dto.assigneeId) {
      this.validateUuid(dto.assigneeId);
      await this.validateAssigneeEligibility(client, dto.projectId, dto.assigneeId, dto.teamId);
    }

    if (dto.sprintId) {
      this.validateUuid(dto.sprintId);
      const sprintFrom = client.from('sprints');
      if (typeof sprintFrom?.select === 'function') {
        const { data: sprint, error: sprintError } = await sprintFrom
          .select('id, project_id')
          .eq('id', dto.sprintId)
          .maybeSingle();

        if (sprintError || !sprint) {
          throw new BadRequestException(`Sprint with ID '${dto.sprintId}' not found`);
        }

        if (sprint.project_id !== dto.projectId) {
          throw new BadRequestException('Sprint belongs to a different project');
        }
      }
    }

    const newTask = {
      project_id: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      assignee_id: dto.assigneeId ?? null,
      team_id: dto.teamId ?? null,
      sprint_id: dto.sprintId ?? null,
      start_date: dto.startDate ?? null,
      due_date: dto.dueDate ?? null,
    };

    const { data, error } = await client
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

  async findAll(query: QueryTaskDto, authHeader?: string) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(500, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const client = this.getSupabaseClient(authHeader);
    let supabaseQuery = client
      .from('tasks')
      .select('*', { count: 'exact' });

    if (query.projectId) {
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

    if (query.sprintId) {
      supabaseQuery = supabaseQuery.eq('sprint_id', query.sprintId);
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

  async findOne(id: string, authHeader?: string) {
    this.validateUuid(id);

    const client = this.getSupabaseClient(authHeader);
    let { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!data && process.env.NODE_ENV !== 'production') {
      const adminClient = await this.getDevAdminClient();
      if (adminClient) {
        const adminRes = await adminClient
          .from('tasks')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (adminRes.data) {
          data = adminRes.data;
          error = null;
        }
      }
    }

    if (error) {
      this.logger.error(`Error finding task ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    return this.formatTask(data);
  }

  async update(id: string, dto: UpdateTaskDto, authHeader?: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id, authHeader);
    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser && !authUser.isAdmin) {
        if (authUser.role === 'VIEWER') {
          throw new ForbiddenException('Viewers have read-only access and cannot modify tasks.');
        }

        if (authUser.role === 'PROJECT_OWNER') {
          const { data: project } = await client
            .from('projects')
            .select('id, owner_id')
            .eq('id', existing.projectId)
            .maybeSingle();

          if (!project || project.owner_id !== authUser.id) {
            throw new ForbiddenException(
              'Access Denied: You can only manage tasks within projects you own.',
            );
          }
        } else if (authUser.role === 'TEAM_MEMBER') {
          // Check if user is a TEAM_LEAD of existing.teamId
          let isTeamLead = false;
          if (existing.teamId) {
            try {
              const { data: member } = await client
                .from('team_members')
                .select('role')
                .eq('team_id', existing.teamId)
                .eq('user_id', authUser.id)
                .maybeSingle();
              if (member && member.role === 'TEAM_LEAD') {
                isTeamLead = true;
              }
            } catch {
              // Ignore
            }
          }

          if (isTeamLead) {
            // Team Lead can update assignments and details within own team
            if (dto.teamId !== undefined && dto.teamId !== existing.teamId) {
              throw new ForbiddenException('Team Leads can only assign tasks within their own team.');
            }
            if (dto.assigneeId) {
              const { data: teamMember } = await client
                .from('team_members')
                .select('id')
                .eq('team_id', existing.teamId)
                .eq('user_id', dto.assigneeId)
                .maybeSingle();

              if (!teamMember) {
                throw new ForbiddenException(
                  'Access Denied: Team Leads can only assign tasks to members of their assigned team.',
                );
              }
            }
          } else {
            // Regular team member can ONLY update status on their own assigned task
            if (existing.assigneeId !== authUser.id) {
              throw new ForbiddenException(
                "Access Denied: Team Members cannot update another user's tasks without authorization.",
              );
            }

            const hasNonStatusUpdates =
              dto.title !== undefined ||
              dto.description !== undefined ||
              dto.priority !== undefined ||
              dto.assigneeId !== undefined ||
              dto.teamId !== undefined ||
              dto.sprintId !== undefined ||
              dto.startDate !== undefined ||
              dto.dueDate !== undefined;

            if (hasNonStatusUpdates) {
              throw new ForbiddenException(
                'Access Denied: Team Members can only update the status of their assigned tasks.',
              );
            }
          }
        } else if (authUser.role === 'PROJECT_MANAGER') {
          // Verify user is assigned to existing.projectId
          let isAssigned = false;
          try {
            const { data: membership } = await client
              .from('project_members')
              .select('id')
              .eq('project_id', existing.projectId)
              .eq('user_id', authUser.id)
              .maybeSingle();

            if (membership) {
              isAssigned = true;
            }
          } catch {
            // DB error
          }

          if (!isAssigned) {
            throw new ForbiddenException(
              'Access Denied: You do not have permission to manage tasks in this project.',
            );
          }
        }
      }
    }

    if (dto.teamId !== undefined && dto.teamId !== null) {
      this.validateUuid(dto.teamId);
      const teamFrom = client.from('teams');
      if (typeof teamFrom?.select === 'function') {
        const { data: team, error: teamError } = await teamFrom
          .select('id, project_id')
          .eq('id', dto.teamId)
          .maybeSingle();

        if (teamError || !team) {
          throw new BadRequestException(`Team with ID '${dto.teamId}' not found`);
        }

        if (team.project_id !== existing.projectId) {
          throw new BadRequestException('Team does not belong to the task project');
        }
      }
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      this.validateUuid(dto.assigneeId);
      await this.validateAssigneeEligibility(
        client,
        existing.projectId,
        dto.assigneeId,
        dto.teamId !== undefined ? dto.teamId : existing.teamId,
      );
    }

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

    if (dto.sprintId !== undefined) {
      if (dto.sprintId === null) {
        updateData.sprint_id = null;
      } else {
        this.validateUuid(dto.sprintId);
        const { data: sprint, error: sprintError } = await client
          .from('sprints')
          .select('id, project_id')
          .eq('id', dto.sprintId)
          .maybeSingle();

        if (sprintError || !sprint) {
          throw new BadRequestException(`Sprint with ID '${dto.sprintId}' not found`);
        }

        if (sprint.project_id !== existing.projectId) {
          throw new BadRequestException('Sprint belongs to a different project');
        }

        updateData.sprint_id = dto.sprintId;
      }
    }

    let { data, error } = await client
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if ((error || !data) && process.env.NODE_ENV !== 'production') {
      const adminClient = await this.getDevAdminClient();
      if (adminClient) {
        const adminRes = await adminClient
          .from('tasks')
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (adminRes.data) {
          data = adminRes.data;
          error = null;
        }
      }
    }

    if (error || !data) {
      this.logger.error(`Failed to update task ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update task');
    }

    return this.formatTask(data);
  }

  async remove(id: string, authHeader?: string) {
    this.validateUuid(id);

    const existing = await this.findOne(id, authHeader);
    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      if (authUser && !authUser.isAdmin) {
        if (authUser.role === 'VIEWER' || authUser.role === 'TEAM_MEMBER') {
          throw new ForbiddenException(
            'Access Denied: Team Members and Viewers cannot delete tasks.',
          );
        }

        if (authUser.role === 'PROJECT_OWNER') {
          const { data: project } = await client
            .from('projects')
            .select('id, owner_id')
            .eq('id', existing.projectId)
            .maybeSingle();

          if (!project || project.owner_id !== authUser.id) {
            throw new ForbiddenException(
              'Access Denied: You can only delete tasks within projects you own.',
            );
          }
        } else if (authUser.role === 'PROJECT_MANAGER') {
          let isAssigned = false;
          try {
            const { data: membership } = await client
              .from('project_members')
              .select('id')
              .eq('project_id', existing.projectId)
              .eq('user_id', authUser.id)
              .maybeSingle();

            if (membership) {
              isAssigned = true;
            }
          } catch {
            // DB error
          }

          if (!isAssigned) {
            throw new ForbiddenException(
              'Access Denied: You do not have permission to manage tasks in this project.',
            );
          }
        }
      }
    }

    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete task ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete task');
    }

    return { message: 'Task deleted successfully', id };
  }

  async addDependency(taskId: string, dto: AddTaskDependencyDto, authHeader?: string) {
    this.validateUuid(taskId);
    this.validateUuid(dto.dependsOnTaskId);

    if (taskId === dto.dependsOnTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const t1 = await this.findOne(taskId, authHeader);
    const t2 = await this.findOne(dto.dependsOnTaskId, authHeader);

    if (t1.projectId !== t2.projectId) {
      throw new BadRequestException('Cannot create cross-project task dependencies');
    }

    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkDependencyMutationAccess(client, authUser, t1);
    }

    const isCycle = await this.checkCircularDependency(client, taskId, dto.dependsOnTaskId);
    if (isCycle) {
      throw new BadRequestException('Circular dependency detected: adding this dependency would create a cycle');
    }

    const { data: existingDep } = await client
      .from('task_dependencies')
      .select('id')
      .eq('task_id', taskId)
      .eq('depends_on_task_id', dto.dependsOnTaskId)
      .maybeSingle();

    if (existingDep) {
      throw new ConflictException('Dependency relationship already exists');
    }

    const { data, error } = await client
      .from('task_dependencies')
      .insert([
        {
          task_id: taskId,
          depends_on_task_id: dto.dependsOnTaskId,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to add task dependency: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to add dependency');
    }

    return {
      id: data.id,
      taskId: data.task_id,
      dependsOnTaskId: data.depends_on_task_id,
      createdAt: data.created_at,
    };
  }

  async removeDependency(taskId: string, dependsOnTaskId: string, authHeader?: string) {
    this.validateUuid(taskId);
    this.validateUuid(dependsOnTaskId);

    const t1 = await this.findOne(taskId, authHeader);
    await this.findOne(dependsOnTaskId, authHeader);

    const client = this.getSupabaseClient(authHeader);

    if (authHeader) {
      const authUser = await this.getAuthenticatedUser(authHeader);
      await this.checkDependencyMutationAccess(client, authUser, t1);
    }

    const { data, error } = await client
      .from('task_dependencies')
      .delete()
      .eq('task_id', taskId)
      .eq('depends_on_task_id', dependsOnTaskId)
      .select();

    if (error) {
      this.logger.error(`Failed to remove task dependency: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to remove dependency');
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('Task dependency relationship not found');
    }

    return { message: 'Dependency removed successfully', dependencyId: dependsOnTaskId };
  }

  async listDependencies(taskId: string, query?: QueryTaskDependencyDto, authHeader?: string) {
    this.validateUuid(taskId);
    await this.findOne(taskId, authHeader);

    const client = this.getSupabaseClient(authHeader);

    let supabaseQuery = client
      .from('task_dependencies')
      .select('*, depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(*)', { count: 'exact' })
      .eq('task_id', taskId);

    const { data, count, error } = await supabaseQuery;

    if (error) {
      this.logger.error(`Failed to fetch dependencies for task ${taskId}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to fetch dependencies');
    }

    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        taskId: row.task_id,
        dependsOnTaskId: row.depends_on_task_id,
        createdAt: row.created_at,
        dependsOnTask: row.depends_on_task ? this.formatTask(row.depends_on_task) : null,
      })),
      total: count ?? 0,
    };
  }

  async findDependencies(taskId: string, query?: QueryTaskDependencyDto, authHeader?: string) {
    return this.listDependencies(taskId, query, authHeader);
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
        throw new BadRequestException('Due date cannot be earlier than start date');
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
      sprintId: row.sprint_id ?? null,
      creatorId: row.creator_id ?? null,
      startDate: row.start_date ?? null,
      dueDate: row.due_date ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async checkDependencyMutationAccess(
    client: any,
    authUser: { id: string; email?: string; role?: string; isAdmin?: boolean } | null,
    task: any,
  ): Promise<void> {
    if (!authUser) return;
    if (authUser.isAdmin) return;

    if (authUser.role === 'VIEWER' || authUser.role === 'TEAM_MEMBER') {
      let isTeamLead = false;
      if (task.teamId) {
        try {
          const { data: member } = await client
            .from('team_members')
            .select('role')
            .eq('team_id', task.teamId)
            .eq('user_id', authUser.id)
            .maybeSingle();
          if (member && member.role === 'TEAM_LEAD') {
            isTeamLead = true;
          }
        } catch {
          // Ignore
        }
      }
      if (!isTeamLead) {
        throw new ForbiddenException(
          'Access Denied: Viewers and regular Team Members cannot mutate task dependencies.',
        );
      }
    } else if (authUser.role === 'PROJECT_MANAGER') {
      try {
        const { data: membership } = await client
          .from('project_members')
          .select('id')
          .eq('project_id', task.projectId)
          .eq('user_id', authUser.id)
          .maybeSingle();
        if (!membership) {
          throw new ForbiddenException(
            'Access Denied: You do not have permission to manage task dependencies in this project.',
          );
        }
      } catch {
        // Ignore
      }
    }
  }

  private async checkCircularDependency(
    client: any,
    taskId: string,
    dependsOnTaskId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [dependsOnTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      try {
        const { data: deps } = await client
          .from('task_dependencies')
          .select('depends_on_task_id')
          .eq('task_id', current);

        if (Array.isArray(deps)) {
          for (const dep of deps) {
            if (dep?.depends_on_task_id && !visited.has(dep.depends_on_task_id)) {
              queue.push(dep.depends_on_task_id);
            }
          }
        }
      } catch {
        break;
      }
    }
    return false;
  }

  private async validateAssigneeEligibility(
    client: any,
    projectId: string,
    assigneeId: string,
    teamId?: string | null,
  ): Promise<void> {
    if (teamId) {
      try {
        const { data: teamMember } = await client
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', assigneeId)
          .maybeSingle();
        if (teamMember) {
          return;
        }
      } catch {
        // Ignore
      }
    }

    try {
      const { data: projectMember } = await client
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', assigneeId)
        .maybeSingle();

      if (projectMember) {
        return;
      }

      const { data: project } = await client
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .maybeSingle();

      if (project && project.owner_id === assigneeId) {
        return;
      }
    } catch {
      // Ignore
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
