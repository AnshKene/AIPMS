'use client';

import * as React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden md:flex md:w-64 md:shrink-0">
          <AppSidebar />
        </div>

        {/* Main Container */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <AppHeader />
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
