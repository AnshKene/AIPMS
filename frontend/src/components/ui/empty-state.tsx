'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FolderKanban, Search, FilterX, HelpCircle } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'default' | 'outline' | 'secondary';
  actionIcon?: React.ComponentType<{ className?: string }>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = FolderKanban,
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionVariant = 'default',
  actionIcon: ActionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return <FolderKanban className="h-6 w-6" />;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center space-y-4',
        className,
      )}
    >
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
        {renderIcon()}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}

      {!action && (onAction || onSecondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {onAction && actionLabel && (
            <Button
              size="sm"
              variant={actionVariant}
              onClick={onAction}
              className="gap-1.5 shadow-2xs"
            >
              {ActionIcon && <ActionIcon className="h-4 w-4" />}
              <span>{actionLabel}</span>
            </Button>
          )}

          {onSecondaryAction && secondaryActionLabel && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSecondaryAction}
              className="gap-1.5"
            >
              <span>{secondaryActionLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterEmptyState({
  searchQuery,
  description,
  onClearFilters,
  className,
}: {
  searchQuery?: string;
  description?: string;
  onClearFilters: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={searchQuery ? Search : FilterX}
      title={searchQuery ? `No results for "${searchQuery}"` : 'No matching records found'}
      description={
        description ||
        'No items match your current search or filter criteria. Try adjusting or clearing your filters.'
      }
      actionLabel="Clear Filters"
      onAction={onClearFilters}
      actionVariant="outline"
      actionIcon={FilterX}
      className={className}
    />
  );
}

export function InsufficientDataState({
  title = 'Insufficient Telemetry Data',
  description = 'Not enough historical records exist yet to produce a reliable trend analysis.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={HelpCircle}
      title={title}
      description={description}
      className={className}
    />
  );
}
