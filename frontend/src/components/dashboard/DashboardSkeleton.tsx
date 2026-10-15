'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            </div>
            <div className="mt-4 h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="mt-2 h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          </Card>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 h-64 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            </Card>
            <Card className="p-5 h-64 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 h-64 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            </Card>
            <Card className="p-5 h-64 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            </Card>
          </div>
        </div>

        {/* Right AI Panel Skeleton */}
        <div className="lg:col-span-1">
          <Card className="p-5 h-full min-h-[480px] border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-24 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            <div className="space-y-2">
              <div className="h-9 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="h-9 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="h-9 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
