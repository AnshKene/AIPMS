import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  category?: string;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
  actions?: React.ReactNode;
  accentColor?: string;
}

export function AdminPageHeader({
  category = 'Administration Area',
  title,
  description,
  breadcrumbs,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  actions,
  accentColor = 'bg-blue-600 dark:bg-blue-400',
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
      <div className="space-y-1">
        {/* Breadcrumbs / Category Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', accentColor)} />
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="flex items-center gap-1">
              {breadcrumbs.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {category}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="gap-2 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
