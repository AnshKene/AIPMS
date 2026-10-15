'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function RisksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading risks workspace">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:col-span-1">
          <CardContent className="p-4 space-y-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
          </CardContent>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matrix Heatmap Skeleton */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="h-5 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-full max-w-lg mx-auto" />
      </Card>

      {/* Toolbar Skeleton */}
      <div className="h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />

      {/* Risk Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
          </Card>
        ))}
      </div>
    </div>
  );
}
