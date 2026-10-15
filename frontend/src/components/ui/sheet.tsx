'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

export function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('useSheet must be used within a Sheet');
  }
  return context;
}

export function Sheet({
  children,
  open: openProp,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useSheet();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: (e?: React.MouseEvent) => {
        (children as React.ReactElement<{ onClick?: (e?: React.MouseEvent) => void }>).props.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  className,
  side = 'right',
  hideCloseButton = false,
}: {
  children: React.ReactNode;
  className?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  hideCloseButton?: boolean;
}) {
  const { open, setOpen } = useSheet();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'fixed inset-0 z-50 flex',
        side === 'left' ? 'justify-start' : 'justify-end',
      )}
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-50 flex h-full w-full max-w-full sm:max-w-md flex-col bg-white dark:bg-slate-900 p-6 shadow-xl transition ease-in-out duration-300 animate-in overflow-y-auto',
          side === 'left' ? 'slide-in-from-left' : 'slide-in-from-right',
          className,
        )}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4.5 w-4.5" />
            <span className="sr-only">Close</span>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
