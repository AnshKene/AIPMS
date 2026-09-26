'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AppSidebar, navItems } from './AppSidebar';

export function AppHeader() {
  const pathname = usePathname();

  const currentNavItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href)),
  );

  const pageTitle = currentNavItem ? currentNavItem.title : 'Overview';

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
        <Avatar className="h-8 w-8 cursor-pointer border-blue-200 bg-blue-50 text-blue-700 font-semibold" fallback="AI" />
      </div>
    </header>
  );
}
