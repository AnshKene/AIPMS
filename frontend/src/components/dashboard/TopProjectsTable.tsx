'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import {
  FolderKanban,
  Cpu,
  Smartphone,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { type Project } from '@/lib/api/projects';
import { formatProjectName } from '@/lib/utils';
import { type Task } from '@/lib/api/tasks';

export interface ProjectProgressRow {
  id: string;
  name: string;
  progress: number;
  taskCount: number;
  doneCount: number;
  status: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
}

interface TopProjectsTableProps {
  projects?: Project[];
  tasks?: Task[];
}

export function TopProjectsTable({ projects = [], tasks = [] }: TopProjectsTableProps) {
  const displayProjects: ProjectProgressRow[] = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const icons = [FolderKanban, Cpu, Smartphone, Sparkles, Layers];
    const bgs = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-500 text-white',
      'bg-purple-600 text-white',
    ];

    // Compute progress across all projects first
    const calculated: ProjectProgressRow[] = projects.map((p, idx) => {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      const doneCount = projTasks.filter((t) => t.status === 'DONE').length;
      const taskCount = projTasks.length;

      const progress =
        p.status === 'COMPLETED'
          ? 100
          : taskCount > 0
          ? Math.round((doneCount / taskCount) * 100)
          : 0;

      const formattedStatus = p.status ? p.status.replace(/_/g, ' ') : 'PLANNING';

      return {
        id: p.id,
        name: formatProjectName(p.name),
        progress,
        taskCount,
        doneCount,
        status: formattedStatus,
        icon: icons[idx % icons.length],
        iconBg: bgs[idx % bgs.length],
      };
    });

    // Sort descending by progress, then by task count (real active projects first)
    return calculated
      .sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress;
        if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [projects, tasks]);

  const getBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'PLANNING':
        return 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
      case 'IN PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'AT RISK':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getProgressBarGradient = (progress: number, status: string) => {
    if (status.toUpperCase() === 'AT RISK') {
      return 'bg-gradient-to-r from-rose-500 to-amber-500';
    }
    if (progress === 100 || status.toUpperCase() === 'COMPLETED') {
      return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    }
    if (progress >= 50) {
      return 'bg-gradient-to-r from-blue-600 to-indigo-600';
    }
    if (progress > 0) {
      return 'bg-gradient-to-r from-amber-500 to-blue-500';
    }
    return 'bg-slate-300 dark:bg-slate-600';
  };

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top Projects by Progress</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Highest completion & delivery momentum</p>
          </div>
        </div>
        <Link
          href="/projects"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Table Rows */}
      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80">
        <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-2">
          <span className="col-span-5">Project</span>
          <span className="col-span-4">Progress</span>
          <span className="col-span-3 text-right">Status</span>
        </div>

        {displayProjects.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No projects available.
          </div>
        ) : (
          displayProjects.map((proj) => {
            const Icon = proj.icon || FolderKanban;
            return (
              <div
                key={proj.id}
                className="grid grid-cols-12 items-center py-2.5 text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-1 -mx-1 rounded-lg transition-colors group"
              >
                {/* Project Name + Icon */}
                <div className="col-span-5 flex items-center gap-2.5 pr-2 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-lg ${
                      proj.iconBg || 'bg-blue-600 text-white'
                    } flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${proj.id}`}
                      className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block transition-colors"
                      title={proj.name}
                    >
                      {proj.name}
                    </Link>
                    {proj.taskCount > 0 ? (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                        {proj.doneCount} of {proj.taskCount} tasks done
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                        No tasks yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar + Percentage */}
                <div className="col-span-4 flex items-center gap-2.5 pr-2">
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full ${getProgressBarGradient(
                        proj.progress,
                        proj.status,
                      )} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(4, proj.progress)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right shrink-0">
                    {proj.progress}%
                  </span>
                </div>

                {/* Status Badge */}
                <div className="col-span-3 flex justify-end">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${getBadgeStyle(
                      proj.status,
                    )} shadow-2xs`}
                  >
                    {proj.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
