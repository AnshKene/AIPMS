'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [tokenDetected, setTokenDetected] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  // Extract recovery access token from URL hash or query params
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.resolve().then(() => {
      let token: string | null = null;

      // Supabase redirects with hash fragment: #access_token=...&type=recovery
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        token = hashParams.get('access_token');
      }

      // Fallback to query params: ?token=... or ?access_token=...
      if (!token && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        token = searchParams.get('access_token') || searchParams.get('token');
      }

      if (token) {
        setAccessToken(token);
        // Scrub sensitive recovery token from browser URL address bar to prevent history/referrer leakage
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // ignore in restricted environments
        }
      }
      setTokenDetected(true);
    });
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-200 dark:bg-slate-700', width: 'w-0' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', width: 'w-1/4' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-rose-400', width: 'w-1/6' };
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setConfirmError(null);
    setStatusMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    if (!accessToken) {
      setStatusMessage({
        type: 'error',
        text: 'Missing recovery token. Please request a new password reset email.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.resetPassword({
        accessToken,
        password: newPassword,
      });

      setStatusMessage({
        type: 'success',
        text: res.message || 'Your password has been successfully updated.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Password reset link has expired or is invalid. Please request a new link.',
        });
      } else if (err instanceof Error) {
        setStatusMessage({ type: 'error', text: err.message });
      } else {
        setStatusMessage({ type: 'error', text: 'An unexpected error occurred during password reset.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-6 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              AIPMS
            </span>
            <span className="text-[10px] font-bold text-slate-400 -mt-1 uppercase tracking-wider">
              Autonomous Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Set New Password
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Create a strong, secure password for your AIPMS enterprise account.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Token not detected warning */}
              {tokenDetected && !accessToken && !statusMessage && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>No Active Reset Token Found</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                    If you reached this page directly, please check your inbox and click the reset link sent by AIPMS. Alternatively, you can request a fresh link below.
                  </p>
                  <Link href="/login" className="inline-block pt-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Return to login and request reset link →
                  </Link>
                </div>
              )}

              {/* Status Message Alert */}
              {statusMessage && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-2 border ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {statusMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span>
                      {statusMessage.type === 'success' ? 'Password Reset Successful' : 'Reset Failed'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{statusMessage.text}</p>

                  {statusMessage.type === 'success' && (
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  )}
                </div>
              )}

              {/* Password Form (only when not succeeded) */}
              {statusMessage?.type !== 'success' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password Field */}
                  <FormField
                    label="New Password"
                    id="new-password"
                    errorText={passwordError || undefined}
                  >
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="At least 8 characters"
                        required
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="pt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">Password strength</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`}
                          />
                        </div>
                      </div>
                    )}
                  </FormField>

                  {/* Confirm Password Field */}
                  <FormField
                    label="Confirm New Password"
                    id="confirm-password"
                    errorText={confirmError || undefined}
                  >
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) setConfirmError(null);
                        }}
                        placeholder="Repeat new password"
                        required
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting || !accessToken}
                    className="w-full h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                  >
                    <span>Update Password</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 py-3 text-center text-xs text-slate-500">
              <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Back to Sign In
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
