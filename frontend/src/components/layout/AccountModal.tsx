'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Settings,
  Lock,
  Bell,
  Sun,
  Moon,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Laptop,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

export type AccountTab = 'profile' | 'password' | 'settings' | 'notifications';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AccountTab;
}

export function AccountModal({
  open,
  onOpenChange,
  initialTab = 'profile',
}: AccountModalProps) {
  const router = useRouter();
  const { user, logout, changePassword } = useAuth();
  const [userSelectedTab, setUserSelectedTab] = React.useState<AccountTab | null>(null);
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setUserSelectedTab(null);
    }
  }

  const activeTab = userSelectedTab ?? initialTab;
  const setActiveTab = (tab: AccountTab) => setUserSelectedTab(tab);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = React.useState(false);
  const [passwordStatus, setPasswordStatus] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  // Notification toggles state
  const [notifyRisks, setNotifyRisks] = React.useState(true);
  const [notifySprints, setNotifySprints] = React.useState(true);
  const [notifyDigest, setNotifyDigest] = React.useState(false);

  // Theme toggle state
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPasswordStatus(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    onOpenChange(newOpen);
  };

  const setTheme = (mode: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      const nextDark = mode === 'dark';
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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      onOpenChange(false);
      router.replace('/login');
    } catch {
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'Current password is required to verify your identity.',
      });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'New password cannot be identical to your current password.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'Passwords do not match.',
      });
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setPasswordStatus({
        type: 'success',
        message: res.message || 'Password successfully updated.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Password update failed.',
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'AS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatRole = (role?: string) => {
    if (!role) return 'USER';
    return role.replace(/_/g, ' ');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 sm:max-w-2xl md:max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <DialogTitle className="sr-only">Account & Workspace Settings</DialogTitle>

        {/* 2-Column Professional Settings Layout */}
        <div className="flex flex-col md:flex-row min-h-[460px]">
          {/* Left Navigation Rail */}
          <div className="w-full md:w-56 bg-slate-50/70 dark:bg-slate-800/40 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              {/* User Mini Profile Badge */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <Avatar
                  className="h-9 w-9 border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                  fallback={getInitials(user?.name)}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name || 'AIPMS Admin'}
                  </h3>
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase">
                    {formatRole(user?.role)}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1" aria-label="Settings Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                    activeTab === 'profile'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                    activeTab === 'password'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Security & Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                    activeTab === 'settings'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Preferences</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                    activeTab === 'notifications'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  <Bell className="h-4 w-4 shrink-0" />
                  <span>Notifications</span>
                </button>
              </nav>
            </div>

            {/* Sign Out Button in Rail */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors disabled:opacity-50 text-left"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <LogOut className="h-4 w-4 shrink-0" />
                )}
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 p-6 relative overflow-y-auto max-h-[520px]">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    User Profile
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your account identity and role configuration in AIPMS.
                  </p>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <Avatar
                    className="h-14 w-14 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-700 dark:text-blue-300 font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs"
                    fallback={getInitials(user?.name)}
                  />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {user?.name || 'AIPMS Administrator'}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.email || 'admin@aipms.com'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Active Session</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Full Name</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                      {user?.name || 'AIPMS Administrator'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Email Address</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                      {user?.email || 'admin@aipms.com'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Workspace Role</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatRole(user?.role)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Session ID</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 block truncate">
                      {user?.id || 'session-authenticated-token'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Security & Password */}
            {activeTab === 'password' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Password & Security
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your account authentication credentials securely via Supabase Auth.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-9 shadow-inner"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label="Toggle current password visibility"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-9 shadow-inner"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label="Toggle new password visibility"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Live Password Strength Meter */}
                    {newPassword && (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">Security strength</span>
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
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-9 shadow-inner"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {passwordStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        passwordStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {passwordStatus.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <span>{passwordStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {passwordSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Preferences & Appearance */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Preferences & Appearance
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize your visual theme and workspace interaction defaults.
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Theme Mode
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        !isDark
                          ? 'border-blue-600 bg-blue-50/50 text-blue-600 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
                      )}
                    >
                      <Sun className="h-6 w-6 mb-2 text-amber-500" />
                      <span>Light Theme</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        isDark
                          ? 'border-blue-600 bg-blue-950/40 text-blue-400 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
                      )}
                    >
                      <Moon className="h-6 w-6 mb-2 text-indigo-400" />
                      <span>Dark Theme</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Laptop className="h-4 w-4 text-blue-600" />
                    <span>Cross-Device Synchronization</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Your theme and sidebar preferences are stored locally and synced across session refreshes.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Notification Preferences
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure high-priority event alerts and operational digests.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        High Priority Risks
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Receive instant alerts when a risk score reaches 6 or higher.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyRisks}
                      onChange={(e) => setNotifyRisks(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Sprint Iteration Deadlines
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Alert 3 days prior to active sprint completion.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifySprints}
                      onChange={(e) => setNotifySprints(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Weekly Executive Summary
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Receive automated AI delivery intelligence report every Monday.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyDigest}
                      onChange={(e) => setNotifyDigest(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
