'use client';

import * as React from 'react';
import {
  type Sprint,
  type CreateSprintPayload,
  type UpdateSprintPayload,
  formatSprintError,
} from '@/lib/api/sprints';
import { type Project } from '@/lib/api/projects';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Calendar, Target } from 'lucide-react';

interface SprintFormProps {
  mode: 'create' | 'edit';
  sprint?: Sprint | null;
  projects?: Project[];
  defaultProjectId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (payload: CreateSprintPayload | UpdateSprintPayload) => Promise<Sprint>;
  onSuccess?: (sprint: Sprint) => void;
}

export function SprintForm({
  mode,
  sprint,
  projects = [],
  defaultProjectId,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onSuccess,
}: SprintFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  function handleOpenChange(val: boolean) {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  }

  return (
    <>
      {trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block">
          {trigger}
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          {isOpen && (
            <SprintFormContent
              key={mode === 'edit' ? (sprint?.id ?? 'edit') : `new-${defaultProjectId ?? 'def'}`}
              mode={mode}
              sprint={sprint}
              projects={projects}
              defaultProjectId={defaultProjectId}
              onSubmit={onSubmit}
              onSuccess={(res) => {
                onSuccess?.(res);
                handleOpenChange(false);
              }}
              onCancel={() => handleOpenChange(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// Helper to format ISO dates to YYYY-MM-DD for date inputs
function toDateInputString(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

interface SprintFormContentProps {
  mode: 'create' | 'edit';
  sprint?: Sprint | null;
  projects: Project[];
  defaultProjectId?: string;
  onSubmit: (payload: CreateSprintPayload | UpdateSprintPayload) => Promise<Sprint>;
  onSuccess: (sprint: Sprint) => void;
  onCancel: () => void;
}

function SprintFormContent({
  mode,
  sprint,
  projects,
  defaultProjectId,
  onSubmit,
  onSuccess,
  onCancel,
}: SprintFormContentProps) {
  const [name, setName] = React.useState(() =>
    mode === 'edit' && sprint ? sprint.name || '' : '',
  );
  const [goal, setGoal] = React.useState(() =>
    mode === 'edit' && sprint ? sprint.goal || '' : '',
  );
  const [projectId, setProjectId] = React.useState(() =>
    mode === 'edit' && sprint
      ? sprint.projectId || ''
      : defaultProjectId || (projects.length > 0 ? projects[0].id : ''),
  );
  const [startDate, setStartDate] = React.useState(() => {
    if (mode === 'edit' && sprint) {
      return toDateInputString(sprint.startDate);
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = React.useState(() => {
    if (mode === 'edit' && sprint) {
      return toDateInputString(sprint.endDate);
    }
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);
    return twoWeeks.toISOString().split('T')[0];
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Sprint name is required.');
      return;
    }

    if (mode === 'create' && !projectId) {
      setError('Please select a project for this sprint.');
      return;
    }

    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    if (!endDate) {
      setError('End date is required.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setLoading(true);

    try {
      let result: Sprint;
      if (mode === 'create') {
        result = await onSubmit({
          name: trimmedName,
          goal: goal.trim() || null,
          projectId,
          startDate,
          endDate,
        } as CreateSprintPayload);
      } else {
        result = await onSubmit({
          name: trimmedName,
          goal: goal.trim() || null,
          startDate,
          endDate,
        } as UpdateSprintPayload);
      }

      onSuccess(result);
    } catch (err) {
      setError(formatSprintError(err, 'Failed to save sprint.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">
          {mode === 'create' ? 'Create Sprint' : 'Edit Sprint'}
        </h2>
        <p className="text-xs text-slate-500">
          {mode === 'create'
            ? 'Plan a new sprint iteration with clear goals and date boundaries.'
            : 'Update sprint details, target dates, or delivery goals.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 py-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Selection (Create mode only) */}
        {mode === 'create' && (
          <div className="space-y-1.5">
            <label
              htmlFor="sprint-project"
              className="block text-xs font-semibold text-slate-700"
            >
              Project <span className="text-red-500">*</span>
            </label>
            <select
              id="sprint-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loading}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer disabled:bg-slate-100"
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sprint Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="sprint-name"
            className="block text-xs font-semibold text-slate-700"
          >
            Sprint Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="sprint-name"
            placeholder="e.g. Sprint 14 – Auth & Onboarding"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="h-9 text-xs"
            autoFocus
          />
        </div>

        {/* Sprint Goal */}
        <div className="space-y-1.5">
          <label
            htmlFor="sprint-goal"
            className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Target className="h-3.5 w-3.5 text-slate-400" />
            Sprint Goal <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="sprint-goal"
            rows={3}
            placeholder="What is the primary deliverable or outcome for this sprint?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:bg-slate-100 resize-none"
          />
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="sprint-start-date"
              className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="sprint-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sprint-end-date"
              className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              End Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="sprint-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === 'create' ? 'Create Sprint' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </>
  );
}
