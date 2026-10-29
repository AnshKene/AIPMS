'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserSelector, type UserSelectorOption } from '@/components/common/UserSelector';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from '@/lib/api/tasks';
import { listProjects, listProjectMembers, type Project, type ProjectMember } from '@/lib/api/projects';
import { listSprints, type Sprint } from '@/lib/api/sprints';
import { listTeams, listTeamMembers, type Team, type TeamMember } from '@/lib/api/teams';
import { userDirectory } from '@/lib/auth/user-directory';
import {
  Loader2,
  CalendarDays,
  Users,
  AlertTriangle,
  FileText,
} from 'lucide-react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toISOString(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(d).toISOString();
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

const TEXTAREA_CLASS =
  'flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 resize-none';

type BaseTaskFormProps = {
  defaultProjectId?: string;
  defaultSprintId?: string;
  trigger: React.ReactNode;
  onSuccess: (task: Task) => void;
};

type CreateTaskFormProps = BaseTaskFormProps & {
  mode: 'create';
  task?: undefined;
  onSubmit: (payload: CreateTaskPayload) => Promise<Task>;
};

type EditTaskFormProps = BaseTaskFormProps & {
  mode: 'edit';
  task: Task;
  onSubmit: (payload: UpdateTaskPayload) => Promise<Task>;
};

export type TaskFormProps = CreateTaskFormProps | EditTaskFormProps;

interface FormState {
  title: string;
  projectId: string;
  sprintId: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  teamId: string;
  startDate: string;
  dueDate: string;
}

export function TaskForm(props: TaskFormProps) {
  const { mode, defaultProjectId, defaultSprintId, task, trigger, onSuccess } = props;
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // External lookup datasets
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [sprints, setSprints] = React.useState<Sprint[]>([]);
  const [projectMembers, setProjectMembers] = React.useState<ProjectMember[]>([]);

  const initialState = React.useCallback(
    (): FormState => ({
      title: task?.title ?? '',
      projectId: task?.projectId ?? defaultProjectId ?? '',
      sprintId: task?.sprintId ?? defaultSprintId ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assigneeId ?? '',
      teamId: task?.teamId ?? '',
      startDate: toDateInput(task?.startDate),
      dueDate: toDateInput(task?.dueDate),
    }),
    [task, defaultProjectId, defaultSprintId],
  );

  const [form, setForm] = React.useState<FormState>(initialState);

  // Load global projects list when sheet opens
  React.useEffect(() => {
    if (!open) return;
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const [projRes, sprintRes, teamRes] = await Promise.allSettled([
          listProjects({ limit: 100 }),
          listSprints({ limit: 100 }),
          listTeams({ limit: 100 }),
        ]);

        if (isCancelled) return;
        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value.data || []);
        }
        if (sprintRes.status === 'fulfilled') {
          setSprints(sprintRes.value || []);
        }
        if (teamRes.status === 'fulfilled') {
          setTeams(teamRes.value.data || []);
        }
      } catch {
        // fail silently for optional dropdowns
      }
    }

    loadInitialData();
    return () => {
      isCancelled = true;
    };
  }, [open]);

  // When form.projectId changes, load members and scoped teams/sprints for that project
  React.useEffect(() => {
    let isCancelled = false;

    async function loadProjectContext() {
      if (!open || !form.projectId) {
        if (!isCancelled) {
          setProjectMembers([]);
          setTeamMembers([]);
        }
        return;
      }
      try {
        const [membersRes, teamsRes, sprintsRes] = await Promise.allSettled([
          listProjectMembers(form.projectId),
          listTeams({ projectId: form.projectId, limit: 100 }),
          listSprints({ projectId: form.projectId, limit: 100 }),
        ]);

        if (isCancelled) return;
        if (membersRes.status === 'fulfilled') {
          setProjectMembers(membersRes.value || []);
        }
        if (teamsRes.status === 'fulfilled') {
          const loadedTeams = teamsRes.value.data || [];
          setTeams(loadedTeams);

          // Authoritatively load members across these project teams
          if (loadedTeams.length > 0) {
            const memberPromises = loadedTeams.map((t) =>
              listTeamMembers(t.id, { limit: 100 }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 1 } })),
            );
            const tmSettled = await Promise.allSettled(memberPromises);
            if (!isCancelled) {
              const allMembers: TeamMember[] = [];
              for (const r of tmSettled) {
                if (r.status === 'fulfilled' && r.value?.data) {
                  allMembers.push(...r.value.data);
                }
              }
              setTeamMembers(allMembers);
            }
          } else {
            setTeamMembers([]);
          }
        }
        if (sprintsRes.status === 'fulfilled') {
          setSprints(sprintsRes.value || []);
        }
      } catch {
        // Ignore errors
      }
    }

    loadProjectContext();
    return () => {
      isCancelled = true;
    };
  }, [open, form.projectId]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        setForm(initialState());
        setError(null);
      }
      setOpen(next);
    },
    [initialState],
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Build eligible assignees list
  const directoryVersion = React.useSyncExternalStore(
    (cb) => userDirectory.subscribe(cb),
    () => userDirectory.getVersion(),
    () => 0,
  );

  const eligibleAssigneeOptions: UserSelectorOption[] = React.useMemo(() => {
    const optionsMap = new Map<string, UserSelectorOption>();

    // 1. If project has an owner, add owner if active
    const selectedProj = projects.find((p) => p.id === form.projectId);
    if (selectedProj?.ownerId) {
      const ownerProfile = userDirectory.getUser(selectedProj.ownerId);
      if (ownerProfile.status !== 'INACTIVE') {
        optionsMap.set(selectedProj.ownerId, {
          ...ownerProfile,
          role: 'PROJECT_OWNER',
          badge: 'Project Owner',
        });
      }
    }

    // 2. Add all assigned active project members
    projectMembers.forEach((m) => {
      const profile = userDirectory.getUser(m.userId);
      if (profile.status !== 'INACTIVE') {
        optionsMap.set(m.userId, {
          ...profile,
          role: m.role,
          badge: m.role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Member',
        });
      }
    });

    // 3. Add members of project teams (or selected team)
    const relevantTeamMembers = form.teamId
      ? teamMembers.filter((tm) => tm.teamId === form.teamId)
      : teamMembers;

    relevantTeamMembers.forEach((tm) => {
      const profile = userDirectory.getUser(tm.userId);
      if (profile.status !== 'INACTIVE' && !optionsMap.has(tm.userId)) {
        optionsMap.set(tm.userId, {
          ...profile,
          role: tm.role === 'TEAM_LEAD' ? 'TEAM_LEAD' : profile.role,
          badge: tm.role === 'TEAM_LEAD' ? 'Team Lead' : 'Team Member',
        });
      }
    });

    // 4. If no explicit project members or team members (only project owner or none), also include active directory users
    if (optionsMap.size <= 1) {
      userDirectory.getActiveKnownUsers().forEach((u) => {
        if (!optionsMap.has(u.id)) {
          optionsMap.set(u.id, u);
        }
      });
    }

    return Array.from(optionsMap.values());
  }, [projects, form.projectId, form.teamId, projectMembers, teamMembers, directoryVersion]);

  // Filtered teams for the current project
  const projectTeams = React.useMemo(() => {
    if (!form.projectId) return teams;
    return teams.filter((t) => !t.projectId || t.projectId === form.projectId);
  }, [teams, form.projectId]);

  // Filtered sprints for the current project
  const projectSprints = React.useMemo(() => {
    if (!form.projectId) return sprints;
    return sprints.filter((s) => !s.projectId || s.projectId === form.projectId);
  }, [sprints, form.projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (form.title.trim().length > 255) {
      setError('Task title must not exceed 255 characters.');
      return;
    }
    if (mode === 'create' && !form.projectId.trim()) {
      setError('Please select an associated project.');
      return;
    }
    if (form.startDate && form.dueDate && new Date(form.dueDate) < new Date(form.startDate)) {
      setError('Due date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      let result: Task;
      if (props.mode === 'create') {
        const createPayload: CreateTaskPayload = {
          projectId: form.projectId.trim(),
          sprintId: form.sprintId.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId.trim() || undefined,
          teamId: form.teamId.trim() || undefined,
          startDate: toISOString(form.startDate),
          dueDate: toISOString(form.dueDate),
        };
        result = await props.onSubmit(createPayload);
      } else {
        const updatePayload: UpdateTaskPayload = {
          sprintId: form.sprintId.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId.trim() || undefined,
          teamId: form.teamId.trim() || undefined,
          startDate: toISOString(form.startDate),
          dueDate: toISOString(form.dueDate),
        };
        result = await props.onSubmit(updatePayload);
      }
      onSuccess(result);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full max-w-lg overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 flex flex-col">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mode === 'create' ? 'Create & Assign Task' : 'Edit Task Details'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'create'
                ? 'Plan work items, assign ownership, and schedule sprint delivery.'
                : 'Update task properties, schedule timelines, and team assignment.'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto text-xs" noValidate>
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Task Details */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Task Details
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="task-title" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <Input
                id="task-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Implement user role authorization middleware"
                maxLength={255}
                disabled={submitting}
                autoFocus
                required
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="task-description" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Description
              </label>
              <textarea
                id="task-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Detailed acceptance criteria, deliverables, and implementation notes..."
                disabled={submitting}
                rows={3}
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          {/* Section 2: Ownership & Assignment */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Ownership & Workspace
              </span>
            </div>

            {/* Project Selection */}
            <div className="space-y-1.5">
              <label htmlFor="task-project" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Project Workspace <span className="text-rose-500">*</span>
              </label>
              {projects.length > 0 ? (
                <select
                  id="task-project"
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  disabled={submitting || mode === 'edit'}
                  className={SELECT_CLASS}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status ? `(${p.status})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="task-project-manual"
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  placeholder="Project UUID"
                  disabled={submitting || mode === 'edit'}
                  className="font-mono text-xs h-9"
                />
              )}
            </div>

            {/* Assignee Searchable Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Assignee
              </label>
              <UserSelector
                id="task-assignee-selector"
                value={form.assigneeId}
                onChange={(uid) => setForm((prev) => ({ ...prev, assigneeId: uid }))}
                options={eligibleAssigneeOptions}
                placeholder="Search eligible project members..."
                disabled={submitting}
              />
              <p className="text-[10px] text-slate-400">
                Assignees must be members of the selected project or team per backend rules.
              </p>
            </div>

            {/* Team Selection */}
            <div className="space-y-1.5">
              <label htmlFor="task-team-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Assigned Team (Optional)
              </label>
              <select
                id="task-team-select"
                name="teamId"
                value={form.teamId}
                onChange={handleChange}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                <option value="">No specific team</option>
                {projectTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Planning & Schedule */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                3. Planning & Schedule
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <div className="space-y-1.5">
                <label htmlFor="task-priority" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Priority
                </label>
                <select
                  id="task-priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  disabled={submitting}
                  className={SELECT_CLASS}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label htmlFor="task-status" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <select
                  id="task-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={submitting}
                  className={SELECT_CLASS}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sprint */}
            <div className="space-y-1.5">
              <label htmlFor="task-sprint" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sprint Iteration
              </label>
              <select
                id="task-sprint"
                name="sprintId"
                value={form.sprintId}
                onChange={handleChange}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                <option value="">Backlog (No Sprint)</option>
                {projectSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="task-start-date" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Start Date
                </label>
                <Input
                  id="task-start-date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  disabled={submitting}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-due-date" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Due Date
                </label>
                <Input
                  id="task-due-date"
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange}
                  disabled={submitting}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              id="task-form-submit-btn"
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
