'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  BarChart2,
  Users,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, FormField } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Field validation states
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [forgotPasswordInfo, setForgotPasswordInfo] = React.useState<string | null>(null);

  // Forgot Password modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotEmailError, setForgotEmailError] = React.useState<string | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = React.useState(false);
  const [forgotStatus, setForgotStatus] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Theme toggle state
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

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

  // Redirect if authenticated
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordInfo(null);

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setFormError('Invalid email or password. Please verify your credentials.');
          setPasswordError('Check email and password.');
        } else if (error.status === 503) {
          setFormError('Authentication service is currently unavailable. Please try again later.');
        } else {
          setFormError(error.message || 'Login failed. Please check your credentials.');
        }
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('An unexpected error occurred during authentication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotEmailError(null);
    setForgotStatus(null);

    const emailTrimmed = forgotEmail.trim();
    if (!emailTrimmed) {
      setForgotEmailError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setForgotEmailError('Please enter a valid email address.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const res = await authApi.forgotPassword(emailTrimmed, origin);
      setForgotStatus({
        type: 'success',
        text: res.message || 'If an account exists for this email address, password recovery instructions have been dispatched.',
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setForgotStatus({
          type: 'error',
          text: err.message || 'Failed to dispatch password recovery email. Please check your credentials.',
        });
      } else if (err instanceof Error) {
        setForgotStatus({ type: 'error', text: err.message });
      } else {
        setForgotStatus({ type: 'error', text: 'An unexpected error occurred during password recovery.' });
      }
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">Restoring AIPMS Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* 1. TOP BRAND NAVIGATION HEADER */}
      <header className="flex items-center justify-between max-w-7xl w-full mx-auto pb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0052FF] text-white shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition-all">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">AIPMS</span>
            <span className="text-[10px] text-slate-500 font-mono">Decision Intelligence</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs"
        >
          {isDark ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
        </button>
      </header>

      {/* 2. MAIN TWO-COLUMN LAYOUT */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center my-auto py-4 sm:py-8">
        {/* LEFT COLUMN: BRAND & PRODUCT VALUE PROPOSITION */}
        <div className="lg:col-span-6 flex flex-col items-start text-left max-w-xl">
          <Badge variant="tech" className="mb-4">
            CLOSED-LOOP INTELLIGENCE
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif mb-4">
            Proactive project intelligence <br />
            <span className="text-[#0052FF] dark:text-[#4D7CFF]">when it matters most.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            Sign in to access real-time project health scoring, automated risk warnings, sprint velocity analysis, and AI-powered recommendations.
          </p>

          {/* Feature Highlights */}
          <div className="space-y-3 mb-8 w-full">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052FF] dark:text-[#4D7CFF] flex items-center justify-center shrink-0">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Closed-Loop Project Telemetry</span>
                <span className="text-[11px] text-slate-500">Track tasks, sprint velocity, and dependency blockages.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Early Warning Risk Radar</span>
                <span className="text-[11px] text-slate-500">Detect resource bottlenecks before deadlines slip.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Executive Decision Support</span>
                <span className="text-[11px] text-slate-500">Actionable sprint insights for engineering managers.</span>
              </div>
            </div>
          </div>

          {/* Product Preview Snippet Card */}
          <div className="hidden sm:flex flex-col gap-2.5 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-md w-full backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM TELEMETRY
              </span>
              <Badge variant="success">94% Health Index</Badge>
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                0 Critical Risk Blockers
              </span>
              <span className="font-mono text-[10px] text-slate-400">PROJ-2026</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION CARD */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end w-full">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Sign In to AIPMS
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Form Level Error Alert */}
              {formError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed">{formError}</span>
                </div>
              )}

              {/* Forgot Password Info Alert */}
              {forgotPasswordInfo && (
                <div role="status" className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-400">
                  <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span className="leading-relaxed">{forgotPasswordInfo}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <FormField
                  label="Email Address"
                  id="login-email"
                  errorText={emailError || undefined}
                >
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="name@company.com"
                      disabled={isSubmitting}
                      autoComplete="email"
                      required
                      error={Boolean(emailError)}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? 'login-email-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                </FormField>

                {/* Password Input */}
                <FormField
                  label="Password"
                  id="login-password"
                  errorText={passwordError || undefined}
                >
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      required
                      error={Boolean(passwordError)}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? 'login-password-error' : undefined}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotEmailError(null);
                      setForgotStatus(null);
                      setIsForgotModalOpen(true);
                    }}
                    className="font-semibold text-[#0052FF] dark:text-[#4D7CFF] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full h-11 text-xs font-bold bg-[#0052FF] hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isSubmitting ? (
                    'Signing In...'
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-bold text-[#0052FF] dark:text-[#4D7CFF] hover:underline"
                >
                  Create account
                </Link>
              </div>

              {/* Security Shield Banner */}
              <div className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#0052FF] shrink-0" />
                <span className="text-[11px] leading-tight">
                  Protected by 256-bit SSL encryption & strict RBAC authorization.
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="max-w-7xl w-full mx-auto pt-6 text-center text-xs text-slate-400 font-mono">
        © 2026 AIPMS • AI-Based Project Management System
      </footer>

      {/* 4. FORGOT PASSWORD DIALOG */}
      <Dialog open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Lock className="h-4 w-4" />
            </div>
            <span>Reset Your Password</span>
          </DialogTitle>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your registered enterprise email address. We will dispatch a secure link to reset your account credentials.
          </p>

          {forgotStatus && (
            <div
              className={`p-3.5 mt-3 rounded-xl text-xs space-y-1.5 border ${
                forgotStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {forgotStatus.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>
                  {forgotStatus.type === 'success' ? 'Instructions Dispatched' : 'Request Failed'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">{forgotStatus.text}</p>
            </div>
          )}

          {forgotStatus?.type !== 'success' ? (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5 mt-4">
              <FormField
                label="Registered Work Email"
                id="forgot-email"
                errorText={forgotEmailError || undefined}
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotEmailError) setForgotEmailError(null);
                    }}
                    placeholder="name@company.com"
                    className="pl-9 text-xs"
                    autoComplete="email"
                    required
                  />
                </div>
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isForgotSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs px-4"
                >
                  <span>Send Recovery Link</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 pt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsForgotModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

