import * as React from 'react';
import { Card } from '@/components/ui/card';

export function SprintsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Active Sprint Hero Skeleton */}
      <Card className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
      </Card>

      {/* Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
