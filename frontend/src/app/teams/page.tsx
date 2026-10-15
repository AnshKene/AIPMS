'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/dialog';
import { TeamCard } from '@/components/teams/team-card';
import { TeamForm } from '@/components/teams/team-form';
import { TeamDetail } from '@/components/teams/team-detail';
import { TeamsSkeleton } from '@/components/teams/TeamsSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState, FilterEmptyState } from '@/components/ui/empty-state';
import {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type Team,
  type TeamListMeta,
  type CreateTeamPayload,
  type UpdateTeamPayload,
  formatTeamError,
} from '@/lib/api/teams';
import { listProjects, type Project } from '@/lib/api/projects';
import {
  Users,
  Plus,
  Search,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const PAGE_LIMIT = 12;

function TeamsPageContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [teams, setTeams] = React.useState<Team[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectMap, setProjectMap] = React.useState<Record<string, string>>({});
  const [meta, setMeta] = React.useState<TeamListMeta>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(
    () => initialProjectId,
  );
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active Team Detail Drawer
  const [activeTeam, setActiveTeam] = React.useState<Team | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Edit Team State
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);

  // Delete Confirmation Dialog State
  const [deletingTeam, setDeletingTeam] = React.useState<Team | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Load Projects for mapping & filter
  React.useEffect(() => {
    let cancelled = false;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!cancelled) {
          const projs = res.data || [];
          setProjects(projs);
          const map: Record<string, string> = {};
          projs.forEach((p) => {
            map[p.id] = p.name;
          });
          setProjectMap(map);
        }
      })
      .catch(() => {
        // Silently handle project load failure
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load Teams asynchronously inside effect
  React.useEffect(() => {
    let cancelled = false;

    listTeams({
      page,
      limit: PAGE_LIMIT,
      projectId: selectedProjectId || undefined,
    })
      .then((response) => {
        if (!cancelled) {
          setTeams(response.data || []);
          setMeta(response.meta || { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatTeamError(err, 'Failed to fetch teams.'));
          setTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, selectedProjectId]);

  // Client-side search filtering
  const filteredTeams = React.useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase().trim();
    return teams.filter((team) => {
      const nameMatch = team.name.toLowerCase().includes(query);
      const descMatch = team.description?.toLowerCase().includes(query) ?? false;
      const projName = projectMap[team.projectId]?.toLowerCase() ?? '';
      const projMatch = projName.includes(query);
      return nameMatch || descMatch || projMatch;
    });
  }, [teams, searchQuery, projectMap]);

  function handleProjectFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedProjectId(e.target.value);
    setPage(1);
    setLoading(true);
  }

  function handleTeamCreated(newTeam: Team) {
    setTeams((prev) => [newTeam, ...prev]);
    setMeta((prev) => ({ ...prev, total: prev.total + 1 }));
    setActiveTeam(newTeam);
    setDetailOpen(true);
  }

  function handleTeamUpdated(updated: Team) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (activeTeam?.id === updated.id) {
      setActiveTeam(updated);
    }
  }

  function handleTeamDeleted(teamId: string) {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    if (activeTeam?.id === teamId) {
      setDetailOpen(false);
      setActiveTeam(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTeam) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteTeam(deletingTeam.id);
      handleTeamDeleted(deletingTeam.id);
      setDeletingTeam(null);
    } catch (err) {
      setDeleteError(formatTeamError(err, 'Failed to delete team.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const selectedProjectName = selectedProjectId ? projectMap[selectedProjectId] : null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Teams
              </h1>
              {selectedProjectName && (
                <Badge variant="info" className="text-xs">
                  Project: {selectedProjectName}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Organize people around projects, responsibilities, and delivery.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              <TeamForm
                mode="create"
                defaultProjectId={selectedProjectId}
                trigger={
                  <Button size="sm" className="gap-1.5 shadow-xs cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Create Team
                  </Button>
                }
                onSubmit={(payload) => createTeam(payload as CreateTeamPayload)}
                onSuccess={handleTeamCreated}
              />
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search teams by name, description, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-slate-900"
                aria-label="Search teams"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedProjectId}
                onChange={handleProjectFilterChange}
                aria-label="Filter by project"
                className="h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-center">
            {searchQuery
              ? `${filteredTeams.length} of ${teams.length} teams match`
              : `${meta.total} ${meta.total === 1 ? 'team' : 'teams'} total`}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <ErrorState
            title="Unable to load teams workspace"
            error={error}
            onRetry={() => {
              setLoading(true);
              listTeams({ page, limit: PAGE_LIMIT, projectId: selectedProjectId || undefined })
                .then((res) => {
                  setTeams(res.data || []);
                  setError(null);
                })
                .catch((e) => setError(formatTeamError(e)))
                .finally(() => setLoading(false));
            }}
            variant="card"
          />
        )}

        {/* Main Content Area */}
        {loading ? (
          <TeamsSkeleton />
        ) : filteredTeams.length === 0 ? (
          searchQuery || selectedProjectId ? (
            <FilterEmptyState
              onClearFilters={() => {
                setSearchQuery('');
                setSelectedProjectId('');
              }}
              description="No teams match your search query or selected project filter."
            />
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No teams yet"
              description="Create a team to organize project members, roles, and responsibilities."
              action={
                canManage ? (
                  <TeamForm
                    mode="create"
                    defaultProjectId={selectedProjectId}
                    trigger={
                      <Button size="sm" className="gap-1.5 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        Create First Team
                      </Button>
                    }
                    onSubmit={(payload) => createTeam(payload as CreateTeamPayload)}
                    onSuccess={handleTeamCreated}
                  />
                ) : undefined
              }
            />
          )
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  projectName={projectMap[team.projectId]}
                  canManage={canManage}
                  onSelect={(t) => {
                    setActiveTeam(t);
                    setDetailOpen(true);
                  }}
                  onEdit={(t) => setEditingTeam(t)}
                  onDelete={(t) => {
                    setDeleteError(null);
                    setDeletingTeam(t);
                  }}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && !searchQuery && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing page {meta.page} of {meta.totalPages} ({meta.total} total teams)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      setLoading(true);
                    }}
                    disabled={meta.page <= 1 || loading}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage((p) => Math.min(meta.totalPages, p + 1));
                      setLoading(true);
                    }}
                    disabled={meta.page >= meta.totalPages || loading}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide-out Team Detail Drawer */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-full max-w-2xl overflow-y-auto sm:max-w-xl">
            {activeTeam && (
              <TeamDetail
                teamId={activeTeam.id}
                initialTeam={activeTeam}
                onTeamUpdated={handleTeamUpdated}
                onTeamDeleted={(id) => {
                  handleTeamDeleted(id);
                  setDetailOpen(false);
                }}
                onBack={() => setDetailOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Edit Modal / Sheet for Card Trigger (Clean Controlled Mode) */}
        {canManage && (
          <TeamForm
            mode="edit"
            team={editingTeam}
            open={editingTeam !== null}
            onOpenChange={(isOpen) => {
              if (!isOpen) setEditingTeam(null);
            }}
            onSubmit={(payload) =>
              updateTeam(editingTeam!.id, payload as UpdateTeamPayload)
            }
            onSuccess={(updated) => {
              handleTeamUpdated(updated);
              setEditingTeam(null);
            }}
          />
        )}

        {/* Accessible Delete Confirmation Dialog */}
        {canManage && (
          <ConfirmDialog
            open={deletingTeam !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingTeam(null);
            }}
            title={`Delete "${deletingTeam?.name || 'Team'}"?`}
            description="This will permanently delete this team and remove all member associations. Existing tasks and project records will remain intact. This action cannot be undone."
            confirmLabel="Delete Team"
            variant="destructive"
            loading={deleteLoading}
            error={deleteError}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function TeamsPage() {
  return (
    <React.Suspense fallback={<AppShell><TeamsSkeleton /></AppShell>}>
      <TeamsPageContent />
    </React.Suspense>
  );
}
