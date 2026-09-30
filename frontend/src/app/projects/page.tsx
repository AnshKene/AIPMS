'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { FolderKanban, Plus, Loader2, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  listProjects,
  createProject,
  type Project,
  type ProjectListMeta,
  type ProjectStatus,
  PROJECT_STATUSES,
} from '@/lib/api/projects';

const STATUS_LABELS: Record<string, string> = {
  '': 'All Statuses',
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const PAGE_LIMIT = 12;

export default function ProjectsPage() {
  const { user } = useAuth();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [meta, setMeta] = React.useState<ProjectListMeta>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    listProjects({
      page,
      limit: PAGE_LIMIT,
      status: statusFilter || undefined,
    })
      .then((result) => {
        if (!isCancelled) {
          setProjects(result.data);
          setMeta(result.meta);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects.');
          setProjects([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, statusFilter, refreshKey]);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value as ProjectStatus | '');
    setPage(1);
    setLoading(true);
  }

  function handlePrev() {
    if (page > 1) {
      setPage((p) => p - 1);
      setLoading(true);
    }
  }

  function handleNext() {
    if (page < meta.totalPages) {
      setPage((p) => p + 1);
      setLoading(true);
    }
  }

  function handleProjectCreated() {
    setPage(1);
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  function handleRetry() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
            </div>
            <p className="text-sm text-slate-500">
              Manage your projects, track status, and collaborate with your team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              id="projects-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
              aria-label="Filter by status"
            >
              {['', ...PROJECT_STATUSES].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            {/* Create Project */}
            <ProjectForm
              mode="create"
              ownerId={user?.id ?? ''}
              trigger={
                <Button size="sm" className="gap-1.5" id="create-project-btn">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              }
              onSubmit={(payload) => createProject(payload as Parameters<typeof createProject>[0])}
              onSuccess={handleProjectCreated}
            />
          </div>
        </div>

        {/* Content Area */}
        {loading && (
          <div className="flex items-center justify-center py-20" aria-label="Loading projects">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center space-y-2">
            <p className="text-sm font-semibold text-red-700">Failed to load projects</p>
            <p className="text-xs text-red-500">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
            <FolderOpen className="h-10 w-10 text-slate-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                {statusFilter ? `No ${STATUS_LABELS[statusFilter]} projects` : 'No projects yet'}
              </p>
              <p className="text-xs text-slate-400">
                {statusFilter
                  ? 'Try a different status filter or create a new project.'
                  : 'Create your first project to get started.'}
              </p>
            </div>
            {!statusFilter && (
              <ProjectForm
                mode="create"
                ownerId={user?.id ?? ''}
                trigger={
                  <Button size="sm" className="gap-1.5 mt-1" id="create-project-empty-btn">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                }
                onSubmit={(payload) => createProject(payload as Parameters<typeof createProject>[0])}
                onSuccess={handleProjectCreated}
              />
            )}
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <>
            {/* Project Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">
                  Showing {(meta.page - 1) * meta.limit + 1}–
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} project
                  {meta.total !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    id="projects-prev-page"
                    size="sm"
                    variant="outline"
                    onClick={handlePrev}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-slate-600 font-medium min-w-[4rem] text-center">
                    Page {meta.page} / {meta.totalPages}
                  </span>
                  <Button
                    id="projects-next-page"
                    size="sm"
                    variant="outline"
                    onClick={handleNext}
                    disabled={page >= meta.totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
