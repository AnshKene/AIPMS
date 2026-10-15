/**
 * AIPMS Admin API Client Module
 * Dedicated API endpoints for Admin Overview, System Health, Audit Logs, and Workspace Governance.
 */

import { apiClient } from './client';

export interface AdminOverviewMetrics {
  totalUsers: number;
  roleBreakdown: Record<string, number>;
  totalProjects: number;
  totalTeams: number;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  servicesHealthy: string;
}

export interface AdminOverviewResponse {
  metrics: AdminOverviewMetrics;
  recentActivity: AuditLogItem[];
  healthSummary: {
    healthy: number;
    degraded: number;
    offline: number;
    total: number;
  };
  timestamp: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  targetResource?: string;
  previousValue?: string;
  newValue?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ServiceHealthItem {
  service: string;
  name: string;
  url: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  timestamp: string;
  services: ServiceHealthItem[];
  summary: {
    healthy: number;
    degraded: number;
    offline: number;
    total: number;
  };
}

export interface AdminWorkspacesResponse {
  projects: Array<{
    id: string;
    name: string;
    key: string;
    ownerId?: string;
    createdAt?: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    projectId?: string;
    memberCount?: number;
  }>;
  meta: {
    totalProjects: number;
    totalTeams: number;
  };
}

export const adminApi = {
  getOverview: async () => {
    return apiClient.get<AdminOverviewResponse>('/admin/overview');
  },

  getAuditLogs: async (params?: {
    action?: string;
    actorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    return apiClient.get<AuditLogsResponse>('/admin/audit-logs', { params });
  },

  getSystemHealth: async () => {
    return apiClient.get<SystemHealthResponse>('/admin/health');
  },

  getWorkspaces: async () => {
    return apiClient.get<AdminWorkspacesResponse>('/admin/workspaces');
  },
};
