'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
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
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-left mb-4', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={cn('text-lg font-semibold tracking-tight text-slate-900', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn('text-xs text-slate-500 leading-relaxed', className)}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-slate-100 mt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogClose({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
    >
      <X className="h-4 w-4 text-slate-500" />
      <span className="sr-only">Close</span>
    </button>
  );
}

// Reusable Confirmation Dialog
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  error = null,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
            variant === 'destructive'
              ? 'bg-red-50 text-red-600'
              : 'bg-blue-50 text-blue-600',
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1 flex-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          size="sm"
          onClick={onConfirm}
          disabled={loading}
          className="gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
