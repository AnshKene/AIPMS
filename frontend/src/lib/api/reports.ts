/**
 * Reporting API Module
 * Communicates strictly through the API Gateway at /api/reports.
 */

import { apiClient } from './client';

// ─── Enums & Sub-types ─────────────────────────────────────────────────────────

export interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
}

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

// ─── API Client Methods ───────────────────────────────────────────────────────

export const reportsApi = {
  /**
   * Fetch aggregated project overview report
   */
  async getProjectOverview(projectId: string): Promise<ProjectOverviewReport> {
    return apiClient.get<ProjectOverviewReport>(
      `/reports/projects/${encodeURIComponent(projectId)}/overview`,
    );
  },

  /**
   * Fetch detailed tasks report for a project
   */
  async getTasksReport(projectId: string): Promise<TasksReport> {
    return apiClient.get<TasksReport>(
      `/reports/projects/${encodeURIComponent(projectId)}/tasks`,
    );
  },

  /**
   * Fetch detailed sprints report for a project
   */
  async getSprintsReport(projectId: string): Promise<SprintsReport> {
    return apiClient.get<SprintsReport>(
      `/reports/projects/${encodeURIComponent(projectId)}/sprints`,
    );
  },

  /**
   * Fetch detailed risks report for a project
   */
  async getRisksReport(projectId: string): Promise<RisksReport> {
    return apiClient.get<RisksReport>(
      `/reports/projects/${encodeURIComponent(projectId)}/risks`,
    );
  },
};
