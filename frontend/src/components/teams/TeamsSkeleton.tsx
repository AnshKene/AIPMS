'use client';

import * as React from 'react';

export function TeamsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
          </div>
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/80 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-md shrink-0" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="h-9 flex-1 max-w-md bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>

      {/* Team Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/80 rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
            </div>

            <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded" />

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/80 rounded ml-2" />
              </div>
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
