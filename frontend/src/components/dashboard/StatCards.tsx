'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import {
  FolderKanban,
  CheckCircle2,
  Zap,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export interface StatMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  doneTasks: number;
  remainingTasks: number;
  activeSprints: number;
  onTrackSprints: number;
  atRiskSprints: number;
  openRisks: number;
  highRisks: number;
  mediumRisks: number;
}

interface StatCardsProps {
  metrics?: StatMetrics | null;
  loading?: boolean;
}

export function StatCards({ metrics, loading = false }: StatCardsProps) {
  const data = metrics ?? {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    doneTasks: 0,
    remainingTasks: 0,
    activeSprints: 0,
    onTrackSprints: 0,
    atRiskSprints: 0,
    openRisks: 0,
    highRisks: 0,
    mediumRisks: 0,
  };

  const taskCompletionRate =
    data.totalTasks > 0 ? Math.round((data.doneTasks / data.totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Total Projects */}
      <Link href="/projects" className="block group">
        <Card className="relative overflow-hidden p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-90" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <FolderKanban className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Projects</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {loading ? '—' : data.totalProjects}
            </span>
          </div>

          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{data.activeProjects} active</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{data.completedProjects} completed</span>
          </div>
        </Card>
      </Link>

      {/* Card 2: Tasks */}
      <Link href="/tasks" className="block group">
        <Card className="relative overflow-hidden p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Tasks</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800">
              {taskCompletionRate}% done
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {loading ? '—' : data.totalTasks}
            </span>
          </div>

          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.doneTasks} done</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{data.remainingTasks} remaining</span>
          </div>
        </Card>
      </Link>

      {/* Card 3: Active Sprints */}
      <Link href="/sprints" className="block group">
        <Card className="relative overflow-hidden p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-90" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Sprints</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {loading ? '—' : data.activeSprints}
            </span>
          </div>

          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.onTrackSprints} on track</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className={data.atRiskSprints > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
              {data.atRiskSprints} at risk
            </span>
          </div>
        </Card>
      </Link>

      {/* Card 4: Open Risks */}
      <Link href="/risks" className="block group">
        <Card className="relative overflow-hidden p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all hover:-translate-y-0.5">
          <div
            className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
              data.highRisks > 0 ? 'from-rose-500 to-amber-500' : 'from-emerald-500 to-teal-500'
            } opacity-90`}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs ${
                  data.highRisks > 0
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Open Risks</span>
            </div>
            {data.highRisks > 0 && (
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800">
                Action required
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {loading ? '—' : data.openRisks}
            </span>
          </div>

          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className={data.highRisks > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
              {data.highRisks} high
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{data.mediumRisks} medium</span>
          </div>
        </Card>
      </Link>
    </div>
  );
}
