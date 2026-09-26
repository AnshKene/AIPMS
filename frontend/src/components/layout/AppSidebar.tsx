'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Zap,
  AlertTriangle,
  BarChart3,
  Sparkles,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'Teams', href: '/teams', icon: Users },
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  { title: 'Sprints', href: '/sprints', icon: Zap },
  { title: 'Risks', href: '/risks', icon: AlertTriangle },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-slate-200 bg-white text-slate-900',
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight text-slate-900">AIPMS</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            AI Project System
          </span>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 font-semibold">
          v1.0
        </Badge>
      </div>

      <Separator />

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-400 group-hover:text-slate-600',
                  )}
                />
                <span>{item.title}</span>
              </div>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User / Auth Placeholder Card */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-semibold text-xs">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-semibold text-slate-800">
              Demo Architect
            </span>
            <span className="truncate text-[10px] text-slate-500">
              developer@aipms.local
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
