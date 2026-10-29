'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/common/RoleBadge';
import { UserSelector } from '@/components/common/UserSelector';
import { TaskPriorityBadge } from './task-badges';
import { TaskForm } from './task-form';
import { TaskDependencies } from './task-dependencies';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getTask,
  updateTask,
  deleteTask,
  type Task,
  type TaskStatus,
  TASK_STATUSES,
} from '@/lib/api/tasks';
import { getProject, type Project, listProjectMembers, type ProjectMember } from '@/lib/api/projects';
import { getTeam, type Team } from '@/lib/api/teams';
import { userDirectory } from '@/lib/auth/user-directory';
import {
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
  User,
  FolderKanban,
  Users,
  GitMerge,
  AlertTriangle,
  Zap,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDueDateStatus(dueDateStr: string | null | undefined): { label: string; className: string } | null {
  if (!dueDateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return { label: 'OVERDUE', className: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border-rose-200 dark:border-rose-900' };
  }
  if (diffDays === 0) {
    return { label: 'DUE TODAY', className: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border-amber-200 dark:border-amber-900' };
  }
  if (diffDays <= 3) {
    return { label: 'DUE SOON', className: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900' };
  }
  return { label: 'UPCOMING', className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

const SELECT_CLASS =
  'flex h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

function ConfirmDeleteDialog({
  onConfirm,
  onCancel,
  submitting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/60 dark:border-rose-900/60 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete Task?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              This action cannot be undone. Task data and dependencies will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Delete Task
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

interface TaskDetailProps {
  taskId: string;
  trigger: React.ReactNode;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetail({
  taskId,
  trigger,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [task, setTask] = React.useState<Task | null>(null);
  const [project, setProject] = React.useState<Project | null>(null);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [projectMembers, setProjectMembers] = React.useState<ProjectMember[]>([]);

  // RBAC checks
  const isGlobalAdmin = user?.role === 'ADMIN';
  const isProjectOwner = Boolean(user && project && project.ownerId === user.id);
  const isAssignedPM = projectMembers.some(
    (m) => m.userId === user?.id && m.role === 'PROJECT_MANAGER',
  );
  const canManageTask = isGlobalAdmin || isProjectOwner || isAssignedPM;
  const isAssignedMember = Boolean(user && task && task.assigneeId === user.id);
  const canUpdateStatus = (canManageTask || isAssignedMember) && user?.role !== 'VIEWER';

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [reassigning, setReassigning] = React.useState(false);
  const [showReassignDropdown, setShowReassignDropdown] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchTaskAndContext() {
      setLoading(true);
      setError(null);
      setTask(null);
      try {
        const t = await getTask(taskId);
        if (!cancelled) {
          setTask(t);

          // Fetch associated project and team
          if (t.projectId) {
            const [pRes, mRes] = await Promise.allSettled([
              getProject(t.projectId),
              listProjectMembers(t.projectId),
            ]);
            if (!cancelled && pRes.status === 'fulfilled') setProject(pRes.value);
            if (!cancelled && mRes.status === 'fulfilled') setProjectMembers(mRes.value);
          }
          if (t.teamId) {
            getTeam(t.teamId)
              .then((tm) => {
                if (!cancelled) setTeam(tm);
              })
              .catch(() => {
                // Ignore
              });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load task.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTaskAndContext();
    return () => {
      cancelled = true;
    };
  }, [taskId, open]);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!task) return;
    const newStatus = e.target.value as TaskStatus;
    setStatusUpdating(true);
    try {
      const updated = await updateTask(task.id, { status: newStatus });
      setTask(updated);
      onTaskUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status.');
    } finally {
      setStatusUpdating(false);
    }
  }

  const _directoryVersion = React.useSyncExternalStore(
    (cb) => userDirectory.subscribe(cb),
    () => userDirectory.getVersion(),
    () => 0,
  );

  async function handleReassign(newAssigneeId: string) {
    if (!task) return;
    setReassigning(true);
    try {
      const updated = await updateTask(task.id, { assigneeId: newAssigneeId || undefined });
      setTask(updated);
      setShowReassignDropdown(false);
      void userDirectory.fetchDirectory();
      onTaskUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign task.');
    } finally {
      setReassigning(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onTaskDeleted?.(task.id);
      setOpen(false);
      setConfirmDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTask(updated);
    onTaskUpdated?.(updated);
  }

  const dueDateBadge = getDueDateStatus(task?.dueDate);
  const assigneeProfile = task?.assigneeId ? userDirectory.getUser(task.assigneeId) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full max-w-lg overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 flex flex-col">
          {loading && (
            <div className="flex items-center justify-center py-24 flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && error && (
            <div className="p-6">
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 px-4 py-4 text-center space-y-2">
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-400">Action Notice</p>
                <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>
              </div>
            </div>
          )}

          {!loading && task && (
            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
                      TASK-{task.id.slice(0, 8)}
                    </p>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {task.title}
                    </h2>
                  </div>

                  {/* Actions (RBAC protected) */}
                  {canManageTask && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TaskForm
                        mode="edit"
                        task={task}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            id={`edit-task-${task.id}`}
                            aria-label="Edit task"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        }
                        onSubmit={(payload) => updateTask(task.id, payload)}
                        onSuccess={handleTaskUpdated}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900"
                        onClick={() => setConfirmDelete(true)}
                        id={`delete-task-${task.id}`}
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status & Priority Row */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={handleStatusChange}
                      disabled={statusUpdating || !canUpdateStatus}
                      aria-label="Task status"
                      className={cn(SELECT_CLASS, 'w-auto')}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {statusUpdating && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                    <TaskPriorityBadge priority={task.priority} />
                  </div>

                  {dueDateBadge && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', dueDateBadge.className)}>
                      {dueDateBadge.label}
                    </span>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Ownership & Assignee Card */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Ownership
                  </span>
                  {canManageTask && !showReassignDropdown && (
                    <button
                      type="button"
                      onClick={() => setShowReassignDropdown(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Reassign
                    </button>
                  )}
                </div>

                {showReassignDropdown ? (
                  <div className="space-y-2 pt-1">
                    <UserSelector
                      value={task.assigneeId || ''}
                      onChange={handleReassign}
                      placeholder="Select new assignee..."
                      disabled={reassigning}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowReassignDropdown(false)}
                        className="h-6 text-[11px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : assigneeProfile ? (
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      fallback={userDirectory.getInitials(assigneeProfile.name || assigneeProfile.email)}
                      size="sm"
                      className="h-7 w-7 text-[10px] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {assigneeProfile.name}
                      </p>
                      {assigneeProfile.email && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {assigneeProfile.email}
                        </p>
                      )}
                    </div>
                    {assigneeProfile.role && (
                      <RoleBadge role={assigneeProfile.role} size="sm" showIcon={false} />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 italic text-xs py-1">
                    <User className="h-4 w-4" />
                    <span>Unassigned work item</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Description
                </p>
                {task.description ? (
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No description provided.</p>
                )}
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Context Links & Fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField icon={FolderKanban} label="Project Workspace">
                  {task.projectId ? (
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
                    >
                      {project?.name || `Project #${task.projectId.slice(0, 6)}`}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-slate-400">Standalone task</span>
                  )}
                </DetailField>

                <DetailField icon={Zap} label="Sprint Iteration">
                  {task.sprintId ? (
                    <Link
                      href={`/sprints?projectId=${task.projectId}`}
                      className="text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400 inline-flex items-center gap-1"
                    >
                      Sprint Details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-slate-400">No sprint assigned</span>
                  )}
                </DetailField>

                <DetailField icon={Users} label="Team">
                  {team ? (
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {team.name}
                    </span>
                  ) : task.teamId ? (
                    <span className="font-mono text-xs text-slate-500">
                      Team #{task.teamId.slice(0, 6)}
                    </span>
                  ) : (
                    <span className="text-slate-400">No team assigned</span>
                  )}
                </DetailField>

                <DetailField icon={CalendarDays} label="Due Date">
                  <span>{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
                </DetailField>

                <DetailField icon={Clock} label="Start Date">
                  <span>{task.startDate ? formatDate(task.startDate) : 'Unscheduled'}</span>
                </DetailField>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Task Dependencies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Task Dependencies & Blockers
                  </p>
                </div>
                <TaskDependencies taskId={task.id} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation modal */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          submitting={deleting}
        />
      )}
    </>
  );
}
