'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI Foundation placeholder
    alert('UI Foundation: Authentication integration will connect to API Gateway /api/auth/login in the next milestone.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign in to AIPMS
          </h1>
          <p className="text-sm text-slate-400">
            Enter your credentials to access your project management workspace
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-950 text-slate-100 shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white">Account Login</CardTitle>
              <CardDescription className="text-slate-400">
                AI-Based Project Management System
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300" htmlFor="email">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                    Password
                  </label>
                  <span className="text-[11px] text-blue-400 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>

              <div className="text-center text-xs text-slate-400">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-blue-400 hover:underline inline-flex items-center gap-0.5">
                  Register here
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
