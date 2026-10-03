'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  CheckSquare,
  Zap,
  AlertTriangle,
  Sparkles,
  Server,
  ArrowUpRight,
  Clock,
  Layers,
  RefreshCw,
  AlertCircle,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { listProjects, type Project } from '@/lib/api/projects';
import { reportsApi } from '@/lib/api/reports';

interface AggregatedMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalSprints: number;
  activeSprints: number;
  totalRisks: number;
  openRisks: number;
  highScoreRisks: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [metrics, setMetrics] = React.useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const projectsRes = await listProjects({ limit: 100 });
      const projectList = projectsRes.data ?? [];
      setProjects(projectList);

      if (projectList.length === 0) {
        setMetrics({
          totalProjects: 0,
          activeProjects: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          totalSprints: 0,
          activeSprints: 0,
          totalRisks: 0,
          openRisks: 0,
          highScoreRisks: 0,
        });
        return;
      }

      const activeProjectsCount = projectList.filter((p) => p.status === 'ACTIVE').length;

      // Fetch overview reports for accessible projects
      const reportPromises = projectList.map((p) =>
        reportsApi.getProjectOverview(p.id).catch(() => null),
      );

      const reports = await Promise.all(reportPromises);

      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;
      let totalSprints = 0;
      let activeSprints = 0;
      let totalRisks = 0;
      let openRisks = 0;
      let highScoreRisks = 0;

      for (const rep of reports) {
        if (!rep) continue;
        totalTasks += rep.tasks?.totalTasks ?? rep.tasks?.total ?? 0;
        completedTasks += rep.tasks?.completedTasks ?? rep.tasks?.done ?? 0;
        pendingTasks += rep.tasks?.pendingTasks ?? 0;
        overdueTasks += rep.tasks?.overdue ?? 0;

        totalSprints += rep.sprints?.totalSprints ?? rep.sprints?.total ?? 0;
        activeSprints += rep.sprints?.activeSprints ?? rep.sprints?.active ?? 0;

        totalRisks += rep.risks?.totalRisks ?? rep.risks?.total ?? 0;
        openRisks += rep.risks?.openRisks ?? rep.risks?.open ?? 0;
        if ((rep.risks?.averageScore ?? 0) >= 6) {
          highScoreRisks++;
        }
      }

      setMetrics({
        totalProjects: projectList.length,
        activeProjects: activeProjectsCount,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalSprints,
        activeSprints,
        totalRisks,
        openRisks,
        highScoreRisks,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load executive dashboard data from API Gateway.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    listProjects({ limit: 100 })
      .then(async (projectsRes) => {
        if (!active) return;
        const projectList = projectsRes.data ?? [];
        setProjects(projectList);

        if (projectList.length === 0) {
          setMetrics({
            totalProjects: 0,
            activeProjects: 0,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            overdueTasks: 0,
            totalSprints: 0,
            activeSprints: 0,
            totalRisks: 0,
            openRisks: 0,
            highScoreRisks: 0,
          });
          setLoading(false);
          return;
        }

        const activeProjectsCount = projectList.filter((p) => p.status === 'ACTIVE').length;
        const reportPromises = projectList.map((p) =>
          reportsApi.getProjectOverview(p.id).catch(() => null),
        );

        const reports = await Promise.all(reportPromises);
        if (!active) return;

        let totalTasks = 0;
        let completedTasks = 0;
        let pendingTasks = 0;
        let overdueTasks = 0;
        let totalSprints = 0;
        let activeSprints = 0;
        let totalRisks = 0;
        let openRisks = 0;
        let highScoreRisks = 0;

        for (const rep of reports) {
          if (!rep) continue;
          totalTasks += rep.tasks?.totalTasks ?? rep.tasks?.total ?? 0;
          completedTasks += rep.tasks?.completedTasks ?? rep.tasks?.done ?? 0;
          pendingTasks += rep.tasks?.pendingTasks ?? 0;
          overdueTasks += rep.tasks?.overdue ?? 0;

          totalSprints += rep.sprints?.totalSprints ?? rep.sprints?.total ?? 0;
          activeSprints += rep.sprints?.activeSprints ?? rep.sprints?.active ?? 0;

          totalRisks += rep.risks?.totalRisks ?? rep.risks?.total ?? 0;
          openRisks += rep.risks?.openRisks ?? rep.risks?.open ?? 0;
          if ((rep.risks?.averageScore ?? 0) >= 6) {
            highScoreRisks++;
          }
        }

        setMetrics({
          totalProjects: projectList.length,
          activeProjects: activeProjectsCount,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          totalSprints,
          activeSprints,
          totalRisks,
          openRisks,
          highScoreRisks,
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to load executive dashboard data from API Gateway.';
        setError(msg);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    {
      title: 'Total Projects',
      value: loading ? '--' : String(metrics?.totalProjects ?? 0),
      subtitle: loading
        ? 'Loading projects...'
        : (metrics?.totalProjects ?? 0) === 0
          ? 'No active projects yet'
          : `${metrics?.activeProjects ?? 0} active, ${(metrics?.totalProjects ?? 0) - (metrics?.activeProjects ?? 0)} other`,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100',
      href: '/projects',
    },
    {
      title: 'Total Tasks',
      value: loading ? '--' : String(metrics?.totalTasks ?? 0),
      subtitle: loading
        ? 'Loading tasks...'
        : (metrics?.totalTasks ?? 0) === 0
          ? 'No tasks configured'
          : `${metrics?.completedTasks ?? 0} completed • ${metrics?.pendingTasks ?? 0} pending`,
      icon: CheckSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
      href: '/tasks',
    },
    {
      title: 'Active Sprints',
      value: loading ? '--' : String(metrics?.activeSprints ?? 0),
      subtitle: loading
        ? 'Loading sprints...'
        : (metrics?.totalSprints ?? 0) === 0
          ? 'No planned sprints'
          : `${metrics?.totalSprints ?? 0} total sprint iteration${(metrics?.totalSprints ?? 0) === 1 ? '' : 's'}`,
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100',
      href: '/sprints',
    },
    {
      title: 'Open Risks',
      value: loading ? '--' : String(metrics?.openRisks ?? 0),
      subtitle: loading
        ? 'Loading risks...'
        : (metrics?.totalRisks ?? 0) === 0
          ? 'No identified risks'
          : (metrics?.highScoreRisks ?? 0) > 0
            ? `${metrics?.highScoreRisks} critical risk vectors (≥6)`
            : `${metrics?.openRisks ?? 0} open, ${metrics?.totalRisks ? metrics.totalRisks - (metrics.openRisks ?? 0) : 0} mitigated/resolved`,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-100',
      href: '/risks',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                AIPMS Executive Overview
              </h2>
              <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider">
                Live Data Active
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Aggregated project health, sprint velocity, task bottlenecks, and risk exposure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadDashboardData()}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge
              variant="outline"
              className="gap-1.5 py-1.5 px-3 border-emerald-200 bg-emerald-50/50 text-emerald-800 font-medium"
            >
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              API Gateway Connected (:3000)
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
              onClick={() => void loadDashboardData()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty State Prompt */}
        {!loading && projects.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-3">
              <FolderKanban className="h-10 w-10 text-slate-400" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-800">
                  No Projects Configured Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Create your first project to start tracking tasks, agile sprints, and automated risk matrix scores.
                </p>
              </div>
              <Link href="/projects">
                <Button size="sm" className="gap-1.5 mt-2">
                  <Plus className="h-4 w-4" />
                  Create First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Overview Stat Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href} className="block group">
                <Card className="transition-all duration-200 hover:shadow-md hover:border-slate-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg border ${card.bgColor}`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-extrabold text-slate-900">
                        {card.value}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {card.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Secondary Dashboard Sections */}
        <div className="grid gap-6 md:grid-cols-7">
          {/* AI Project Insights Foundation Card */}
          <Card className="md:col-span-4 border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      AI System Analysis & Risk Radar
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Predictive project health analysis powered by microservices
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                  Foundation Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
                <Clock className="h-8 w-8 text-slate-400 mx-auto mb-1" />
                <h4 className="text-sm font-semibold text-slate-700">
                  Multi-Service Aggregation Connected
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {projects.length > 0
                    ? `Currently monitoring ${projects.length} project${projects.length === 1 ? '' : 's'} across tasks, sprint iterations, and risk matrices.`
                    : 'Once project records and task dependencies are created, the system evaluates bottleneck vectors and probability-impact risk scores.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <Link
                  href="/tasks"
                  className="flex items-center gap-2 p-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors"
                >
                  <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Task Service</div>
                    <div className="text-[10px] text-slate-500">
                      {loading ? '...' : `${metrics?.totalTasks ?? 0} Tasks • ${metrics?.overdueTasks ?? 0} Overdue`}
                    </div>
                  </div>
                </Link>
                <Link
                  href="/risks"
                  className="flex items-center gap-2 p-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Risk Matrix</div>
                    <div className="text-[10px] text-slate-500">
                      {loading ? '...' : `${metrics?.openRisks ?? 0} Open Risks`}
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick System Links Card */}
          <Card className="md:col-span-3 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">
                AIPMS Platform Modules
              </CardTitle>
              <CardDescription className="text-xs">
                Core domain services integrated via API Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { name: 'Projects Module', href: '/projects', desc: 'Project ownership & metadata', port: '3002' },
                { name: 'Teams Module', href: '/teams', desc: 'Team membership & allocation', port: '3003' },
                { name: 'Tasks & Dependencies', href: '/tasks', desc: 'Task hierarchy & DAG', port: '3004' },
                { name: 'Sprints Engine', href: '/sprints', desc: 'Agile sprint iteration cycles', port: '3005' },
                { name: 'Risk Management', href: '/risks', desc: 'Probability & score calculator', port: '3006' },
                { name: 'Reporting Service', href: '/reports', desc: 'Aggregated project metrics', port: '3007' },
              ].map((mod) => (
                <Link
                  key={mod.name}
                  href={mod.href}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{mod.name}</span>
                    <span className="text-[10px] text-slate-500">{mod.desc}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-slate-600">
                    :{mod.port}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
