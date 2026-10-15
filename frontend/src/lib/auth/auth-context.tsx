'use client';

import * as React from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import {
  authStorage,
  type AuthUser,
  type AuthSession,
} from '@/lib/auth/auth-storage';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  message: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  switchRole: (role: import('@/lib/auth/auth-storage').Role) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ message: string }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Restore session on initial application load
  React.useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedSession = authStorage.getSession();

      if (!storedSession || !storedSession.accessToken) {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Optimistically set the stored user and session
      if (isMounted) {
        setSession(storedSession);
        setUser(storedSession.user);
      }

      try {
        // Validate and refresh user profile with backend
        const currentUser = await apiClient.get<AuthUser>('auth/me', {
          token: storedSession.accessToken,
        });

        if (isMounted) {
          setUser(currentUser);
          // Sync refreshed user info to storage
          const updatedSession: AuthSession = {
            ...storedSession,
            user: currentUser,
          };
          authStorage.saveSession(updatedSession);
          setSession(updatedSession);
        }
      } catch (err) {
        // If 401 Unauthorized or invalid session, clear local session
        if (err instanceof ApiError && err.status === 401) {
          authStorage.clearSession();
          if (isMounted) {
            setSession(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = React.useCallback(async (credentials: LoginCredentials) => {
    const data = await apiClient.post<AuthSession>('auth/login', credentials, {
      token: null,
    });

    const newSession: AuthSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      user: data.user,
    };

    authStorage.saveSession(newSession);
    setSession(newSession);
    setUser(newSession.user);
  }, []);

  const register = React.useCallback(async (data: RegisterData) => {
    return apiClient.post<RegisterResult>('auth/register', data, {
      token: null,
    });
  }, []);

  const logout = React.useCallback(async () => {
    const currentToken = session?.accessToken || authStorage.getToken();
    if (currentToken) {
      try {
        await apiClient.post<{ message: string }>('auth/logout', undefined, {
          token: currentToken,
        });
      } catch {
        // Ignore errors during logout (e.g. expired tokens)
      }
    }

    authStorage.clearSession();
    setSession(null);
    setUser(null);
  }, [session]);

  const refreshUser = React.useCallback(async (): Promise<AuthUser | null> => {
    const currentToken = session?.accessToken || authStorage.getToken();
    if (!currentToken) {
      return null;
    }

    try {
      const currentUser = await apiClient.get<AuthUser>('auth/me', {
        token: currentToken,
      });
      setUser(currentUser);
      if (session) {
        const updated = { ...session, user: currentUser };
        authStorage.saveSession(updated);
        setSession(updated);
      }
      return currentUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        authStorage.clearSession();
        setSession(null);
        setUser(null);
      }
      return null;
    }
  }, [session]);

  const switchRole = React.useCallback(
    (newRole: import('@/lib/auth/auth-storage').Role) => {
      if (!user) return;
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      if (session) {
        const updatedSession = { ...session, user: updatedUser };
        authStorage.saveSession(updatedSession);
        setSession(updatedSession);
      }
    },
    [user, session],
  );

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      const currentToken = session?.accessToken || authStorage.getToken();
      if (!currentToken) {
        throw new Error('You must be signed in to change your password.');
      }
      return authApi.changePassword({ currentPassword, newPassword }, currentToken);
    },
    [session],
  );

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      session,
      token: session?.accessToken || null,
      isLoading,
      isAuthenticated: Boolean(session?.accessToken && user),
      login,
      register,
      logout,
      refreshUser,
      switchRole,
      changePassword,
    }),
    [user, session, isLoading, login, register, logout, refreshUser, switchRole, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
