import * as React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SelectOption {
  label: string;
  value: string;
}

interface AdminFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selectFilter?: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    label?: string;
  };
  totalCount?: number;
  filteredCount?: number;
  onReset?: () => void;
  className?: string;
}

export function AdminFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectFilter,
  totalCount,
  filteredCount,
  onReset,
  className,
}: AdminFilterBarProps) {
  const isFiltered = Boolean(
    searchQuery.trim().length > 0 || (selectFilter && selectFilter.value !== 'ALL'),
  );

  return (
    <Card className={cn('p-3.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900', className)}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Select Filter Dropdown */}
          {selectFilter && (
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectFilter.value}
                onChange={(e) => selectFilter.onChange(e.target.value)}
                className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-48"
              >
                {selectFilter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Button */}
          {isFiltered && onReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 gap-1.5 shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>

        {/* Counter Badge */}
        {totalCount !== undefined && (
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 self-end sm:self-center">
            {filteredCount !== undefined && filteredCount !== totalCount ? (
              <span>
                Showing <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredCount}</strong> of {totalCount}
              </span>
            ) : (
              <span>
                Total: <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
