import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white shadow-2xs',
        secondary:
          'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        outline:
          'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-transparent',
        info: 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
        success:
          'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
        warning:
          'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
        destructive:
          'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
        tech: 'border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono tracking-normal normal-case font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
