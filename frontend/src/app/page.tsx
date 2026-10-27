'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  FileBarChart2,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  Activity,
  ArrowUpRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function LandingPage() {
  const router = useRouter();

  // Dark mode toggle state
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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

  const handleDropdownToggle = (menuName: string) => {
    setActiveDropdown((prev) => (prev === menuName ? null : menuName));
  };

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.nav-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition-all">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                AIPMS
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                AI Project Management
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation Menu */}
          <nav className="hidden md:flex items-center gap-1 nav-dropdown-container">
            {/* Product Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => handleDropdownToggle('product')}
                aria-expanded={activeDropdown === 'product'}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeDropdown === 'product'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900'
                }`}
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    activeDropdown === 'product' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'product' && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <Link
                    href="/dashboard"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <LayoutDashboard className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Executive Dashboard
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Real-time KPI metrics & health status
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/projects"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <FolderKanban className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Projects Scope Engine
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Multi-project management & tracking
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/tasks"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <CheckSquare className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Task Lifecycle
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Dependencies & sprint allocations
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* AI Intelligence Direct Link */}
            <a
              href="#ai"
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900 rounded-lg transition-colors"
            >
              AI Intelligence
            </a>

            {/* Features Direct Link */}
            <a
              href="#features"
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900 rounded-lg transition-colors"
            >
              Features
            </a>

            {/* How It Works Link */}
            <a
              href="#workflow"
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900 rounded-lg transition-colors"
            >
              How It Works
            </a>

            {/* Decision Support Link */}
            <a
              href="#health"
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900 rounded-lg transition-colors"
            >
              Decision Support
            </a>
          </nav>

          {/* Right Actions: Theme Toggle & Sign In / Get Started */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isDark ? (
                <Sun className="h-4.5 w-4.5 text-amber-400" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-600" />
              )}
            </button>

            <Link href="/login" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/register">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>

            {/* Mobile Sheet Navigation Trigger */}
            <div className="flex items-center md:hidden ml-1">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-[300px] sm:w-[340px] max-w-[85vw] flex flex-col justify-between overflow-y-auto">
                  <div className="p-5 space-y-5">
                    {/* Brand Header & Theme Switch */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            AIPMS
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            Decision Intelligence
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {isDark ? (
                          <Sun className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Moon className="h-4 w-4 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* Platform Workspaces Section */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                        Platform Workspaces
                      </span>
                      <nav className="space-y-0.5">
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>Executive Dashboard</span>
                        </Link>
                        <Link
                          href="/projects"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FolderKanban className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Projects Scope Engine</span>
                        </Link>
                        <Link
                          href="/tasks"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <CheckSquare className="h-4 w-4 text-purple-600 shrink-0" />
                          <span>Task Lifecycle & Kanban</span>
                        </Link>
                        <Link
                          href="/sprints"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Sprint Velocity & Goals</span>
                        </Link>
                        <Link
                          href="/risks"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>Risk Matrix & Radar</span>
                        </Link>
                      </nav>
                    </div>

                    {/* Page Anchors Section */}
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                        Features & Methodology
                      </span>
                      <nav className="space-y-0.5">
                        <a
                          href="#ai"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block p-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          AI Intelligence
                        </a>
                        <a
                          href="#features"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block p-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          Features Overview
                        </a>
                        <a
                          href="#workflow"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block p-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          How It Works
                        </a>
                        <a
                          href="#health"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block p-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          Decision Support Pattern
                        </a>
                      </nav>
                    </div>
                  </div>

                  {/* Auth Actions in Drawer Footer */}
                  <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
                      <Button variant="outline" className="w-full justify-center text-xs font-semibold h-10 rounded-xl">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
                      <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 rounded-xl shadow-xs">
                        <span>Get Started Free</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative pt-12 sm:pt-20 pb-16 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/10 dark:bg-blue-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Value Proposition */}
            <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6">
              {/* Category Pill */}
              <Badge variant="info" className="gap-1.5 py-1 px-3">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>AI-Powered Project Decision Support</span>
              </Badge>

              {/* Display Headline using Calistoga font */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-[1.12] tracking-tight">
                Turn project data into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                  predictive intelligence
                </span>{' '}
                and decisive action.
              </h1>

              {/* Supporting Paragraph */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal max-w-xl">
                AIPMS helps software teams understand project health, identify hidden bottlenecks and risks early, and make evidence-based decisions before delays occur.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full sm:w-auto">
                <Button
                  size="lg"
                  onClick={() => router.push('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/20 gap-2 cursor-pointer"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 cursor-pointer"
                >
                  <span>Explore Platform</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </Button>
              </div>

              {/* Key Trust Checkmarks */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Real-time Risk Evaluation</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Closed-loop Intelligence</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Product Preview Card */}
            <div className="lg:col-span-6 w-full">
              <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 space-y-4">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-mono text-xs text-slate-400 dark:text-slate-500">
                      aipms-dashboard-v2.1
                    </span>
                  </div>
                  <Badge variant="success" className="gap-1">
                    <Activity className="h-3 w-3" />
                    <span>Health Score: 88%</span>
                  </Badge>
                </div>

                {/* Simulated KPI Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      Active Projects
                    </span>
                    <span className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white block truncate">
                      12
                    </span>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      Tasks Completed
                    </span>
                    <span className="text-sm sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                      148 / 180
                    </span>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      Open Risks
                    </span>
                    <span className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 block truncate">
                      3 High
                    </span>
                  </div>
                </div>

                {/* AI Early Warning Card */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>AI Decision Support Notice</span>
                    </div>
                    <span className="font-mono text-[10px] font-medium text-blue-600 dark:text-blue-400">
                      CONFIDENCE: HIGH
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      Evidence:
                    </strong>{' '}
                    3 overdue API tasks are blocking Sprint 4 delivery.{' '}
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      Recommendation:
                    </strong>{' '}
                    Reallocate 2 backend developers from Payments Scope to Sprint 4 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PRODUCT PREVIEW MOCKUP SECTION */}
        <section className="py-12 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
            <div className="max-w-2xl mx-auto space-y-3">
              <Badge variant="secondary" className="px-3 py-1">
                EXECUTIVE WORKSPACE
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                Designed for speed, clarity, and control.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                A single unified workspace connecting projects, tasks, sprints, risks, and intelligent executive briefs.
              </p>
            </div>

            {/* Full Browser Frame Mockup */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl max-w-5xl mx-auto overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl text-xs text-slate-400 font-mono">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-4 truncate">https://app.aipms.com/dashboard</span>
              </div>
              <div className="p-6 space-y-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Executive Overview
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time delivery progress & risk metrics
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-800/60">
                      LIVE STREAM ACTIVE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium block">Total Projects</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">24</span>
                    <span className="text-[11px] text-emerald-600 font-semibold block mt-1">↑ 4 active this month</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium block">Sprint Progress</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">92%</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Sprint 14 on schedule</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium block">Open Tasks</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">312</span>
                    <span className="text-[11px] text-slate-400 block mt-1">42 pending review</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium block">Risk Exposure</span>
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">Low</span>
                    <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Mitigation in place</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. AI INTELLIGENCE SECTION (#ai) */}
        <section id="ai" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="info" className="px-3 py-1">
              THE AIPMS DIFFERENCE
            </Badge>
            <h2 className="font-display text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight">
              AI Decision Support, not chatbot distraction.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              AIPMS transforms raw project activity into deterministic evidence, clear analysis, actionable recommendations, and executable steps.
            </p>
          </div>

          {/* AI Flow Concept Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Project Health & Early Warnings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Detect delivery delays and dependency blockers before they impact release deadlines.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What-If Scenario Simulation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Simulate task reallocation and deadline shifts to project resource bottlenecks in real-time.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                <FileBarChart2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Executive Briefs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate concise, evidence-based summaries for stakeholders in seconds.
              </p>
            </Card>
          </div>
        </section>

        {/* 5. CORE PROJECT MANAGEMENT SECTION (#features) */}
        <section id="features" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Badge variant="secondary" className="px-3 py-1">
                CORE CAPABILITIES
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                Everything software teams need to deliver.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 space-y-3">
                <FolderKanban className="h-6 w-6 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Projects Scope Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Manage multi-project scopes, budgets, and milestones with strict status tracking.
                </p>
              </Card>

              <Card className="p-6 space-y-3">
                <CheckSquare className="h-6 w-6 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Task Lifecycle & Kanban
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Track status, assignees, priorities, and dependency chains cleanly across teams.
                </p>
              </Card>

              <Card className="p-6 space-y-3">
                <Users className="h-6 w-6 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Team Workload Balancing
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Monitor capacity and workload distribution to prevent burnout and bottlenecks.
                </p>
              </Card>

              <Card className="p-6 space-y-3">
                <Zap className="h-6 w-6 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sprint Velocity & Goals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Define sprint goals, track burndown progress, and measure velocity accurately.
                </p>
              </Card>

              <Card className="p-6 space-y-3">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Probability × Impact Risk Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Evaluate risks systematically with severity scoring and mitigation plans.
                </p>
              </Card>

              <Card className="p-6 space-y-3">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Executive Reports
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Analytical reporting suite with exportable summaries for leadership.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* 6. INTELLIGENT WORKFLOW SECTION (#workflow) */}
        <section id="workflow" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="info" className="px-3 py-1">
              CLOSED-LOOP INTELLIGENCE
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
              How AIPMS drives continuous project success.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['PLAN', 'ASSIGN', 'TRACK', 'ANALYZE', 'PREDICT', 'ACT'].map((step, idx) => (
              <div key={step} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  STEP 0{idx + 1}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. PROJECT HEALTH DECISION SUPPORT (#health) */}
        <section id="health" className="py-20 bg-slate-900 text-white rounded-3xl max-w-7xl mx-4 sm:mx-6 lg:mx-auto p-8 sm:p-12 space-y-8">
          <div className="max-w-3xl space-y-4">
            <Badge variant="info" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              DECISION SUPPORT PATTERN
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
              Evidence → Analysis → Recommendation → Action
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              AIPMS never presents vague advice. Every insight cites specific task records and provides an actionable next step.
            </p>
          </div>
        </section>

        {/* 10. FINAL CTA SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 p-10 sm:p-16 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
            <h2 className="font-display text-3xl sm:text-5xl text-white tracking-tight">
              Ready to run projects with predictive confidence?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Join teams using AIPMS for closed-loop project management and real-time AI decision support.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => router.push('/register')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 cursor-pointer"
              >
                Get Started Free
              </Button>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 11. FOOTER */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">AIPMS</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              AI-Based Project Management System. Closed-loop project health monitoring & decision support.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block">
              Product
            </span>
            <Link href="/dashboard" className="block hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/projects" className="block hover:text-blue-600">
              Projects Engine
            </Link>
            <Link href="/tasks" className="block hover:text-blue-600">
              Tasks Lifecycle
            </Link>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block">
              AI Intelligence
            </span>
            <a href="#ai" className="block hover:text-blue-600">
              Decision Support
            </a>
            <a href="#workflow" className="block hover:text-blue-600">
              How It Works
            </a>
            <a href="#health" className="block hover:text-blue-600">
              Project Health
            </a>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block">
              Account
            </span>
            <Link href="/login" className="block hover:text-blue-600">
              Sign In
            </Link>
            <Link href="/register" className="block hover:text-blue-600">
              Create Account
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <span>© 2026 AIPMS Inc. All rights reserved.</span>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Enterprise Security & Closed-Loop Analytics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
