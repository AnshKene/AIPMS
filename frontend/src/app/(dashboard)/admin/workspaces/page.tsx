'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Users,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Key,
} from 'lucide-react';
import { adminApi, AdminWorkspacesResponse } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

export default function WorkspaceAdminPage() {
  const { user } = useAuth();
  const [data, setData] = React.useState<AdminWorkspacesResponse | null>(null);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchWorkspaces = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await adminApi.getWorkspaces();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve workspace admin data');
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
        const res = await adminApi.getWorkspaces();
        if (!ignore) setData(res);
      } catch (err) {
        if (!ignore)
          setError(err instanceof Error ? err.message : 'Failed to retrieve workspace admin data');
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
          Workspace administration requires the <strong className="font-semibold text-slate-700 dark:text-slate-300">ADMIN</strong> role.
        </p>
        <Link href="/dashboard">
          <Button className="mt-2">Return to Workspace Dashboard</Button>
        </Link>
      </div>
    );
  }

  const filteredProjects = (data?.projects || []).filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.key?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredTeams = (data?.teams || []).filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <AdminPageHeader
        title="Workspace Administration"
        description="Global project governance, team memberships, and resource allocations across the AIPMS platform."
        breadcrumbs={[
          { label: 'Administration', href: '/admin/overview' },
          { label: 'Workspaces' },
        ]}
        onRefresh={() => fetchWorkspaces(true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-indigo-600 dark:bg-indigo-400"
      />

      {/* Error alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Failed to load workspace data
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchWorkspaces()}
              className="shrink-0 text-xs border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects by name, key, or team names..."
        totalCount={(data?.projects.length || 0) + (data?.teams.length || 0)}
        filteredCount={filteredProjects.length + filteredTeams.length}
        onReset={() => setSearch('')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminMetricCard
          title="Total Workspace Projects"
          value={data?.meta.totalProjects ?? 0}
          subtitle="Managed project repositories"
          icon={FolderKanban}
          iconBgStyle="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextStyle="text-indigo-600 dark:text-indigo-400"
          isLoading={isLoading}
        />

        <AdminMetricCard
          title="Total Workspace Teams"
          value={data?.meta.totalTeams ?? 0}
          subtitle="Registered engineering & product teams"
          icon={Layers}
          iconBgStyle="bg-blue-50 dark:bg-blue-950/60"
          iconTextStyle="text-blue-600 dark:text-blue-400"
          isLoading={isLoading}
        />
      </div>

      {/* Projects Governance Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderKanban className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>Workspace Projects ({filteredProjects.length})</span>
          </h3>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>View All Projects</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm border-slate-200/80 dark:border-slate-800">
            No projects found matching your search query.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-4 space-y-3 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {project.name}
                    </h4>
                    <Badge variant="outline" className="font-mono text-[10px] mt-1">
                      <Key className="h-3 w-3 mr-1" />
                      {project.key || project.name.slice(0, 3).toUpperCase()}
                    </Badge>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px]">
                    ACTIVE
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Project ID: <strong className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{project.id.slice(0, 8)}...</strong></span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>View Project</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Teams Governance Grid */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            <span>Workspace Teams ({filteredTeams.length})</span>
          </h3>
          <Link href="/teams">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>View All Teams</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm border-slate-200/80 dark:border-slate-800">
            No teams found matching your search query.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <Card
                key={team.id}
                className="p-4 space-y-3 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {team.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Members: <strong className="font-semibold text-slate-800 dark:text-slate-200">{team.memberCount || 0}</strong>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    TEAM
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Team ID: <strong className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{team.id.slice(0, 8)}...</strong></span>
                  <Link
                    href={`/teams/${team.id}`}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>View Team</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
