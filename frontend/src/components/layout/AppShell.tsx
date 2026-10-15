'use client';

import * as React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden md:flex shrink-0 h-full relative z-30 overflow-visible">
          <AppSidebar />
        </div>

        {/* Main Container */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold focus:text-xs"
          >
            Skip to main content
          </a>
          <AppHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 sm:pb-8 focus:outline-none scroll-smooth"
          >
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
