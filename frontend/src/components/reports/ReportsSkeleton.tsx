'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading reports and analytics workspace">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Scope Toolbar Skeleton */}
      <div className="h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />

      {/* KPI Cards Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
