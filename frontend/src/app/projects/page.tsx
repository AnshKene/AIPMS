'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectsSkeleton } from '@/components/projects/ProjectsSkeleton';
import {
  FolderKanban,
  Plus,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState, FilterEmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import {
  listProjects,
  createProject,
  type Project,
  type ProjectListMeta,
  type ProjectStatus,
  PROJECT_STATUSES,
} from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { listRisks, type Risk } from '@/lib/api/risks';

const STATUS_LABELS: Record<string, string> = {
  '': 'All Statuses',
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const PAGE_LIMIT = 12;

type SortOption = 'updated_desc' | 'name_asc' | 'name_desc' | 'status_asc';

export default function ProjectsPage() {
  const { user } = useAuth();

  const [rawProjects, setRawProjects] = React.useState<Project[]>([]);
  const [meta, setMeta] = React.useState<ProjectListMeta>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 1,
  });
  const [tasksMap, setTasksMap] = React.useState<Record<string, Task[]>>({});
  const [risksMap, setRisksMap] = React.useState<Record<string, Risk[]>>({});

  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | ''>('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortOption>('updated_desc');
  const [page, setPage] = React.useState(1);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // RBAC check: only ADMIN and PROJECT_MANAGER can create projects
  const canCreateProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  React.useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [projRes, tasksRes, risksRes] = await Promise.allSettled([
          listProjects({
            page,
            limit: PAGE_LIMIT,
            status: statusFilter || undefined,
          }),
          listTasks({ limit: 200 }),
          listRisks({ limit: 100 }),
        ]);

        if (isCancelled) return;

        if (projRes.status === 'fulfilled') {
          setRawProjects(projRes.value.data);
          setMeta(projRes.value.meta);
        } else {
          throw projRes.reason;
        }

        // Map tasks by projectId
        if (tasksRes.status === 'fulfilled') {
          const tMap: Record<string, Task[]> = {};
          tasksRes.value.data.forEach((task) => {
            if (task.projectId) {
              if (!tMap[task.projectId]) tMap[task.projectId] = [];
              tMap[task.projectId].push(task);
            }
          });
          setTasksMap(tMap);
        }

        // Map risks by projectId
        if (risksRes.status === 'fulfilled') {
          const rMap: Record<string, Risk[]> = {};
          risksRes.value.map((risk) => {
            if (risk.projectId) {
              if (!rMap[risk.projectId]) rMap[risk.projectId] = [];
              rMap[risk.projectId].push(risk);
            }
          });
          setRisksMap(rMap);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project workspace data.');
          setRawProjects([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [page, statusFilter, refreshKey]);

  // Client-side search and sort
  const filteredAndSortedProjects = React.useMemo(() => {
    let result = [...rawProjects];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.ownerId.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'status_asc') {
        return a.status.localeCompare(b.status);
      }
      // Default: updated_desc
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [rawProjects, searchQuery, sortBy]);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value as ProjectStatus | '');
    setPage(1);
  }

  function handlePrev() {
    if (page > 1) setPage((p) => p - 1);
  }

  function handleNext() {
    if (page < meta.totalPages) setPage((p) => p + 1);
  }

  function handleProjectCreated() {
    setPage(1);
    setRefreshKey((k) => k + 1);
  }

  function handleRetry() {
    setRefreshKey((k) => k + 1);
  }

  function handleClearFilters() {
    setStatusFilter('');
    setSearchQuery('');
    setPage(1);
  }

  const hasActiveFilters = Boolean(statusFilter || searchQuery.trim());

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Projects Workspace
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage projects, track delivery health, and focus on what needs attention.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canCreateProject && (
              <ProjectForm
                mode="create"
                ownerId={user?.id ?? ''}
                isAdmin={user?.role === 'ADMIN'}
                trigger={
                  <Button size="sm" className="gap-1.5 shadow-xs font-medium" id="create-project-btn">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                }
                onSubmit={(payload) => createProject(payload as Parameters<typeof createProject>[0])}
                onSuccess={handleProjectCreated}
              />
            )}
          </div>
        </div>

        {/* Search & Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                id="projects-search-input"
                type="text"
                placeholder="Search projects by name, description, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-sm h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                aria-label="Search projects"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              id="projects-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
              aria-label="Filter by status"
            >
              {['', ...PROJECT_STATUSES].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              id="projects-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Sort projects"
            >
              <option value="updated_desc">Recently updated</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="status_asc">Status</option>
            </select>
          </div>
        </div>

        {/* Content States */}
        {loading ? (
          <ProjectsSkeleton />
        ) : error ? (
          <ErrorState
            title="Unable to load projects workspace"
            error={error}
            onRetry={handleRetry}
            variant="card"
          />
        ) : filteredAndSortedProjects.length === 0 ? (
          hasActiveFilters ? (
            <FilterEmptyState
              onClearFilters={handleClearFilters}
              description="No projects match your search or status filter. Try clearing your filters."
            />
          ) : (
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title="No projects yet"
              description="Create your first project to start organizing teams, tasks, sprints, and delivery."
              action={
                canCreateProject ? (
                  <ProjectForm
                    mode="create"
                    ownerId={user?.id ?? ''}
                    trigger={
                      <Button size="sm" className="gap-1.5" id="create-project-empty-btn">
                        <Plus className="h-4 w-4" />
                        Create Project
                      </Button>
                    }
                    onSubmit={(payload) => createProject(payload as Parameters<typeof createProject>[0])}
                    onSuccess={handleProjectCreated}
                  />
                ) : undefined
              }
            />
          )
        ) : (
          <>
            {/* Project Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  taskSummary={tasksMap[project.id]}
                  riskCount={risksMap[project.id]?.filter((r) => r.status !== 'CLOSED' && r.status !== 'RESOLVED').length}
                  currentUserId={user?.id}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
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
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium min-w-[4rem] text-center">
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

