/**
 * Authentication Storage Abstraction
 * Handles storing, retrieving, and clearing session tokens and user data.
 * Isolated from React components and safe for Next.js SSR.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  user: AuthUser;
}

const STORAGE_KEY = 'aipms_auth_session';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;

    // Validate structure
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken.length > 0 &&
      parsed.user &&
      typeof parsed.user === 'object' &&
      typeof parsed.user.id === 'string' &&
      typeof parsed.user.email === 'string'
    ) {
      return parsed;
    }

    // Malformed session found, clean it up
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage access blocked or unavailable
    }
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Handle storage quota or private browsing exceptions safely
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Handle storage exceptions safely
  }
}

export function getStoredToken(): string | null {
  const session = getStoredSession();
  return session ? session.accessToken : null;
}

export const authStorage = {
  getSession: getStoredSession,
  saveSession: saveStoredSession,
  clearSession: clearStoredSession,
  getToken: getStoredToken,
};
