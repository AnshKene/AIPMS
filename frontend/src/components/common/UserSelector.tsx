'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { userDirectory, type UserProfile } from '@/lib/auth/user-directory';
import { useAuth } from '@/lib/auth/auth-context';
import { Search, Check, User, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleBadge } from './RoleBadge';

export interface UserSelectorOption extends UserProfile {
  subtitle?: string;
  badge?: string;
}

interface UserSelectorProps {
  value?: string | null;
  onChange: (userId: string) => void;
  options?: UserSelectorOption[];
  excludeUserIds?: string[];
  includeInactive?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function UserSelector({
  value,
  onChange,
  options,
  excludeUserIds,
  includeInactive = false,
  placeholder = 'Select a team member...',
  allowClear = true,
  disabled = false,
  className,
  id,
}: UserSelectorProps) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Subscribe to real-time directory changes
  const directoryVersion = React.useSyncExternalStore(
    (cb) => userDirectory.subscribe(cb),
    () => userDirectory.getVersion(),
    () => 0,
  );

  // Auto-sync directory on mount if not already fetched
  React.useEffect(() => {
    if (token) {
      void userDirectory.fetchDirectory(token);
    }
  }, [token]);

  // Available options: custom options provided, or fallback to known directory users
  // Inactive users are excluded by default to prevent assigning work to deactivated accounts
  const availableOptions: UserSelectorOption[] = React.useMemo(() => {
    let list: UserSelectorOption[] = [];
    if (options && options.length > 0) {
      list = options;
    } else {
      list = includeInactive ? userDirectory.getAllKnownUsers() : userDirectory.getActiveKnownUsers();
    }
    if (!includeInactive) {
      list = list.filter((u) => u.status !== 'INACTIVE' || u.id === value);
    }
    if (excludeUserIds && excludeUserIds.length > 0) {
      const excludeSet = new Set(excludeUserIds);
      list = list.filter((u) => !excludeSet.has(u.id));
    }
    return list;
  }, [options, excludeUserIds, includeInactive, value, directoryVersion]);

  // Current selected user profile
  const selectedUser = React.useMemo(() => {
    if (!value) return null;
    const fromOptions = availableOptions.find((o) => o.id === value);
    if (fromOptions) return fromOptions;
    return userDirectory.getUser(value);
  }, [value, availableOptions, directoryVersion]);

  // Filtered options based on search query
  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableOptions;
    return availableOptions.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.email.toLowerCase().includes(q) ||
        (opt.role && opt.role.toLowerCase().includes(q)) ||
        opt.id.toLowerCase().includes(q),
    );
  }, [availableOptions, search]);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (userId: string) => {
    onChange(userId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-left shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-300 dark:hover:border-slate-700',
        )}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar
              fallback={userDirectory.getInitials(selectedUser.name || selectedUser.email)}
              size="sm"
              className="h-5 w-5 text-[10px]"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {selectedUser.name || selectedUser.email}
            </span>
            {selectedUser.role && (
              <RoleBadge role={selectedUser.role} size="sm" showIcon={false} className="py-0 px-1.5 text-[9px]" />
            )}
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {allowClear && selectedUser && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl space-y-1 max-h-64 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative px-1 py-0.5">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, email, or role..."
              aria-label="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48 divide-y divide-slate-100 dark:divide-slate-800/60 pt-1" role="listbox">
            {allowClear && (
              <div
                role="option"
                aria-selected={!value}
                onClick={() => handleSelect('')}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors',
                  !value && 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold',
                )}
              >
                <div className="h-5 w-5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                  <User className="h-3 w-3" />
                </div>
                <span>Unassigned</span>
                {!value && <Check className="h-3.5 w-3.5 ml-auto text-blue-600" />}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                {search ? 'No matching users found' : 'No available users to select'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors',
                      isSelected && 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold',
                    )}
                  >
                    <Avatar
                      fallback={userDirectory.getInitials(opt.name || opt.email)}
                      size="sm"
                      className="h-6 w-6 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {opt.name}
                        </span>
                        {opt.role && (
                          <RoleBadge role={opt.role} size="sm" showIcon={false} className="py-0 px-1 text-[9px]" />
                        )}
                      </div>
                      {opt.email && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {opt.email}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 ml-auto text-blue-600 dark:text-blue-400 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
