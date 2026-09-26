import Link from 'next/link';
import {
  Sparkles,
  LayoutDashboard,
  LogIn,
  UserPlus,
  FolderKanban,
  Zap,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Top Navbar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-slate-800 px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">AIPMS</span>
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono text-[10px]">
            Enterprise Platform
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <LogIn className="mr-1.5 h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Register
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-6 py-12 md:px-12 md:py-20 max-w-6xl mx-auto w-full flex flex-col justify-center">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 px-3 py-1 text-xs">
            Next.js App Router + NestJS Microservices Architecture
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100">
            AI-Based Project Management System
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            A production-grade, microservice-driven project management platform designed for modern software teams, task dependencies, risk management, and intelligent reporting.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 shadow-lg shadow-blue-600/25">
                <LayoutDashboard className="h-5 w-5" />
                Launch Application Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
                <LogIn className="h-5 w-5 mr-2 text-slate-400" />
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Platform Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="bg-slate-800/60 border-slate-700 text-slate-100">
            <CardHeader>
              <FolderKanban className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-lg text-white">Microservice Architecture</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Independent backend services for Auth, Projects, Teams, Tasks, Sprints, Risks, and Reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300">
              Communicates securely through an API Gateway entry point on port 3000.
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700 text-slate-100">
            <CardHeader>
              <Zap className="h-8 w-8 text-amber-400 mb-2" />
              <CardTitle className="text-lg text-white">Sprint & Risk Engine</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Manage agile sprint lifecycles, task priority scores, dependency graphs, and probability-impact risk matrices.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300">
              Real-time matrix analysis and project completion metrics.
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700 text-slate-100">
            <CardHeader>
              <Cpu className="h-8 w-8 text-emerald-400 mb-2" />
              <CardTitle className="text-lg text-white">AI-Assisted Insights</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Automated project health evaluation, blocker detection, and reporting analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-300">
              Designed for B.Tech SEPM production milestone standards.
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500">
        AIPMS Platform Foundation • SEPM Milestone Architecture
      </footer>
    </div>
  );
}
