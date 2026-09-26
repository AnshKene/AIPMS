import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Task status/priority score maps (match task-service schema exactly) ─────
const TASK_STATUS_ALL = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;
const TASK_PRIORITY_ALL = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

// Sprint status values (match sprint-service schema exactly)
const SPRINT_STATUS_ALL = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

// Risk status values (match risk-service schema exactly)
const RISK_STATUS_ALL = ['OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED', 'CLOSED'] as const;

// Risk probability and impact values
const RISK_PROBABILITY_ALL = ['LOW', 'MEDIUM', 'HIGH'] as const;
const RISK_IMPACT_ALL = ['LOW', 'MEDIUM', 'HIGH'] as const;

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface TasksByStatus {
  TODO: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
  BLOCKED: number;
}

export interface TasksByPriority {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
}

export interface TasksReport {
  projectId: string;
  total: number;
  byStatus: TasksByStatus;
  byPriority: TasksByPriority;
  overdueTasks: number;
}

export interface SprintsByStatus {
  PLANNED: number;
  ACTIVE: number;
  COMPLETED: number;
  CANCELLED: number;
}

export interface SprintsReport {
  projectId: string;
  total: number;
  byStatus: SprintsByStatus;
}

export interface RisksByStatus {
  OPEN: number;
  MITIGATING: number;
  RESOLVED: number;
  ACCEPTED: number;
  CLOSED: number;
}

export interface RisksByProbability {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

export interface RisksByImpact {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

export interface RisksReport {
  projectId: string;
  total: number;
  byStatus: RisksByStatus;
  byProbability: RisksByProbability;
  byImpact: RisksByImpact;
  averageRiskScore: number;
  highScoreRisks: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
}

export interface ProjectOverviewReport {
  projectId: string;
  project: ProjectInfo | null;
  tasks: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    taskCompletionPercentage: number;
    overdue: number;
    total?: number;
    done?: number;
    inProgress?: number;
  };
  sprints: {
    totalSprints: number;
    activeSprints: number;
    completedSprints: number;
    total?: number;
    active?: number;
    completed?: number;
  };
  risks: {
    totalRisks: number;
    openRisks: number;
    mitigatingRisks: number;
    resolvedRisks: number;
    averageScore: number;
    total?: number;
    open?: number;
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
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

  // ─── Task Report ────────────────────────────────────────────────────────────

  async getTasksReport(projectId: string): Promise<TasksReport> {
    this.validateUuid(projectId);

    const { data, error } = await this.supabase
      .from('tasks')
      .select('status, priority, due_date')
      .eq('project_id', projectId);

    if (error) {
      this.logger.error(`Failed to fetch tasks for project ${projectId}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to fetch task data');
    }

    if (!data || data.length === 0) {
      this.throwIfProjectNotFound(projectId, 'tasks');
    }

    const rows = data ?? [];
    const now = new Date();

    const byStatus = Object.fromEntries(
      TASK_STATUS_ALL.map((s) => [s, 0]),
    ) as unknown as TasksByStatus;

    const byPriority = Object.fromEntries(
      TASK_PRIORITY_ALL.map((p) => [p, 0]),
    ) as unknown as TasksByPriority;

    let overdueTasks = 0;

    for (const row of rows) {
      if (byStatus[row.status as keyof TasksByStatus] !== undefined) {
        byStatus[row.status as keyof TasksByStatus]++;
      }
      if (byPriority[row.priority as keyof TasksByPriority] !== undefined) {
        byPriority[row.priority as keyof TasksByPriority]++;
      }
      if (
        row.due_date &&
        new Date(row.due_date) < now &&
        row.status !== 'DONE'
      ) {
        overdueTasks++;
      }
    }

    return {
      projectId,
      total: rows.length,
      byStatus,
      byPriority,
      overdueTasks,
    };
  }

  // ─── Sprint Report ──────────────────────────────────────────────────────────

  async getSprintsReport(projectId: string): Promise<SprintsReport> {
    this.validateUuid(projectId);

    const { data, error } = await this.supabase
      .from('sprints')
      .select('status')
      .eq('project_id', projectId);

    if (error) {
      this.logger.error(`Failed to fetch sprints for project ${projectId}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to fetch sprint data');
    }

    if (!data || data.length === 0) {
      this.throwIfProjectNotFound(projectId, 'sprints');
    }

    const rows = data ?? [];

    const byStatus = Object.fromEntries(
      SPRINT_STATUS_ALL.map((s) => [s, 0]),
    ) as unknown as SprintsByStatus;

    for (const row of rows) {
      if (byStatus[row.status as keyof SprintsByStatus] !== undefined) {
        byStatus[row.status as keyof SprintsByStatus]++;
      }
    }

    return {
      projectId,
      total: rows.length,
      byStatus,
    };
  }

  // ─── Risk Report ────────────────────────────────────────────────────────────

  async getRisksReport(projectId: string): Promise<RisksReport> {
    this.validateUuid(projectId);

    const { data, error } = await this.supabase
      .from('risks')
      .select('status, probability, impact, risk_score')
      .eq('project_id', projectId);

    if (error) {
      this.logger.error(`Failed to fetch risks for project ${projectId}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to fetch risk data');
    }

    if (!data || data.length === 0) {
      this.throwIfProjectNotFound(projectId, 'risks');
    }

    const rows = data ?? [];

    const byStatus = Object.fromEntries(
      RISK_STATUS_ALL.map((s) => [s, 0]),
    ) as unknown as RisksByStatus;

    const byProbability = Object.fromEntries(
      RISK_PROBABILITY_ALL.map((p) => [p, 0]),
    ) as unknown as RisksByProbability;

    const byImpact = Object.fromEntries(
      RISK_IMPACT_ALL.map((i) => [i, 0]),
    ) as unknown as RisksByImpact;

    let totalScore = 0;
    let highScoreRisks = 0;

    for (const row of rows) {
      if (byStatus[row.status as keyof RisksByStatus] !== undefined) {
        byStatus[row.status as keyof RisksByStatus]++;
      }
      if (byProbability[row.probability as keyof RisksByProbability] !== undefined) {
        byProbability[row.probability as keyof RisksByProbability]++;
      }
      if (byImpact[row.impact as keyof RisksByImpact] !== undefined) {
        byImpact[row.impact as keyof RisksByImpact]++;
      }
      totalScore += row.risk_score ?? 0;
      if ((row.risk_score ?? 0) >= 6) {
        highScoreRisks++;
      }
    }

    const averageRiskScore =
      rows.length > 0 ? Math.round((totalScore / rows.length) * 100) / 100 : 0;

    return {
      projectId,
      total: rows.length,
      byStatus,
      byProbability,
      byImpact,
      averageRiskScore,
      highScoreRisks,
    };
  }

  // ─── Project Overview ───────────────────────────────────────────────────────

  async getProjectOverview(projectId: string): Promise<ProjectOverviewReport> {
    this.validateUuid(projectId);

    const [projectData, tasksData, sprintsData, risksData] = await Promise.all([
      this.supabase
        .from('projects')
        .select('id, name, status, start_date, end_date, owner_id')
        .eq('id', projectId)
        .maybeSingle(),
      this.supabase
        .from('tasks')
        .select('status, due_date')
        .eq('project_id', projectId),
      this.supabase
        .from('sprints')
        .select('status')
        .eq('project_id', projectId),
      this.supabase
        .from('risks')
        .select('status, risk_score')
        .eq('project_id', projectId),
    ]);

    if (tasksData.error) {
      this.logger.error(`Tasks query failed: ${tasksData.error.message}`);
      throw new BadRequestException(tasksData.error.message);
    }
    if (sprintsData.error) {
      this.logger.error(`Sprints query failed: ${sprintsData.error.message}`);
      throw new BadRequestException(sprintsData.error.message);
    }
    if (risksData.error) {
      this.logger.error(`Risks query failed: ${risksData.error.message}`);
      throw new BadRequestException(risksData.error.message);
    }

    const projectRow = projectData?.data ?? null;
    const projectInfo: ProjectInfo | null = projectRow
      ? {
          id: projectRow.id,
          name: projectRow.name,
          status: projectRow.status,
          start_date: projectRow.start_date ?? null,
          end_date: projectRow.end_date ?? null,
          owner_id: projectRow.owner_id ?? null,
        }
      : null;

    const tasks = tasksData.data ?? [];
    const sprints = sprintsData.data ?? [];
    const risks = risksData.data ?? [];
    const now = new Date();

    // Tasks aggregation
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const pendingTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_REVIEW').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
    const taskCompletionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100 : 0;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'DONE',
    ).length;

    // Sprints aggregation
    const totalSprints = sprints.length;
    const activeSprints = sprints.filter((s) => s.status === 'ACTIVE').length;
    const completedSprints = sprints.filter((s) => s.status === 'COMPLETED').length;

    // Risks aggregation
    const totalRisks = risks.length;
    const openRisks = risks.filter((r) => r.status === 'OPEN').length;
    const mitigatingRisks = risks.filter((r) => r.status === 'MITIGATING').length;
    const resolvedRisks = risks.filter((r) => r.status === 'RESOLVED').length;
    const totalScore = risks.reduce((acc, r) => acc + (r.risk_score ?? 0), 0);
    const avgScore =
      totalRisks > 0 ? Math.round((totalScore / totalRisks) * 100) / 100 : 0;

    return {
      projectId,
      project: projectInfo,
      tasks: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        blockedTasks,
        taskCompletionPercentage,
        overdue: overdueTasks,
        total: totalTasks,
        done: completedTasks,
        inProgress: inProgressTasks,
      },
      sprints: {
        totalSprints,
        activeSprints,
        completedSprints,
        total: totalSprints,
        active: activeSprints,
        completed: completedSprints,
      },
      risks: {
        totalRisks,
        openRisks,
        mitigatingRisks,
        resolvedRisks,
        averageScore: avgScore,
        total: totalRisks,
        open: openRisks,
      },
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid UUID format: '${id}'`);
    }
  }

  /**
   * If the sub-table returns 0 rows we do NOT know if the project itself
   * exists (that table lives in project-service). We simply return an empty
   * aggregate rather than throwing 404.  Call this helper only in the focused
   * per-domain endpoints so empty really means 0 records.
   */
  private throwIfProjectNotFound(_projectId: string, _domain: string): void {
    // Intentionally a no-op: an empty result set is valid (project has no tasks/sprints/risks yet).
    // The reporting service does not own the projects table and cannot confirm project existence.
  }
}
