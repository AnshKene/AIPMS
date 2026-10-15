import Link from 'next/link';
import { Sparkles, LayoutDashboard, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: '404 - Page Not Found | AIPMS',
  description: 'The requested page could not be found.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>

        {/* Status Code & Headings */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
            HTTP 404 Error
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The page, project resource, or destination you are looking for does not exist or may have been relocated.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full gap-2 shadow-xs">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 border-slate-300 dark:border-slate-800">
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>

        {/* Footer Identifier */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-400 font-mono">
          AIPMS Closed-Loop Project Management Platform
        </div>
      </div>
    </div>
  );
}
