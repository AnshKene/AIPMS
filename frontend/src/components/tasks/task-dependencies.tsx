'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
  type TaskDependency,
} from '@/lib/api/tasks';
import { Loader2, Plus, Trash2, GitPullRequest } from 'lucide-react';

interface TaskDependenciesProps {
  taskId: string;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const [deps, setDeps] = React.useState<TaskDependency[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [addInput, setAddInput] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchDeps() {
      setLoading(true);
      setError(null);
      try {
        const res = await getTaskDependencies(taskId, { limit: 50 });
        if (!cancelled) {
          setDeps(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dependencies.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDeps();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const depId = addInput.trim();
    if (!depId) return;

    if (depId === taskId) {
      setAddError('A task cannot depend on itself.');
      return;
    }

    if (deps.some((d) => d.dependsOnTaskId === depId)) {
      setAddError('This dependency already exists.');
      return;
    }

    setAddError(null);
    setAdding(true);
    try {
      const dep = await addTaskDependency(taskId, { dependsOnTaskId: depId });
      setDeps((prev) => [...prev, dep]);
      setAddInput('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add dependency.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(dep: TaskDependency) {
    setRemoving(dep.id);
    try {
      await removeTaskDependency(taskId, dep.id);
      setDeps((prev) => prev.filter((d) => d.id !== dep.id));
    } catch {
      // fail silently
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400">Loading dependencies…</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}

      {!loading && !error && deps.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">No task dependencies linked.</p>
        </div>
      )}

      {!loading && deps.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Blocked By ({deps.length})
          </p>
          <ul className="space-y-1.5" aria-label="Task dependencies">
            {deps.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GitPullRequest className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                    {dep.dependsOnTaskId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(dep)}
                  disabled={removing === dep.id}
                  aria-label="Remove dependency"
                  className="shrink-0 rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                >
                  {removing === dep.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add dependency form */}
      <form onSubmit={handleAdd} className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <Input
            value={addInput}
            onChange={(e) => {
              setAddInput(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="Prerequisite Task UUID..."
            disabled={adding}
            className="text-xs h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            aria-label="Prerequisite Task UUID"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={adding || !addInput.trim()}
            className="shrink-0 gap-1.5 text-xs h-8"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Link
          </Button>
        </div>
        {addError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">
            {addError}
          </p>
        )}
      </form>
    </div>
  );
}
