'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  Zap,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { adminApi, AdminOverviewResponse } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = React.useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOverview = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await adminApi.getOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin overview metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminApi.getOverview();
        if (!ignore) setData(res);
      } catch (err) {
        if (!ignore)
          setError(err instanceof Error ? err.message : 'Failed to fetch admin overview metrics');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Access Restricted
        </h1>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          The Admin Panel requires the <strong className="font-semibold text-slate-700 dark:text-slate-300">ADMIN</strong> role. You are currently logged in with the <Badge variant="outline">{user.role}</Badge> role.
        </p>
        <Link href="/dashboard">
          <Button className="mt-2">Return to Workspace Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <AdminPageHeader
        title="Admin Overview"
        description="System operational metrics, active user role distribution, and authoritative security audit events."
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Overview' },
        ]}
        onRefresh={() => fetchOverview(true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-blue-600 dark:bg-blue-400"
        actions={
          <Link href="/admin/users">
            <Button size="sm" className="gap-2 shadow-2xs">
              <Users className="h-4 w-4" />
              <span>Manage Users</span>
            </Button>
          </Link>
        }
      />

      {/* Error alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Failed to load overview data
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOverview()}
              className="shrink-0 text-xs border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Total Users"
          value={data?.metrics.totalUsers ?? 0}
          subtitle="Registered platform user accounts"
          icon={Users}
          iconBgStyle="bg-blue-50 dark:bg-blue-950/60"
          iconTextStyle="text-blue-600 dark:text-blue-400"
          isLoading={isLoading}
        />

        <AdminMetricCard
          title="Total Projects"
          value={data?.metrics.totalProjects ?? 0}
          subtitle="Active workspace project spaces"
          icon={FolderKanban}
          iconBgStyle="bg-purple-50 dark:bg-purple-950/60"
          iconTextStyle="text-purple-600 dark:text-purple-400"
          isLoading={isLoading}
        />

        <AdminMetricCard
          title="Total Teams"
          value={data?.metrics.totalTeams ?? 0}
          subtitle="Cross-functional project teams"
          icon={Layers}
          iconBgStyle="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextStyle="text-emerald-600 dark:text-emerald-400"
          isLoading={isLoading}
        />

        <AdminMetricCard
          title="System Health"
          value={data?.metrics.servicesHealthy || '0/9'}
          subtitle="Monitored REST microservices online"
          icon={Zap}
          iconBgStyle="bg-amber-50 dark:bg-amber-950/60"
          iconTextStyle="text-amber-600 dark:text-amber-400"
          badge={<AdminStatusBadge status={data?.metrics.systemHealth || 'HEALTHY'} />}
          isLoading={isLoading}
        />
      </div>

      {/* Grid: Role Distribution & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Distribution Card */}
        <Card className="lg:col-span-1 p-5 space-y-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                User Roles Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative role allocation across accounts
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-slate-400" />
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { role: 'ADMIN', label: 'Administrators', count: data?.metrics.roleBreakdown.ADMIN ?? 0, color: 'bg-purple-600' },
                { role: 'PROJECT_MANAGER', label: 'Project Managers', count: data?.metrics.roleBreakdown.PROJECT_MANAGER ?? 0, color: 'bg-blue-600' },
                { role: 'TEAM_MEMBER', label: 'Team Members', count: data?.metrics.roleBreakdown.TEAM_MEMBER ?? 0, color: 'bg-emerald-600' },
                { role: 'VIEWER', label: 'Viewers', count: data?.metrics.roleBreakdown.VIEWER ?? 0, color: 'bg-slate-400' },
              ].map((item) => {
                const total = data?.metrics.totalUsers || 1;
                const percentage = Math.round((item.count / total) * 100);

                return (
                  <div key={item.role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-bold">
                        {item.count} <span className="text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link href="/admin/users" className="block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <span>View Users & Access</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quick Admin Navigation Grid */}
        <Card className="lg:col-span-2 p-5 space-y-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Administrative Workspaces
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct access to core administrative control suites
              </p>
            </div>
            <Activity className="h-5 w-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-white dark:bg-slate-900/60 hover:shadow-xs transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Users & Access Management
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Role assignments, last-admin demotion protection, & directory.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-white dark:bg-slate-900/60 hover:shadow-xs transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Security & Audit Logs
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Server-side security event stream, role transitions, & log viewer.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/health"
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 bg-white dark:bg-slate-900/60 hover:shadow-xs transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Zap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  System Health & Services
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time status checks for Gateway, Auth, Tasks, AI, & DB.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/workspaces"
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-900/60 hover:shadow-xs transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Workspace Governance
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Global project governance, team memberships, & resource views.
                </p>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Administrative Activity Log Table */}
      <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Administrative Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Durable, server-recorded security and role change events
            </p>
          </div>
          <Link href="/admin/audit-logs">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>View Audit Logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            No recent administrative activity recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentActivity.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {log.actorEmail || log.actorId}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {log.targetResource || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <AdminStatusBadge status={log.outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
