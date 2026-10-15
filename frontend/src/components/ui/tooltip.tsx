'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{ 'aria-label'?: string }>;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, {
        'aria-label': typeof content === 'string' ? content : undefined,
      })}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in-0 zoom-in-95',
            side === 'top' && '-top-8 left-1/2 -translate-x-1/2',
            side === 'bottom' && '-bottom-8 left-1/2 -translate-x-1/2',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
