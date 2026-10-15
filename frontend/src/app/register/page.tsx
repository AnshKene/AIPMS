'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Sun,
  Moon,
  Users,
  FolderPlus,
  Zap,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, FormField } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import { ApiError } from '@/lib/api/client';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [agreeTerms, setAgreeTerms] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Field validation states
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = React.useState<string | null>(null);
  const [termsError, setTermsError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Theme state
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

  // Dynamic password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Required', color: 'bg-slate-200 dark:bg-slate-800', width: 'w-0' };
    if (pwd.length < 6) return { label: 'Too short (min 6)', color: 'bg-rose-500', width: 'w-1/4' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd) && pwd.length >= 10) score++;

    if (score >= 2) return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
    if (score === 1) return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
    return { label: 'Weak', color: 'bg-rose-500', width: 'w-1/3' };
  };

  const passwordStrength = getPasswordStrength(password);



  const validateForm = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setTermsError(null);
    setFormError(null);

    if (!name.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    }

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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    if (!agreeTerms) {
      setTermsError('You must agree to the Terms of Service and Privacy Policy.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setSuccessMessage(
        result.message || 'Account created successfully! Redirecting to sign in...',
      );

      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setFormError('An account with this email address already exists.');
          setEmailError('Email already registered.');
        } else if (error.status === 503) {
          setFormError('Authentication service is currently unavailable. Please try again later.');
        } else {
          setFormError(error.message || 'Registration failed. Please verify your details.');
        }
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('An unexpected error occurred during registration.');
      }
    } finally {
      setIsSubmitting(false);
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
        {/* LEFT COLUMN: BRAND & VALUE PROPOSITION */}
        <div className="lg:col-span-6 flex flex-col items-start text-left max-w-xl">
          <Badge variant="tech" className="mb-4">
            JOIN AIPMS WORKSPACE
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif mb-4">
            Build better projects, <br />
            <span className="text-[#0052FF] dark:text-[#4D7CFF]">with AI intelligence.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            Create your account to start managing projects, tracking sprints, evaluating risks, and making data-backed decisions.
          </p>

          {/* Benefits List */}
          <div className="space-y-3 mb-8 w-full">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052FF] dark:text-[#4D7CFF] flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Set Up in Seconds</span>
                <span className="text-[11px] text-slate-500">Zero configuration onboarding into your organization.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FolderPlus className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Collaborative Workspaces</span>
                <span className="text-[11px] text-slate-500">Assign team members to projects and sprint goals.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Automated Risk Scoring</span>
                <span className="text-[11px] text-slate-500">Categorize risks by probability & financial impact.</span>
              </div>
            </div>
          </div>

          {/* Decorative Security Badge */}
          <div className="hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 w-full shadow-xs">
            <Zap className="h-4 w-4 text-[#0052FF] shrink-0" />
            <span className="text-[11px]">
              Default role assignment is securely enforced via backend authorization policy.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: REGISTRATION CARD */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end w-full">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Create Your Account
              </CardTitle>
              <CardDescription>
                Join AIPMS and access AI-powered decision support.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5">
              {/* Form Level Error Alert */}
              {formError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed">{formError}</span>
                </div>
              )}

              {/* Form Level Success Alert */}
              {successMessage && (
                <div role="status" className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Input */}
                <FormField
                  label="Full Name"
                  id="register-name"
                  errorText={nameError || undefined}
                >
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="register-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="John Doe"
                      disabled={isSubmitting || Boolean(successMessage)}
                      autoComplete="name"
                      required
                      error={Boolean(nameError)}
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? 'register-name-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                </FormField>

                {/* Email Input */}
                <FormField
                  label="Email Address"
                  id="register-email"
                  errorText={emailError || undefined}
                >
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="name@company.com"
                      disabled={isSubmitting || Boolean(successMessage)}
                      autoComplete="email"
                      required
                      error={Boolean(emailError)}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? 'register-email-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                </FormField>

                {/* Password Input */}
                <FormField
                  label="Password"
                  id="register-password"
                  errorText={passwordError || undefined}
                >
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Create a password"
                      disabled={isSubmitting || Boolean(successMessage)}
                      autoComplete="new-password"
                      required
                      error={Boolean(passwordError)}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? 'register-password-error' : undefined}
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

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span>
                        Strength:{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {passwordStrength.label}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">Min 6 characters</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-200`}
                      />
                    </div>
                  </div>
                )}

                {/* Confirm Password Input */}
                <FormField
                  label="Confirm Password"
                  id="register-confirm-password"
                  errorText={confirmPasswordError || undefined}
                >
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                      }}
                      placeholder="Confirm your password"
                      disabled={isSubmitting || Boolean(successMessage)}
                      autoComplete="new-password"
                      required
                      error={Boolean(confirmPasswordError)}
                      aria-invalid={Boolean(confirmPasswordError)}
                      aria-describedby={
                        confirmPasswordError ? 'register-confirm-password-error' : undefined
                      }
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                {/* Terms & Conditions Checkbox */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (termsError) setTermsError(null);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF] cursor-pointer mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      I agree to the{' '}
                      <span className="font-bold text-[#0052FF] dark:text-[#4D7CFF] hover:underline">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="font-bold text-[#0052FF] dark:text-[#4D7CFF] hover:underline">
                        Privacy Policy
                      </span>
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-[11px] font-medium text-rose-500">{termsError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={Boolean(successMessage)}
                  className="w-full h-11 text-xs font-bold bg-[#0052FF] hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isSubmitting ? (
                    'Creating Account...'
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-bold text-[#0052FF] dark:text-[#4D7CFF] hover:underline"
                >
                  Sign in
                </Link>
              </div>

              {/* Security Shield Banner */}
              <div className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#0052FF] shrink-0" />
                <span className="text-[11px] leading-tight">
                  All accounts receive default member access under system RBAC policy.
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
    </div>
  );
}

