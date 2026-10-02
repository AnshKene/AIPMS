'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type Team,
  type CreateTeamPayload,
  type UpdateTeamPayload,
  formatTeamError,
} from '@/lib/api/teams';
import { listProjects, type Project } from '@/lib/api/projects';
import { Loader2, Users, FolderKanban, AlertCircle } from 'lucide-react';

type Mode = 'create' | 'edit';

interface TeamFormProps {
  mode: Mode;
  team?: Team;
  defaultProjectId?: string;
  trigger: React.ReactNode;
  onSuccess: (team: Team) => void;
  onSubmit: (payload: CreateTeamPayload | UpdateTeamPayload) => Promise<Team>;
}

interface FormState {
  projectId: string;
  name: string;
  description: string;
}

export function TeamForm({
  mode,
  team,
  defaultProjectId,
  trigger,
  onSuccess,
  onSubmit,
}: TeamFormProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Projects list for project selector
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const initialState = React.useCallback(
    (): FormState => ({
      projectId: team?.projectId ?? defaultProjectId ?? '',
      name: team?.name ?? '',
      description: team?.description ?? '',
    }),
    [team, defaultProjectId],
  );

  const [form, setForm] = React.useState<FormState>(initialState);

  // Load projects asynchronously when form opens in create mode
  React.useEffect(() => {
    if (!open || mode !== 'create') return;

    let cancelled = false;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!cancelled) {
          const projs = res.data || [];
          setProjects(projs);
          setForm((prev) => {
            if (!prev.projectId && projs.length > 0) {
              return { ...prev, projectId: defaultProjectId || projs[0].id };
            }
            return prev;
          });
        }
      })
      .catch(() => {
        // Silently catch project listing errors
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, mode, defaultProjectId]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setForm(initialState());
        setError(null);
        if (mode === 'create') {
          setLoadingProjects(true);
        }
      }
      setOpen(newOpen);
    },
    [initialState, mode],
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Team name is required.');
      return;
    }
    if (trimmedName.length > 255) {
      setError('Team name must not exceed 255 characters.');
      return;
    }

    if (mode === 'create' && !form.projectId) {
      setError('Please select a project for this team.');
      return;
    }

    const payload: CreateTeamPayload | UpdateTeamPayload =
      mode === 'create'
        ? {
            projectId: form.projectId,
            name: trimmedName,
            description: form.description.trim() || undefined,
          }
        : {
            name: trimmedName,
            description: form.description.trim() || undefined,
          };

    setSubmitting(true);
    try {
      const result = await onSubmit(payload);
      onSuccess(result);
      setOpen(false);
    } catch (err) {
      setError(formatTeamError(err, 'Failed to save team.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'create' ? 'Create New Team' : 'Edit Team Details'}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {mode === 'create'
              ? 'Organize engineers, designers, and managers around project initiatives.'
              : 'Update the name and purpose of this team.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Associated Project (Create Mode Only) */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label
                htmlFor="team-projectId"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <FolderKanban className="h-3.5 w-3.5 text-slate-500" />
                Associated Project <span className="text-red-500">*</span>
              </label>

              {defaultProjectId ? (
                <div className="flex items-center gap-2 p-2.5 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono">
                  <span className="truncate">{defaultProjectId}</span>
                </div>
              ) : (
                <select
                  id="team-projectId"
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  disabled={submitting || loadingProjects}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>
                    {loadingProjects ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="team-name"
              className="text-xs font-semibold text-slate-700"
            >
              Team Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="team-name"
              name="name"
              type="text"
              placeholder="e.g. Backend Platform, UI Core, Data Ops"
              value={form.name}
              onChange={handleChange}
              disabled={submitting}
              maxLength={255}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="team-description"
              className="text-xs font-semibold text-slate-700"
            >
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="team-description"
              name="description"
              rows={3}
              placeholder="What are the responsibilities and scope of this team?"
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
              className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Team' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
