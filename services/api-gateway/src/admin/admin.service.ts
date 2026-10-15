import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ServiceHealthCheckResult {
  service: string;
  name: string;
  url: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly servicesMap: { service: string; name: string; port: number }[] = [
    { service: 'api-gateway', name: 'API Gateway', port: 3000 },
    { service: 'auth-service', name: 'Auth Service', port: 3001 },
    { service: 'project-service', name: 'Project Service', port: 3002 },
    { service: 'team-service', name: 'Team Service', port: 3003 },
    { service: 'task-service', name: 'Task Service', port: 3004 },
    { service: 'sprint-service', name: 'Sprint Service', port: 3005 },
    { service: 'risk-service', name: 'Risk Service', port: 3006 },
    { service: 'reporting-service', name: 'Reporting Service', port: 3007 },
    { service: 'ai-service', name: 'AI Service (Ollama)', port: 3009 },
  ];

  constructor(private readonly configService: ConfigService) {}

  async checkAllServicesHealth(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
    timestamp: string;
    services: ServiceHealthCheckResult[];
    summary: { healthy: number; degraded: number; offline: number; total: number };
  }> {
    const timestamp = new Date().toISOString();
    const results = await Promise.allSettled(
      this.servicesMap.map(async (s) => {
        const url = `http://localhost:${s.port}/api/health`;
        const startTime = Date.now();
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
          const latencyMs = Date.now() - startTime;

          if (res.ok) {
            let details = {};
            try {
              details = await res.json();
            } catch {
              details = {};
            }
            return {
              service: s.service,
              name: s.name,
              url,
              status: 'HEALTHY' as const,
              latencyMs,
              lastChecked: timestamp,
              details,
            };
          } else {
            return {
              service: s.service,
              name: s.name,
              url,
              status: 'DEGRADED' as const,
              latencyMs,
              lastChecked: timestamp,
              details: { statusCode: res.status, statusText: res.statusText },
            };
          }
        } catch (err) {
          const latencyMs = Date.now() - startTime;
          return {
            service: s.service,
            name: s.name,
            url,
            status: 'OFFLINE' as const,
            latencyMs,
            lastChecked: timestamp,
            details: { error: (err as Error).message },
          };
        }
      }),
    );

    const services: ServiceHealthCheckResult[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const s = this.servicesMap[i];
      return {
        service: s.service,
        name: s.name,
        url: `http://localhost:${s.port}/api/health`,
        status: 'OFFLINE',
        latencyMs: 0,
        lastChecked: timestamp,
        details: { error: 'Request rejected' },
      };
    });

    const healthy = services.filter((s) => s.status === 'HEALTHY').length;
    const degraded = services.filter((s) => s.status === 'DEGRADED').length;
    const offline = services.filter((s) => s.status === 'OFFLINE').length;
    const total = services.length;

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'HEALTHY';
    if (offline > 0) overallStatus = 'DEGRADED';
    if (offline >= total / 2) overallStatus = 'OFFLINE';

    return {
      status: overallStatus,
      timestamp,
      services,
      summary: { healthy, degraded, offline, total },
    };
  }

  async getAdminOverview(authHeader?: string) {
    const health = await this.checkAllServicesHealth();

    // Fetch users count & roles from Auth service
    let users: { id: string; role: string; email: string }[] = [];
    try {
      const res = await fetch('http://localhost:3001/api/auth/users', {
        headers: authHeader ? { authorization: authHeader } : {},
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        users = await res.json();
      }
    } catch {
      this.logger.warn('Failed to fetch user distribution for admin overview');
    }

    // Role breakdown calculation
    const rolesCount: Record<string, number> = {
      ADMIN: 0,
      PROJECT_MANAGER: 0,
      TEAM_MEMBER: 0,
      VIEWER: 0,
    };
    users.forEach((u) => {
      if (u.role && rolesCount[u.role] !== undefined) {
        rolesCount[u.role] += 1;
      }
    });

    // Fetch project counts
    let projectCount = 0;
    try {
      const res = await fetch('http://localhost:3002/api/projects?limit=100', {
        headers: authHeader ? { authorization: authHeader } : {},
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        projectCount = Array.isArray(data) ? data.length : data.meta?.total || (data.data?.length ?? 0);
      }
    } catch {
      this.logger.warn('Failed to fetch projects count for admin overview');
    }

    // Fetch team counts
    let teamCount = 0;
    try {
      const res = await fetch('http://localhost:3003/api/teams?limit=100', {
        headers: authHeader ? { authorization: authHeader } : {},
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        teamCount = Array.isArray(data) ? data.length : data.meta?.total || (data.data?.length ?? 0);
      }
    } catch {
      this.logger.warn('Failed to fetch teams count for admin overview');
    }

    // Fetch recent audit logs from auth service
    let recentAuditLogs: unknown[] = [];
    try {
      const res = await fetch('http://localhost:3001/api/auth/audit-logs?limit=5', {
        headers: authHeader ? { authorization: authHeader } : {},
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        recentAuditLogs = data.items || [];
      }
    } catch {
      this.logger.warn('Failed to fetch audit logs for admin overview');
    }

    return {
      metrics: {
        totalUsers: users.length,
        roleBreakdown: rolesCount,
        totalProjects: projectCount,
        totalTeams: teamCount,
        systemHealth: health.status,
        servicesHealthy: `${health.summary.healthy}/${health.summary.total}`,
      },
      recentActivity: recentAuditLogs,
      healthSummary: health.summary,
      timestamp: new Date().toISOString(),
    };
  }

  async getAuditLogs(query: Record<string, string>, authHeader?: string) {
    const searchParams = new URLSearchParams(query).toString();
    const url = `http://localhost:3001/api/auth/audit-logs${searchParams ? `?${searchParams}` : ''}`;

    const res = await fetch(url, {
      headers: authHeader ? { authorization: authHeader } : {},
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve audit logs: ${res.statusText}`);
    }

    return res.json();
  }

  async getWorkspaces(authHeader?: string) {
    const headers: Record<string, string> = authHeader ? { authorization: authHeader } : {};

    const [projectsRes, teamsRes] = await Promise.allSettled([
      fetch('http://localhost:3002/api/projects?limit=100', { headers, signal: AbortSignal.timeout(4000) }),
      fetch('http://localhost:3003/api/teams?limit=100', { headers, signal: AbortSignal.timeout(4000) }),
    ]);

    let rawProjects: any[] = [];
    let rawTeams: any[] = [];

    if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
      const pData = await projectsRes.value.json();
      rawProjects = Array.isArray(pData) ? pData : pData.data || pData.items || [];
    }

    if (teamsRes.status === 'fulfilled' && teamsRes.value.ok) {
      const tData = await teamsRes.value.json();
      rawTeams = Array.isArray(tData) ? tData : tData.data || tData.items || [];
    }

    const projects = rawProjects.map((p: any) => ({
      id: p.id,
      name: p.name,
      key: p.key || (p.name ? p.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() : 'PRJ'),
      status: p.status || 'ACTIVE',
      ownerId: p.ownerId,
      createdAt: p.createdAt,
    }));

    const teams = rawTeams.map((t: any) => ({
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      memberCount: t.memberCount || (Array.isArray(t.members) ? t.members.length : 0),
      createdAt: t.createdAt,
    }));

    return {
      projects,
      teams,
      meta: {
        totalProjects: projects.length,
        totalTeams: teams.length,
      },
    };
  }
}
