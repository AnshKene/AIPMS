import * as React from 'react';
import { Card } from '@/components/ui/card';

export function TasksSkeleton({ view = 'list' }: { view?: 'list' | 'board' }) {
  if (view === 'board') {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3 min-w-[240px] flex-1">
            <div className="flex items-center justify-between px-1">
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="h-4 w-6 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="flex flex-col gap-2 min-h-[300px] rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-2.5">
              {Array.from({ length: 3 }).map((_, itemIdx) => (
                <div
                  key={itemIdx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5 shadow-xs"
                >
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs animate-pulse">
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_120px_100px_120px_120px] gap-4 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="hidden sm:block h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="hidden sm:block h-3 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="hidden sm:block h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="hidden sm:block h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_120px_100px_120px_120px] gap-4 items-center px-4 py-3.5"
          >
            <div className="space-y-2 min-w-0">
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
            <div className="hidden sm:block h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="hidden sm:block h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="hidden sm:block h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="hidden sm:block h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </Card>
  );
}
