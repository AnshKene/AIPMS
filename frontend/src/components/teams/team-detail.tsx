'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  type Team,
  type UpdateTeamPayload,
  getTeam,
  updateTeam,
  deleteTeam,
  formatTeamError,
} from '@/lib/api/teams';
import { getProject, type Project } from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { TeamForm } from './team-form';
import { TeamMembers } from './team-members';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  Pencil,
  Trash2,
  Clock,
  CheckSquare,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatProjectName } from '@/lib/utils';

import { useAuth } from '@/lib/auth/auth-context';

interface TeamDetailProps {
  teamId: string;
  initialTeam?: Team;
  onTeamUpdated?: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
  onBack?: () => void;
  isStandalonePage?: boolean;
}

export function TeamDetail({
  teamId,
  initialTeam,
  onTeamUpdated,
  onTeamDeleted,
  onBack,
  isStandalonePage = false,
}: TeamDetailProps) {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [team, setTeam] = React.useState<Team | null>(initialTeam || null);
  const [project, setProject] = React.useState<Project | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(!initialTeam);
  const [error, setError] = React.useState<string | null>(null);

  // Delete modal state
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // AI Assistant accordion extension
  const [showAiAssistant, setShowAiAssistant] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    getTeam(teamId)
      .then((teamData) => {
        if (!cancelled) {
          setTeam(teamData);
          setError(null);

          // Load associated project
          if (teamData.projectId) {
            getProject(teamData.projectId)
              .then((p) => {
                if (!cancelled) setProject(p);
              })
              .catch(() => {
                if (!cancelled) setProject(null);
              });
          }

          // Load tasks assigned to this team
          listTasks({ teamId: teamData.id, limit: 100 })
            .then((t) => {
              if (!cancelled) setTasks(t.data || []);
            })
            .catch(() => {
              if (!cancelled) setTasks([]);
            });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatTeamError(err, 'Failed to load team details.'));
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
  }, [teamId]);

  function reloadData() {
    setLoading(true);
    setError(null);
    getTeam(teamId)
      .then((teamData) => {
        setTeam(teamData);
        if (teamData.projectId) {
          getProject(teamData.projectId)
            .then((p) => setProject(p))
            .catch(() => setProject(null));
        }
        listTasks({ teamId: teamData.id, limit: 100 })
          .then((t) => setTasks(t.data || []))
          .catch(() => setTasks([]));
      })
      .catch((err) => setError(formatTeamError(err, 'Failed to load team details.')))
      .finally(() => setLoading(false));
  }

  async function handleUpdateTeam(payload: UpdateTeamPayload): Promise<Team> {
    const updated = await updateTeam(teamId, payload);
    setTeam(updated);
    onTeamUpdated?.(updated);
    return updated;
  }

  async function handleDeleteTeam() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeam(teamId);
      setConfirmDelete(false);
      onTeamDeleted?.(teamId);
    } catch (err) {
      setDeleteError(formatTeamError(err, 'Failed to delete team.'));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 py-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/80 rounded" />
          </div>
        </div>
        <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-6 text-center space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 mx-auto">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
          {error || 'Team not found'}
        </h3>
        <p className="text-xs text-red-600 dark:text-red-300 max-w-sm mx-auto">
          The requested team details could not be retrieved from the Team Service.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Go Back
            </Button>
          )}
          <Button size="sm" onClick={reloadData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== 'DONE');
  const completedTasks = tasks.filter((t) => t.status === 'DONE');

  return (
    <div className="space-y-6">
      {/* Top Navigation / Breadcrumbs */}
      {(onBack || isStandalonePage) && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 -ml-2 h-8 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Teams
          </Button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-base">
              {team.name ? team.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {team.name}
                </h1>
                <Badge variant="info" className="text-[10px] px-2 py-0.5">
                  Team
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                <span>Project:</span>
                {project ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {formatProjectName(project.name)}
                  </Link>
                ) : (
                  <span className="font-mono text-slate-600 dark:text-slate-400">{team.projectId}</span>
                )}
              </div>
            </div>
          </div>

          {team.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl pt-1 leading-relaxed">
              {team.description}
            </p>
          )}
        </div>

        {/* Header Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <TeamForm
              mode="edit"
              team={team}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Team
                </Button>
              }
              onSubmit={(payload) => handleUpdateTeam(payload as UpdateTeamPayload)}
              onSuccess={(updated) => {
                setTeam(updated);
                onTeamUpdated?.(updated);
              }}
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="gap-1.5 h-8 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Factual Team Context & Health Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Project Association
            </span>
            <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {project?.name ? formatProjectName(project.name) : 'Assigned Project'}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {project?.status ? `Status: ${project.status}` : 'Linked in API Gateway'}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Active Workload
            </span>
            <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {activeTasks.length} active {activeTasks.length === 1 ? 'task' : 'tasks'}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {completedTasks.length} tasks completed
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Team Metadata
            </span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
            ID: {team.id.slice(0, 13)}...
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Created {new Date(team.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* AI Assistant Context Banner */}
      <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 p-4 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                AI Team Intelligence Context
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Factual workload insights and member task allocations.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAiAssistant((prev) => !prev)}
            className="h-7 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 gap-1 cursor-pointer"
          >
            <span>{showAiAssistant ? 'Hide Details' : 'View Insights'}</span>
            {showAiAssistant ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {showAiAssistant && (
          <div className="mt-3 pt-3 border-t border-blue-100/80 dark:border-blue-900/50 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p className="text-[11px] leading-relaxed">
              Based on active project assignments, this team currently manages {activeTasks.length} open work items across {project?.name || 'its associated project'}.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                `Active tasks: ${activeTasks.length}`,
                `Completed tasks: ${completedTasks.length}`,
                `Project: ${project?.name || 'Linked Project'}`,
              ].map((insight, i) => (
                <span
                  key={i}
                  className="rounded-md border border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-slate-800 px-2 py-1 text-[10px] text-blue-800 dark:text-blue-300 font-medium"
                >
                  {insight}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Members Section */}
      <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-5">
          <TeamMembers teamId={team.id} canManage={canManage} />
        </CardContent>
      </Card>

      {/* Accessible Delete Confirmation Dialog */}
      {canManage && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete "${team.name}"?`}
          description="This will permanently delete this team and remove all member associations. Existing tasks and project records will remain intact. This action cannot be undone."
          confirmLabel="Delete Team"
          variant="destructive"
          loading={deleting}
          error={deleteError}
          onConfirm={handleDeleteTeam}
        />
      )}
    </div>
  );
}
