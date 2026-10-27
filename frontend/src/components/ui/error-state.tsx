'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';

export function formatErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your authentication session has expired. Please log in again.';
    if (error.status === 403) return 'You do not have permission to access or modify this resource.';
    if (error.status === 404) return 'The requested resource could not be found or may have been deleted.';
    if (error.status === 409) return 'A conflict occurred with the current state of this resource.';
    if (error.message && error.message.trim().length > 0) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}

export function ErrorState({
  title = 'Unable to load data',
  description,
  error,
  onRetry,
  retryLabel = 'Retry',
  variant = 'banner',
  className,
}: ErrorStateProps) {
  const [retrying, setRetrying] = React.useState(false);
  const errorMessage = description || (error ? formatErrorMessage(error) : 'Please check your connection and try again.');

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300',
          className,
        )}
        role="alert"
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="flex-1">{errorMessage}</span>
        {onRetry && (
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="text-[11px] font-semibold text-rose-800 dark:text-rose-200 underline hover:no-underline"
          >
            {retrying ? 'Retrying...' : retryLabel}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-3',
          className,
        )}
        role="alert"
      >
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="gap-1.5 border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
            <span>{retrying ? 'Retrying...' : retryLabel}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs shadow-2xs',
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          {title && <span className="font-semibold block text-slate-900 dark:text-slate-100">{title}</span>}
          <span className="text-slate-700 dark:text-slate-300 block truncate">{errorMessage}</span>
        </div>
      </div>

      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="gap-1.5 border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 shrink-0 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
          <span>{retrying ? 'Retrying...' : retryLabel}</span>
        </Button>
      )}
    </div>
  );
}

export function FormError({
  message,
  id,
  className,
}: {
  message?: string | null;
  id?: string;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      id={id}
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

export function PermissionState({
  title = 'Permission Denied',
  description = 'You do not have the required Role-Based Access Control (RBAC) permissions to perform this action.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center space-y-3',
        className,
      )}
      role="alert"
    >
      <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function NotFoundState({
  title = 'Resource Not Found',
  description = 'The requested item or workspace record could not be found.',
  backLink,
  backLinkLabel = 'Return to Workspace',
  className,
}: {
  title?: string;
  description?: string;
  backLink?: string;
  backLinkLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 max-w-md mx-auto shadow-2xs',
        className,
      )}
      role="alert"
    >
      <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center mx-auto">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      {backLink && (
        <Link
          href={backLink}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mt-2"
        >
          {backLinkLabel}
        </Link>
      )}
    </div>
  );
}
