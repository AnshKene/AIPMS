'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse motion-reduce:animate-none rounded-md bg-slate-200/80 dark:bg-slate-800/80',
        className,
      )}
      {...props}
    />
  );
}

export function SectionLoading({
  message = 'Loading data...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 p-6 text-xs text-slate-500 dark:text-slate-400',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function InlineLoading({
  className,
}: {
  className?: string;
}) {
  return (
    <Loader2 className={cn('h-3.5 w-3.5 animate-spin text-primary shrink-0', className)} />
  );
}
