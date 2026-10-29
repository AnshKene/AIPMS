'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Zap,
  AlertTriangle,
  BarChart3,
  Sparkles,
  Sliders,
  FileText,
  Bot,
  ShieldCheck,
  Settings,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth/auth-context';
import { type Role, isDesignatedAdmin } from '@/lib/auth/auth-storage';
import { AccountModal } from './AccountModal';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: string;
}

export const workspaceNavItems: NavItem[] = [
  { title: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  { title: 'Sprints', href: '/sprints', icon: Zap },
  { title: 'Teams', href: '/teams', icon: Users, roles: ['ADMIN', 'PROJECT_OWNER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  { title: 'Risks', href: '/risks', icon: AlertTriangle },
  { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'PROJECT_OWNER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
];

export const adminNavItems: NavItem[] = [
  { title: 'Admin Overview', href: '/admin/overview', icon: LayoutGrid, roles: ['ADMIN'] },
  { title: 'Users & Access', href: '/admin/users', icon: ShieldCheck, roles: ['ADMIN'] },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, roles: ['ADMIN'] },
  { title: 'System Health', href: '/admin/health', icon: Activity, roles: ['ADMIN'] },
  { title: 'Workspace Admin', href: '/admin/workspaces', icon: Briefcase, roles: ['ADMIN'] },
];

export const aiToolsNavItems: NavItem[] = [
  { title: 'Project Insights', href: '/dashboard?tool=insights', icon: Sparkles },
  { title: 'What-If Simulator', href: '/dashboard?tool=simulator', icon: Sliders },
  { title: 'Ask Project AI', href: '/dashboard?tool=query', icon: Bot },
];

export interface AppSidebarProps {
  className?: string;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ className, isMobile = false, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const userRole: Role = user?.role || 'TEAM_MEMBER';
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);

  // Persistent sidebar collapse state with lazy initialization (desktop only)
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('aipms_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Track viewport mobile breakpoint (< 768px)
  const [isMobileScreen, setIsMobileScreen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When rendered in a mobile drawer or on a mobile screen, the sidebar must NEVER collapse
  const isDrawerMode = isMobile || isMobileScreen;
  const isCollapsed = isDrawerMode ? false : desktopCollapsed;

  const toggleCollapsed = React.useCallback(() => {
    if (isDrawerMode) return;
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aipms_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, [isDrawerMode]);

  // Global Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar (desktop only)
  React.useEffect(() => {
    if (isDrawerMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerMode, toggleCollapsed]);

  const visibleWorkspaceItems = workspaceNavItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  const handleAskAI = () => {
    onNavigate?.();
    router.push('/dashboard?tool=query');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'AS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatRole = (role?: string) => {
    if (!role) return 'USER';
    return role.replace(/_/g, ' ');
  };

  return (
    <>
      <aside
        aria-label="Main Navigation"
        className={cn(
          'flex h-full flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-300 relative select-none',
          isDrawerMode ? 'w-full' : isCollapsed ? 'w-[72px]' : 'w-[260px]',
          className,
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex h-16 items-center justify-between px-3.5 shrink-0 border-b border-slate-100 dark:border-slate-800',
            isCollapsed && 'justify-center px-0',
            isDrawerMode && 'pr-14',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  AIPMS
                </span>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                  AI Project Management
                </span>
              </div>
            )}
          </div>

          {/* Integrated Header Toggle Button (Desktop only) */}
          {!isDrawerMode && !isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {/* Centered Expand Trigger in Collapsed Mode (Desktop only) */}
          {!isDrawerMode && isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-md cursor-pointer hover:scale-110 transition-all"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 space-y-4 px-2.5 py-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Main Navigation Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Workspace
              </div>
            )}
            <nav aria-label="Workspace Links" className="space-y-0.5">
              {visibleWorkspaceItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all relative',
                      isCollapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100',
                    )}
                  >
                    {/* Active Left Indicator Bar (Clean, no weird border curves) */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400 shadow-xs"
                      />
                    )}

                    <Icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0 transition-colors',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300',
                      )}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1">{item.title}</span>
                    )}

                    {/* Flyout Tooltip when Collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all z-50 flex items-center gap-1.5 border border-slate-700/60">
                        <span>{item.title}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Administration Section (ADMIN only) */}
          {userRole === 'ADMIN' && isDesignatedAdmin(user) && (
            <>
              <Separator className="bg-slate-100 dark:bg-slate-800/80 my-1.5" />
              <div className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Administration</span>
                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[9px] px-1.5 py-0.2 rounded font-bold tracking-normal border border-purple-200/60 dark:border-purple-800/60">
                      ADMIN
                    </span>
                  </div>
                )}
                <nav aria-label="Admin Links" className="space-y-0.5">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin/overview' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onNavigate?.()}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all relative',
                          isCollapsed && 'justify-center px-2',
                          isActive
                            ? 'bg-purple-50/90 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100',
                        )}
                      >
                        {/* Active Left Indicator Bar for Admin */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-purple-600 dark:bg-purple-400 shadow-xs"
                          />
                        )}

                        <Icon
                          className={cn(
                            'h-4.5 w-4.5 shrink-0 transition-colors',
                            isActive
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300',
                          )}
                        />

                        {!isCollapsed && (
                          <span className="truncate flex-1">{item.title}</span>
                        )}

                        {/* Flyout Tooltip when Collapsed */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all z-50 flex items-center gap-1.5 border border-slate-700/60">
                            <span>{item.title}</span>
                            <span className="text-[9px] font-bold px-1 rounded bg-purple-500/30 text-purple-200">
                              ADMIN
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </>
          )}

          <Separator className="bg-slate-100 dark:bg-slate-800/80 my-1.5" />

          {/* AI Tools Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <span>AI Tools</span>
                <Sparkles className="h-3 w-3 text-amber-500" />
              </div>
            )}
            <div className="space-y-0.5">
              {aiToolsNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-all relative',
                      isCollapsed && 'justify-center px-2',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}

                    {/* Flyout Tooltip when Collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all z-50 flex items-center gap-1.5 border border-slate-700/60">
                        <span>{item.title}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* AI Copilot Widget */}
          {!isCollapsed ? (
            <div className="mt-3 rounded-xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-purple-50/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/10 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white shadow-2xs">
                    <Bot className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    AI Copilot
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Instant delivery insights, risks, and bottleneck analysis.
              </p>
              <button
                type="button"
                onClick={handleAskAI}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 dark:border-blue-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 transition-all cursor-pointer group"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                <span>Ask Copilot</span>
              </button>
            </div>
          ) : (
            /* Collapsed AI Trigger Icon */
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={handleAskAI}
                className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs hover:scale-105 transition-all cursor-pointer"
                aria-label="Open AI Copilot"
              >
                <Bot className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all z-50 flex items-center gap-1.5 border border-slate-700/60">
                  <span>AI Copilot</span>
                  <span className="text-[9px] font-bold px-1 rounded bg-blue-500/30 text-blue-200">
                    Online
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>

        <Separator className="bg-slate-100 dark:bg-slate-800" />

        {/* Bottom User Account Anchor */}
        <div className="p-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setIsAccountOpen(true);
            }}
            aria-label="Open account menu"
            className={cn(
              'w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group relative',
              isCollapsed && 'justify-center p-1.5',
            )}
          >
            {/* Avatar with Presence Indicator */}
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/80 dark:border-blue-800 shadow-2xs">
                {getInitials(user?.name)}
              </div>
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs"
                title="Online"
              />
            </div>

            {!isCollapsed && (
              <>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      title={user?.name || 'AIPMS Administrator'}
                    >
                      {user?.name || 'AIPMS Admin'}
                    </span>
                    <span className="text-[9px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-tight shrink-0">
                      {formatRole(user?.role)}
                    </span>
                  </div>
                  <span
                    className="truncate text-[10px] text-slate-400 dark:text-slate-500 mt-0.5"
                    title={user?.email || 'admin@aipms.com'}
                  >
                    {user?.email || 'admin@aipms.com'}
                  </span>
                </div>
                <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:rotate-45 transition-all shrink-0" />
              </>
            )}

            {/* Collapsed User Flyout Tooltip */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all z-50 border border-slate-700/60">
                <div className="font-bold">{user?.name || 'AIPMS Admin'}</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  {user?.email || 'admin@aipms.com'} • {formatRole(user?.role)}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Account Settings / Profile Modal */}
      <AccountModal
        open={isAccountOpen}
        onOpenChange={setIsAccountOpen}
      />
    </>
  );
}
