'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface NotificationsPopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationsPopover({
  open: controlledOpen,
  onOpenChange,
}: NotificationsPopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-4 z-40 space-y-3 animate-in fade-in-0 zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
        <span className="text-[10px] font-semibold text-slate-400">0 Unread</span>
      </div>

      <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
        <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            You&apos;re all caught up.
          </p>
          <p className="text-[11px] text-slate-400">No new notifications.</p>
        </div>
      </div>
    </div>
  );
}
