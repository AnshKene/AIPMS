'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

interface TaskDistributionProps {
  done?: number;
  inProgress?: number;
  inReview?: number;
  todo?: number;
  blocked?: number;
}

export function TaskDistributionCard({
  done = 0,
  inProgress = 0,
  inReview = 0,
  todo = 0,
  blocked = 0,
}: TaskDistributionProps) {
  const total = done + inProgress + inReview + todo + blocked;

  const donePct = total > 0 ? Math.round((done * 100) / total) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress * 100) / total) : 0;
  const inReviewPct = total > 0 ? Math.round((inReview * 100) / total) : 0;
  const todoPct = total > 0 ? Math.round((todo * 100) / total) : 0;
  const blockedPct = total > 0 ? Math.round((blocked * 100) / total) : 0;

  const circumference = 238;
  const doneDash = Math.round((donePct / 100) * circumference);
  const inProgressDash = Math.round((inProgressPct / 100) * circumference);
  const inReviewDash = Math.round((inReviewPct / 100) * circumference);
  const todoDash = Math.round((todoPct / 100) * circumference);
  const blockedDash = Math.round((blockedPct / 100) * circumference);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Task Status Distribution</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Breakdown of all project tasks</p>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
          {total} Tasks
        </div>
      </div>

      {/* Donut Chart & Breakdown */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Donut Ring */}
        <div className="relative h-40 w-40 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="11"
              fill="transparent"
            />

            {/* Done Segment (Emerald) */}
            {done > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#10b981"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${doneDash} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            )}

            {/* In Progress Segment (Blue) */}
            {inProgress > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#3b82f6"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${inProgressDash} ${circumference}`}
                strokeDashoffset={`-${doneDash}`}
                strokeLinecap="round"
              />
            )}

            {/* In Review Segment (Amber) */}
            {inReview > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#f59e0b"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${inReviewDash} ${circumference}`}
                strokeDashoffset={`-${doneDash + inProgressDash}`}
                strokeLinecap="round"
              />
            )}

            {/* Todo Segment (Slate) */}
            {todo > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#64748b"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${todoDash} ${circumference}`}
                strokeDashoffset={`-${doneDash + inProgressDash + inReviewDash}`}
                strokeLinecap="round"
              />
            )}

            {/* Blocked Segment (Rose) */}
            {blocked > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#f43f5e"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${blockedDash} ${circumference}`}
                strokeDashoffset={`-${doneDash + inProgressDash + inReviewDash + todoDash}`}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {total}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tasks
            </span>
          </div>
        </div>

        {/* Breakdown Items List */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">{done}</span>
              <span className="text-slate-400 font-normal">({donePct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">{inProgress}</span>
              <span className="text-slate-400 font-normal">({inProgressPct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">In Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">{inReview}</span>
              <span className="text-slate-400 font-normal">({inReviewPct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Todo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">{todo}</span>
              <span className="text-slate-400 font-normal">({todoPct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">{blocked}</span>
              <span className="text-slate-400 font-normal">({blockedPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
