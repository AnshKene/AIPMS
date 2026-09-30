'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  PROJECT_STATUSES,
  type ProjectStatus,
  type CreateProjectPayload,
  type UpdateProjectPayload,
  type Project,
} from '@/lib/api/projects';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'create' | 'edit';

interface ProjectFormProps {
  mode: Mode;
  /** Required in create mode — the current authenticated user's ID */
  ownerId?: string;
  /** Existing project data — required in edit mode */
  project?: Project;
  /** Render the trigger element (e.g. a button) */
  trigger: React.ReactNode;
  /** Called after successful submission with the result */
  onSuccess: (project: Project) => void;
  /** Called with the payload to perform the actual API call */
  onSubmit: (payload: CreateProjectPayload | UpdateProjectPayload) => Promise<Project>;
}

interface FormState {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  // Slice to YYYY-MM-DD for <input type="date">
  return iso.slice(0, 10);
}

function toISOStringOrUndefined(dateInput: string): string | undefined {
  if (!dateInput) return undefined;
  return new Date(dateInput).toISOString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectForm({
  mode,
  ownerId,
  project,
  trigger,
  onSuccess,
  onSubmit,
}: ProjectFormProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const initialState = React.useCallback(
    (): FormState => ({
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'PLANNING',
      startDate: toDateInputValue(project?.startDate),
      endDate: toDateInputValue(project?.endDate),
    }),
    [project],
  );

  const [form, setForm] = React.useState<FormState>(initialState);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setForm(initialState());
        setError(null);
      }
      setOpen(newOpen);
    },
    [initialState],
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

    // Client-side validation
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (form.name.trim().length > 255) {
      setError('Project name must not exceed 255 characters.');
      return;
    }
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    const payload: CreateProjectPayload | UpdateProjectPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      startDate: toISOStringOrUndefined(form.startDate),
      endDate: toISOStringOrUndefined(form.endDate),
      ...(mode === 'create' && ownerId ? { ownerId } : {}),
    };

    setSubmitting(true);
    try {
      const result = await onSubmit(payload);
      onSuccess(result);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'New Project' : 'Edit Project'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'create'
              ? 'Create a new project in the system.'
              : 'Update the project details below.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="proj-name" className="block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="proj-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Project name"
              maxLength={255}
              disabled={submitting}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="proj-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="proj-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional project description"
              disabled={submitting}
              rows={3}
              className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label htmlFor="proj-status" className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="proj-status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={submitting}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label htmlFor="proj-start-date" className="block text-sm font-medium text-slate-700">
              Start Date
            </label>
            <Input
              id="proj-start-date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label htmlFor="proj-end-date" className="block text-sm font-medium text-slate-700">
              End Date
            </label>
            <Input
              id="proj-end-date"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              disabled={submitting}
              min={form.startDate || undefined}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Project' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
