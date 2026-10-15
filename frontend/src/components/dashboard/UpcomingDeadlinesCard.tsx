'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { type Task } from '@/lib/api/tasks';
import { type Project } from '@/lib/api/projects';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

interface UpcomingDeadlinesCardProps {
  tasks?: Task[];
  projects?: Project[];
}

export function UpcomingDeadlinesCard({ tasks = [], projects = [] }: UpcomingDeadlinesCardProps) {
  const [now] = React.useState(() => Date.now());

  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const upcomingTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    return tasks
      .filter((t) => t.dueDate && t.status !== 'DONE')
      .map((t) => {
        const dueTime = new Date(t.dueDate!).getTime();
        const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
        return {
          ...t,
          dueTime,
          diffDays,
          projectName: projectMap.get(t.projectId) || 'Workspace Project',
        };
      })
      .sort((a, b) => a.dueTime - b.dueTime)
      .slice(0, 4);
  }, [tasks, projectMap, now]);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upcoming Deadlines</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Upcoming milestone commitments</p>
          </div>
        </div>
        <Link
          href="/tasks"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Deadlines List */}
      <div className="mt-3 space-y-2.5">
        {upcomingTasks.length === 0 ? (
          <div className="py-7 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200/70 dark:border-slate-800">
            <Clock className="h-7 w-7 text-slate-400 mb-1.5" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Pending Deadlines
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              All active tasks are either on schedule or unscheduled.
            </p>
          </div>
        ) : (
          upcomingTasks.map((t) => {
            const dueDateObj = new Date(t.dueDate!);
            const formattedDate = dueDateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            const isOverdue = t.diffDays < 0;
            const isDueSoon = t.diffDays >= 0 && t.diffDays <= 3;

            return (
              <Link
                key={t.id}
                href={`/tasks?projectId=${t.projectId}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${
                      isOverdue
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : isDueSoon
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {t.projectName}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${
                      isOverdue
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : isDueSoon
                        ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isOverdue ? 'Overdue' : `${t.diffDays}d left`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {formattedDate}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
