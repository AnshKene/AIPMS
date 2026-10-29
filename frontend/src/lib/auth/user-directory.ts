/**
 * AIPMS User Directory & Resolution Service
 * Provides centralized resolution, caching, reactive synchronization, and display
 * formatting for system users, project members, and assignees across the frontend application.
 *
 * Authoritative Principles:
 * 1. Only real authenticated system accounts returned from the server (Supabase Auth)
 *    are permitted in the active directory cache.
 * 2. Hardcoded/seeded fallback identities are strictly limited to non-authoritative display
 *    resolution (for rendering historical legacy references) and are NEVER exposed as selectable/assignable users.
 * 3. Deleted user accounts are tracked with persistent session tombstones to strictly guarantee
 *    that deleted accounts never reappear after page reload.
 * 4. Inactive accounts are excluded from active user lists (getActiveKnownUsers).
 */

'use client';

import * as React from 'react';
import { DESIGNATED_ADMIN_ID, DESIGNATED_ADMIN_EMAIL } from './auth-storage';
import { authApi } from '../api/auth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  deactivatedAt?: string | null;
  avatarUrl?: string;
}

export interface UserUpdateInput {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  deactivatedAt?: string | null;
  avatarUrl?: string;
}

export const SEEDED_USER_IDS = {
  ADMIN: 'a1111111-1111-4111-8111-111111111111',
  PM: 'b2222222-2222-4222-8222-222222222222',
  MEMBER: 'c3333333-3333-4333-8333-333333333333',
  VIEWER: 'd4444444-4444-4444-8444-444444444444',
} as const;

// Static display-only fallbacks for legacy/historical references (NEVER exposed in active selection lists)
const STATIC_DISPLAY_FALLBACKS = new Map<string, UserProfile>([
  [
    SEEDED_USER_IDS.ADMIN,
    {
      id: SEEDED_USER_IDS.ADMIN,
      name: 'System Admin',
      email: 'admin@aipms.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  ],
  [
    SEEDED_USER_IDS.PM,
    {
      id: SEEDED_USER_IDS.PM,
      name: 'Alex Rivera (PM)',
      email: 'pm@aipms.com',
      role: 'PROJECT_MANAGER',
      status: 'ACTIVE',
    },
  ],
  [
    SEEDED_USER_IDS.MEMBER,
    {
      id: SEEDED_USER_IDS.MEMBER,
      name: 'Sarah Chen (Dev)',
      email: 'member@aipms.com',
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    },
  ],
  [
    SEEDED_USER_IDS.VIEWER,
    {
      id: SEEDED_USER_IDS.VIEWER,
      name: 'David Kim (Stakeholder)',
      email: 'viewer@aipms.com',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  ],
  [
    'admin-user-001',
    {
      id: SEEDED_USER_IDS.ADMIN,
      name: 'System Admin',
      email: 'admin@aipms.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  ],
  [
    'pm-user-002',
    {
      id: SEEDED_USER_IDS.PM,
      name: 'Alex Rivera (PM)',
      email: 'pm@aipms.com',
      role: 'PROJECT_MANAGER',
      status: 'ACTIVE',
    },
  ],
  [
    'member-user-003',
    {
      id: SEEDED_USER_IDS.MEMBER,
      name: 'Sarah Chen (Dev)',
      email: 'member@aipms.com',
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    },
  ],
  [
    'viewer-user-004',
    {
      id: SEEDED_USER_IDS.VIEWER,
      name: 'David Kim (Stakeholder)',
      email: 'viewer@aipms.com',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  ],
]);

const DELETED_STORAGE_KEY = 'aipms_deleted_user_ids';

type Listener = () => void;

class UserDirectoryService {
  private cache = new Map<string, UserProfile>();
  private deletedUserIds = new Set<string>();
  private isServerAuthoritative = false;
  private version = 0;
  private listeners = new Set<Listener>();
  private activeRequestId = 0;

  constructor() {
    this.deletedUserIds = this.loadDeletedUserIds();
    this.initializeAuthoritativeDirectory();
  }

  private loadDeletedUserIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.sessionStorage.getItem(DELETED_STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  private persistDeletedUserIds(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        DELETED_STORAGE_KEY,
        JSON.stringify(Array.from(this.deletedUserIds)),
      );
    } catch {}
  }

  /**
   * Initializes the directory with ONLY verified real platform identities (Designated Admin).
   * Mock users are NEVER seeded into the authoritative active directory.
   */
  private initializeAuthoritativeDirectory() {
    this.cache.clear();
    const adminProfile: UserProfile = {
      id: DESIGNATED_ADMIN_ID,
      name: 'Ansh (Designated Admin)',
      email: DESIGNATED_ADMIN_EMAIL,
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    this.cache.set(adminProfile.id, adminProfile);
    this.cache.set(adminProfile.email.toLowerCase(), adminProfile);
  }

  /**
   * Subscribes a listener to directory updates (used by React useSyncExternalStore).
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns current version number for cache invalidation.
   */
  public getVersion(): number {
    return this.version;
  }

  public notify(): void {
    this.version++;
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in user directory listener:', err);
      }
    });
  }

  /**
   * Sets authoritative users returned from the backend.
   * Completely purges deleted accounts and stale roles.
   */
  public setAuthoritativeUsers(serverUsers: UserUpdateInput[]): void {
    this.isServerAuthoritative = true;
    this.initializeAuthoritativeDirectory();

    serverUsers.forEach((u) => {
      if (!u.id || this.deletedUserIds.has(u.id)) return;

      if (u.id === DESIGNATED_ADMIN_ID) {
        const adminProfile: UserProfile = {
          id: DESIGNATED_ADMIN_ID,
          name: u.name || 'Ansh (Designated Admin)',
          email: DESIGNATED_ADMIN_EMAIL,
          role: 'ADMIN',
          status: 'ACTIVE',
          deactivatedAt: null,
          avatarUrl: u.avatarUrl,
        };
        this.cache.set(adminProfile.id, adminProfile);
        this.cache.set(adminProfile.email.toLowerCase(), adminProfile);
        return;
      }

      const email = u.email || '';
      const name = u.name || (email ? email.split('@')[0] : `User ${u.id.slice(0, 6)}`);
      const profile: UserProfile = {
        id: u.id,
        name,
        email,
        role: u.role || 'TEAM_MEMBER',
        status: u.status || 'ACTIVE',
        deactivatedAt: u.deactivatedAt ?? null,
        avatarUrl: u.avatarUrl,
      };

      this.cache.set(u.id, profile);
      if (email) {
        this.cache.set(email.toLowerCase(), profile);
      }
    });

    this.notify();
  }

  /**
   * Fetches authoritative user directory from the server with request versioning
   * to strictly prevent race conditions where older requests overwrite newer responses.
   */
  public async fetchDirectory(token?: string | null): Promise<UserProfile[]> {
    const requestId = ++this.activeRequestId;

    try {
      let rawUsers: UserUpdateInput[] = [];

      try {
        rawUsers = await authApi.getDirectory(token);
      } catch {
        try {
          rawUsers = await authApi.listUsers(token);
        } catch {
          return this.getAllKnownUsers();
        }
      }

      if (requestId !== this.activeRequestId) {
        return this.getAllKnownUsers();
      }

      this.setAuthoritativeUsers(rawUsers);
      return this.getAllKnownUsers();
    } catch {
      return this.getAllKnownUsers();
    }
  }

  /**
   * Registers or updates a user profile in the client-side directory cache.
   */
  public register(user: UserUpdateInput): UserProfile {
    if (this.deletedUserIds.has(user.id)) {
      this.deletedUserIds.delete(user.id);
      this.persistDeletedUserIds();
    }

    const existing = this.cache.get(user.id);
    const email = user.email || existing?.email || '';
    const name = user.name || existing?.name || (email ? email.split('@')[0] : `User ${user.id.slice(0, 6)}`);

    const profile: UserProfile = {
      id: user.id,
      name,
      email,
      role: user.role || existing?.role || 'TEAM_MEMBER',
      status: user.status || existing?.status || 'ACTIVE',
      deactivatedAt: user.deactivatedAt !== undefined ? user.deactivatedAt : (existing?.deactivatedAt ?? null),
      avatarUrl: user.avatarUrl || existing?.avatarUrl,
    };

    this.cache.set(user.id, profile);
    if (email) {
      this.cache.set(email.toLowerCase(), profile);
    }

    this.notify();
    return profile;
  }

  /**
   * Batch registers multiple user records without purging the cache.
   */
  public registerMany(users: UserUpdateInput[]): void {
    users.forEach((u) => {
      if (!this.deletedUserIds.has(u.id)) {
        const existing = this.cache.get(u.id);
        const email = u.email || existing?.email || '';
        const name = u.name || existing?.name || (email ? email.split('@')[0] : `User ${u.id.slice(0, 6)}`);

        const profile: UserProfile = {
          id: u.id,
          name,
          email,
          role: u.role || existing?.role || 'TEAM_MEMBER',
          status: u.status || existing?.status || 'ACTIVE',
          deactivatedAt: u.deactivatedAt !== undefined ? u.deactivatedAt : (existing?.deactivatedAt ?? null),
          avatarUrl: u.avatarUrl || existing?.avatarUrl,
        };
        this.cache.set(u.id, profile);
        if (email) this.cache.set(email.toLowerCase(), profile);
      }
    });
    this.notify();
  }

  /**
   * Updates an existing user's role or status and notifies all active listeners immediately.
   */
  public updateUser(update: UserUpdateInput): void {
    if (this.deletedUserIds.has(update.id)) {
      if (update.status === 'ACTIVE') {
        this.deletedUserIds.delete(update.id);
        this.persistDeletedUserIds();
      } else {
        return;
      }
    }

    const existing = this.cache.get(update.id);
    if (!existing) {
      this.register(update);
      return;
    }

    const email = update.email !== undefined ? (update.email || '') : existing.email;
    const name = update.name !== undefined ? (update.name || existing.name) : existing.name;

    const updated: UserProfile = {
      ...existing,
      ...update,
      name,
      email,
      deactivatedAt: update.deactivatedAt !== undefined ? update.deactivatedAt : existing.deactivatedAt,
    };

    this.cache.set(update.id, updated);
    if (updated.email) {
      this.cache.set(updated.email.toLowerCase(), updated);
    }
    this.notify();
  }

  /**
   * Permanently removes a user from directory and blocks reintroduction from seeded fallbacks.
   * Persists tombstone across reloads.
   */
  public removeUser(userId: string): void {
    this.deletedUserIds.add(userId);
    this.persistDeletedUserIds();

    const existing = this.cache.get(userId);
    if (existing?.email) {
      this.cache.delete(existing.email.toLowerCase());
      this.deletedUserIds.add(existing.email.toLowerCase());
    }
    this.cache.delete(userId);
    this.notify();
  }

  /**
   * Clears the tombstone set (primarily for regression testing).
   */
  public clearDeletedUserIds(): void {
    this.deletedUserIds.clear();
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(DELETED_STORAGE_KEY);
      } catch {}
    }
    this.notify();
  }

  /**
   * Returns true if the user actively exists in the directory cache and has not been deleted.
   */
  public hasUser(idOrEmail?: string | null): boolean {
    if (!idOrEmail) return false;
    if (this.deletedUserIds.has(idOrEmail) || this.deletedUserIds.has(idOrEmail.toLowerCase())) {
      return false;
    }
    return this.cache.has(idOrEmail) || this.cache.has(idOrEmail.toLowerCase());
  }

  /**
   * Resolves a user ID to a structured user profile with fallback.
   * Fallback values are strictly for non-authoritative display rendering only.
   */
  public getUser(idOrEmail?: string | null): UserProfile {
    if (!idOrEmail) {
      return {
        id: '',
        name: 'Unassigned',
        email: '',
      };
    }

    const key = idOrEmail.toLowerCase();

    // Check if user was permanently deleted
    if (this.deletedUserIds.has(idOrEmail) || this.deletedUserIds.has(key)) {
      return {
        id: idOrEmail,
        name: 'Deleted Account',
        email: '',
        status: 'INACTIVE',
      };
    }

    const found = this.cache.get(idOrEmail) || this.cache.get(key);
    if (found) {
      return found;
    }

    // Check if ID matches designated administrator
    if (idOrEmail === DESIGNATED_ADMIN_ID || key === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      return {
        id: DESIGNATED_ADMIN_ID,
        name: 'Ansh (Designated Admin)',
        email: DESIGNATED_ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACTIVE',
      };
    }

    // Non-authoritative display-only fallback for known legacy/seeded IDs
    const staticFallback = STATIC_DISPLAY_FALLBACKS.get(idOrEmail) || STATIC_DISPLAY_FALLBACKS.get(key);
    if (staticFallback) {
      return staticFallback;
    }

    // Generic fallback format for unknown UUID
    return {
      id: idOrEmail,
      name: idOrEmail.includes('@') ? idOrEmail.split('@')[0] : `User ${idOrEmail.slice(0, 6)}`,
      email: idOrEmail.includes('@') ? idOrEmail : '',
    };
  }

  /**
   * Returns initials for avatar rendering.
   */
  public getInitials(nameOrId?: string | null): string {
    if (!nameOrId) return '—';
    const profile = this.getUser(nameOrId);
    const displayName = profile.name || profile.email;

    if (!displayName) return 'U';

    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }

  /**
   * Returns all known unique authoritative user profiles (excludes deleted and fallback accounts).
   */
  public getAllKnownUsers(): UserProfile[] {
    const seen = new Set<string>();
    const list: UserProfile[] = [];
    this.cache.forEach((profile) => {
      if (
        profile.id &&
        !seen.has(profile.id) &&
        !this.deletedUserIds.has(profile.id) &&
        !this.deletedUserIds.has((profile.email || '').toLowerCase())
      ) {
        seen.add(profile.id);
        list.push(profile);
      }
    });
    return list;
  }

  /**
   * Returns all active user profiles (strictly excludes deactivated, deleted, and fallback accounts).
   */
  public getActiveKnownUsers(): UserProfile[] {
    return this.getAllKnownUsers().filter((u) => u.status !== 'INACTIVE');
  }
}

export const userDirectory = new UserDirectoryService();

if (typeof window !== 'undefined') {
  (window as unknown as { __userDirectory?: UserDirectoryService }).__userDirectory = userDirectory;
}

/**
 * React hook for subscribing to real-time user directory updates using useSyncExternalStore.
 */
export function useUserDirectory(token?: string | null) {
  const version = React.useSyncExternalStore(
    (onStoreChange) => userDirectory.subscribe(onStoreChange),
    () => userDirectory.getVersion(),
    () => 0,
  );

  // Auto-fetch authoritative directory on mount when token is available
  React.useEffect(() => {
    if (token) {
      void userDirectory.fetchDirectory(token);
    }
  }, [token]);

  const allUsers = React.useMemo(() => userDirectory.getAllKnownUsers(), [version]);
  const activeUsers = React.useMemo(() => userDirectory.getActiveKnownUsers(), [version]);

  const refresh = React.useCallback(
    async (overrideToken?: string | null) => {
      return userDirectory.fetchDirectory(overrideToken ?? token);
    },
    [token],
  );

  return {
    version,
    users: allUsers,
    activeUsers,
    getUser: React.useCallback((idOrEmail?: string | null) => userDirectory.getUser(idOrEmail), [version]),
    getInitials: React.useCallback((nameOrId?: string | null) => userDirectory.getInitials(nameOrId), [version]),
    refresh,
  };
}
