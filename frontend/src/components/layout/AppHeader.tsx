'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  LogIn,
  UserPlus,
  ChevronRight,
  Plus,
  LogOut,
  User,
  Lock,
  Settings,
  CheckSquare,
  FolderKanban,
  AlertTriangle,
  Bot,
  LayoutDashboard,
  LayoutGrid,
  Briefcase,
  ShieldCheck,
  FileText,
  Activity,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './AppSidebar';
import { CommandSearchModal } from './CommandSearchModal';
import { NotificationsPopover } from './NotificationsPopover';
import { AccountModal, type AccountTab } from './AccountModal';
import { useAuth } from '@/lib/auth/auth-context';
import { isDesignatedAdmin } from '@/lib/auth/auth-storage';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  const [accountInitialTab, setAccountInitialTab] = React.useState<AccountTab>('profile');
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const quickActionRef = React.useRef<HTMLDivElement>(null);

  // Automatically close mobile menu on route navigation
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsQuickActionOpen(false);
  }

  // Click-outside listener for User Menu & Quick Action dropdowns
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(target)) {
        setIsQuickActionOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsQuickActionOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const [isMac] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    }
    return false;
  });

  // Global Ctrl+K / Cmd+K search shortcut
  React.useEffect(() => {
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const nextDark = !isDark;
      setIsDark(nextDark);
      if (nextDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
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
    if (role === 'ADMIN' && !isDesignatedAdmin(user)) {
      return 'USER';
    }
    return role.replace(/_/g, ' ');
  };

  const formatDisplayName = (name?: string | null) => {
    if (!name) return 'User';
    if (name.toLowerCase().includes('administrator')) return 'System Admin';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
    return name;
  };

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Overview', icon: LayoutDashboard };
    }
    if (pathname.startsWith('/projects/')) {
      return { section: 'Projects', sectionHref: '/projects', title: 'Project Details', icon: FolderKanban };
    }
    if (pathname === '/projects') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Projects', icon: FolderKanban };
    }
    if (pathname === '/tasks') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Tasks', icon: CheckSquare };
    }
    if (pathname.startsWith('/teams/')) {
      return { section: 'Teams', sectionHref: '/teams', title: 'Team Details', icon: Users };
    }
    if (pathname === '/teams') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Teams', icon: Users };
    }
    if (pathname === '/sprints') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Sprints', icon: Zap };
    }
    if (pathname === '/risks') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Risks', icon: AlertTriangle };
    }
    if (pathname === '/reports') {
      return { section: 'Workspace', sectionHref: '/dashboard', title: 'Reports', icon: BarChart3 };
    }
    if (pathname === '/users' || pathname === '/admin/users') {
      return { section: 'Administration', sectionHref: '/admin/overview', title: 'Users & Access', icon: ShieldCheck };
    }
    if (pathname === '/admin/overview') {
      return { section: 'Administration', sectionHref: '/admin/overview', title: 'Admin Overview', icon: LayoutGrid };
    }
    if (pathname === '/admin/audit-logs') {
      return { section: 'Administration', sectionHref: '/admin/overview', title: 'Audit Logs', icon: FileText };
    }
    if (pathname === '/admin/health') {
      return { section: 'Administration', sectionHref: '/admin/overview', title: 'System Health', icon: Activity };
    }
    if (pathname === '/admin/workspaces') {
      return { section: 'Administration', sectionHref: '/admin/overview', title: 'Workspace Admin', icon: Briefcase };
    }
    return { section: 'AIPMS', sectionHref: '/dashboard', title: 'Workspace', icon: Sparkles };
  };

  const breadcrumb = getBreadcrumb();
  const BreadcrumbIcon = breadcrumb.icon;

  const handleOpenAccountTab = (tab: AccountTab) => {
    setAccountInitialTab(tab);
    setIsAccountOpen(true);
    setIsUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 md:px-6 backdrop-blur-md transition-colors">
        {/* Left Area: Mobile Drawer Trigger, Brand, and Breadcrumb */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
          {/* Mobile Drawer Trigger */}
          <div className="flex items-center md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 border-r-0 w-[285px] sm:w-[320px] max-w-[85vw] focus:outline-none overflow-hidden"
              >
                <AppSidebar
                  isMobile
                  onNavigate={() => setIsMobileMenuOpen(false)}
                  className="w-full border-r-0"
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile Brand Logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
              AIPMS
            </span>
          </div>

          {/* Desktop Interactive Breadcrumb */}
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
            <Link
              href={breadcrumb.sectionHref}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {breadcrumb.section}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold" aria-current="page">
              <BreadcrumbIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{breadcrumb.title}</span>
            </div>
          </nav>

          {/* Desktop Global Search Pill */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex w-full max-w-xs lg:max-w-sm items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
            aria-label="Search projects, tasks, teams, risks"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Search workspace...</span>
            </div>
            <kbd suppressHydrationWarning className="inline-flex items-center gap-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shadow-2xs shrink-0">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        {/* Right Actions & Account Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Action (+ New) Dropdown */}
          <div className="relative" ref={quickActionRef}>
            <button
              type="button"
              onClick={() => setIsQuickActionOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
              aria-label="Quick Actions"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New</span>
            </button>

            {isQuickActionOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1 z-40 text-xs animate-in fade-in-0 zoom-in-95 duration-100">
                <Link
                  href="/tasks"
                  onClick={() => setIsQuickActionOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  <span>New Task</span>
                </Link>
                <Link
                  href="/projects"
                  onClick={() => setIsQuickActionOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                  <span>New Project</span>
                </Link>
                <Link
                  href="/risks"
                  onClick={() => setIsQuickActionOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>New Risk</span>
                </Link>
                <Separator className="my-1 bg-slate-100 dark:bg-slate-800" />
                <Link
                  href="/dashboard?tool=query"
                  onClick={() => setIsQuickActionOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  <Bot className="h-4 w-4 text-indigo-500" />
                  <span>Ask AI Copilot</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Search Icon Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            title="Search (Ctrl+K)"
            className="flex md:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Notifications Button with Status Dot */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="Notifications"
              title="Notifications"
              className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
            </button>
            <NotificationsPopover
              open={isNotificationsOpen}
              onOpenChange={setIsNotificationsOpen}
            />
          </div>

          {/* Desktop Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* Authenticated User Menu Dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-1 pr-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group"
              >
                <div className="relative shrink-0">
                  <Avatar
                    className="h-7 w-7 border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                    fallback={getInitials(user?.name)}
                  />
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900" />
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight max-w-[130px]">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {formatDisplayName(user?.name)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                    {formatRole(user?.role)}
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0',
                    isUserMenuOpen && 'rotate-180',
                  )}
                />
              </button>

              {/* User Dropdown Menu Popover */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 z-40 space-y-1 animate-in fade-in-0 zoom-in-95 duration-100">
                  {/* User Profile Header */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user?.name || 'AIPMS Administrator'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {user?.email || 'admin@aipms.com'}
                    </p>
                    <div className="mt-1.5">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase">
                        {formatRole(user?.role)}
                      </span>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <button
                    type="button"
                    onClick={() => handleOpenAccountTab('profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Profile & Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAccountTab('password')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>Security & Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAccountTab('settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Preferences</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? (
                        <Sun className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Moon className="h-4 w-4 text-slate-400" />
                      )}
                      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isDark ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  <Separator className="my-1 bg-slate-100 dark:bg-slate-800" />

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Login</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium border-slate-300">
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Register</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Global Command Search Modal */}
      <CommandSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      {/* Account Settings / Profile Modal */}
      <AccountModal
        open={isAccountOpen}
        onOpenChange={setIsAccountOpen}
        initialTab={accountInitialTab}
      />
    </>
  );
}
