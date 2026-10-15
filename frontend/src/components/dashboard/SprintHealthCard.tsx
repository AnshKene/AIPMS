'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Zap, ChevronRight } from 'lucide-react';

interface SprintHealthCardProps {
  onTrack?: number;
  atRisk?: number;
  offTrack?: number;
  notStarted?: number;
}

export function SprintHealthCard({
  onTrack = 0,
  atRisk = 0,
  offTrack = 0,
  notStarted = 0,
}: SprintHealthCardProps) {
  const total = onTrack + atRisk + offTrack + notStarted;
  const activeTotal = onTrack + atRisk;
  const percentage = activeTotal > 0 ? Math.round((onTrack / activeTotal) * 100) : total > 0 ? Math.round((onTrack / total) * 100) : 100;

  // Arc stroke dash calculations
  const circumference = 238;
  const onTrackDash = total > 0 ? Math.round((onTrack / total) * circumference) : 0;
  const atRiskDash = total > 0 ? Math.round((atRisk / total) * circumference) : 0;
  const offTrackDash = total > 0 ? Math.round((offTrack / total) * circumference) : 0;

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sprint Health</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Current sprint status across projects</p>
          </div>
        </div>
        <Link
          href="/sprints"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Donut Chart & Legend Container */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Donut Ring */}
        <div className="relative h-40 w-40 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="11"
              fill="transparent"
            />

            {/* On Track Segment (Emerald) */}
            {onTrack > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#10b981"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${onTrackDash} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            )}

            {/* At Risk Segment (Amber) */}
            {atRisk > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#f59e0b"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${atRiskDash} ${circumference}`}
                strokeDashoffset={`-${onTrackDash}`}
                strokeLinecap="round"
              />
            )}

            {/* Off Track Segment (Rose) */}
            {offTrack > 0 && (
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="#f43f5e"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={`${offTrackDash} ${circumference}`}
                strokeDashoffset={`-${onTrackDash + atRiskDash}`}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {percentage}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              On Track
            </span>
          </div>
        </div>

        {/* Status Legend List */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">On Track</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{onTrack}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">At Risk</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{atRisk}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Off Track</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{offTrack}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-medium p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Not Started</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{notStarted}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
