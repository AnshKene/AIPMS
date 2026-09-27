'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogIn, UserPlus, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AppSidebar, navItems } from './AppSidebar';
import { useAuth } from '@/lib/auth/auth-context';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const currentNavItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href)),
  );

  const pageTitle = currentNavItem ? currentNavItem.title : 'Overview';

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch {
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs md:px-8">
      {/* Mobile Drawer Navigation Trigger */}
      <div className="flex items-center md:hidden mr-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5 text-slate-700" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="p-0 border-r-0">
            <AppSidebar className="w-full border-r-0" />
          </SheetContent>
        </Sheet>
      </div>

      {/* Page Title Context */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right Action Bar */}
      <div className="ml-auto flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-semibold text-slate-800">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-slate-500">
                {user?.email || ''}
              </span>
            </div>

            <Avatar
              className="h-8 w-8 border-blue-200 bg-blue-50 text-blue-700 font-semibold"
              fallback={getInitials(user?.name)}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-1.5 text-xs font-medium text-slate-700 hover:text-rose-600 hover:border-rose-200"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </Button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium text-slate-700">
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium border-slate-300">
                <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">Register</span>
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
