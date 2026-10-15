'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';

export function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded-md" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
            <div className="flex justify-between items-center text-xs">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
