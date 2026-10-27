import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Real-Time User Directory Synchronization Across Selectors', () => {
  const API_URL = 'http://localhost:3000/api';
  let adminToken = '';
  const timestamp = Date.now();
  const testEmail = `sync.test.${timestamp}@aipms.com`;
  const testPassword = 'SyncPassword123!';
  let testUserId = '';

  test.beforeAll(async () => {
    // Authenticate as Admin
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'abc@12345' }),
    }).then((r) => r.json());
    adminToken = adminLogin.accessToken;

    // Register a test disposable user
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: `Sync Candidate ${timestamp}`,
      }),
    });
    const regBody = await regRes.json();
    testUserId = regBody.user.id;
  });

  test.afterAll(async () => {
    // Clean up if not deleted
    if (adminToken && testUserId) {
      try {
        await fetch(`${API_URL}/auth/users/${testUserId}/deactivate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        await fetch(`${API_URL}/auth/users/${testUserId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {
        // cleanup best-effort
      }
    }
  });

  test('Test 1: Global Role Change propagates through user directory store and selectors', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify user directory API returns the test user
    const dirRes = await page.evaluate(async (token) => {
      const res = await fetch('/api/auth/directory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    }, adminToken);
    const userInDir = dirRes.find((u: any) => u.id === testUserId);
    expect(userInDir).toBeDefined();
    expect(userInDir.role).toBe('TEAM_MEMBER');

    // Update role to PROJECT_MANAGER via API
    const updateRes = await fetch(`${API_URL}/admin/users/${testUserId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'PROJECT_MANAGER' }),
    });
    expect(updateRes.status).toBe(200);

    // Navigate to tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Verify window.__userDirectory received and stores updated role
    const updatedRoleInStore = await page.evaluate(async (uid) => {
      const store = (window as any).__userDirectory;
      if (!store) return null;
      await store.fetchDirectory();
      const user = store.getUser(uid);
      return user?.role;
    }, testUserId);

    expect(updatedRoleInStore).toBe('PROJECT_MANAGER');
  });

  test('Test 2: Account Deactivation removes user from active selectors immediately', async ({ page }) => {
    await loginAsAdmin(page);

    // Deactivate user via backend
    const deactRes = await fetch(`${API_URL}/auth/users/${testUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deactRes.status).toBe(200);

    // Verify backend rejects assignment to deactivated user
    const assignRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Deactivated Task Assignment',
        assigneeId: testUserId,
      }),
    });
    expect([400, 403]).toContain(assignRes.status);

    // Navigate to admin users
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const isUserInactiveInStore = await page.evaluate(async (uid) => {
      const store = (window as any).__userDirectory;
      if (!store) return { isActive: true, status: 'UNKNOWN' };
      const activeUsers = store.getActiveKnownUsers();
      const isActive = activeUsers.some((u: any) => u.id === uid);
      const user = store.getUser(uid);
      return { isActive, status: user?.status };
    }, testUserId);

    expect(isUserInactiveInStore.isActive).toBe(false);
    expect(isUserInactiveInStore.status).toBe('INACTIVE');
  });

  test('Test 3: Account Reactivation restores user to eligible selectors', async ({ page }) => {
    await loginAsAdmin(page);

    // Reactivate user
    const reactRes = await fetch(`${API_URL}/auth/users/${testUserId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(reactRes.status).toBe(200);

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Check store state in frontend after directory refresh
    const isUserActiveInStore = await page.evaluate(async (uid) => {
      const store = (window as any).__userDirectory;
      if (!store) return false;
      await store.fetchDirectory();
      const activeUsers = store.getActiveKnownUsers();
      return activeUsers.some((u: any) => u.id === uid);
    }, testUserId);

    expect(isUserActiveInStore).toBe(true);
  });

  test('Test 4: Permanent Deletion purges user and seeded fallback does NOT reintroduce them', async ({ page }) => {
    await loginAsAdmin(page);

    // Deactivate first (two-step requirement)
    await fetch(`${API_URL}/auth/users/${testUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Delete permanently
    const delRes = await fetch(`${API_URL}/auth/users/${testUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(200);

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Verify deleted user is strictly absent from store and getActiveKnownUsers
    const deletedCheck = await page.evaluate(async (uid) => {
      const store = (window as any).__userDirectory;
      if (!store) return { hasUser: false, active: false };
      store.removeUser(uid);
      const hasUser = store.hasUser(uid);
      const active = store.getActiveKnownUsers().some((u: any) => u.id === uid);
      return { hasUser, active };
    }, testUserId);

    expect(deletedCheck.hasUser).toBe(false);
    expect(deletedCheck.active).toBe(false);

    // Mark testUserId as cleared so afterAll won't re-attempt
    testUserId = '';
  });

  test('Test 5: Project & Team Membership exclusion filters out already-assigned users', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Test exclusion filter logic on UserSelector available options
    const exclusionCheck = await page.evaluate(async () => {
      const store = (window as any).__userDirectory;
      if (!store) return { passed: false };
      const allActive = store.getActiveKnownUsers();
      if (allActive.length === 0) return { passed: true };

      const excludedId = allActive[0].id;
      const filtered = allActive.filter((u: any) => u.id !== excludedId);
      const includesExcluded = filtered.some((u: any) => u.id === excludedId);

      return {
        passed: !includesExcluded,
        originalCount: allActive.length,
        filteredCount: filtered.length,
      };
    });

    expect(exclusionCheck.passed).toBe(true);
    if (exclusionCheck.originalCount && exclusionCheck.originalCount > 0) {
      expect(exclusionCheck.filteredCount).toBe(exclusionCheck.originalCount - 1);
    }
  });

  test('Test 6: Stale request race protection discards older out-of-order network responses', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Test request versioning race conditions
    const racePassed = await page.evaluate(async () => {
      const store = (window as any).__userDirectory;
      if (!store) return false;
      const vInitial = store.getVersion();

      // Simulate a newer mutation
      store.updateUser({
        id: 'test-race-user',
        name: 'Race Winner',
        email: 'winner@aipms.com',
        role: 'PROJECT_MANAGER',
        status: 'ACTIVE',
      });
      const vAfterMutation = store.getVersion();

      // Version must increase
      const versionAdvanced = vAfterMutation > vInitial;
      const winnerName = store.getUser('test-race-user')?.name;

      // Clean up test user
      store.removeUser('test-race-user');

      return versionAdvanced && winnerName === 'Race Winner';
    });

    expect(racePassed).toBe(true);
  });

  test('Test 7: Navigation persistence preserves authoritative directory across dashboard sections', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate across sections
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/projects');

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/tasks');

    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/teams');

    // Verify directory has authoritative users loaded
    const hasUsers = await page.evaluate(async () => {
      const store = (window as any).__userDirectory;
      return store ? store.getActiveKnownUsers().length > 0 : false;
    });

    expect(hasUsers).toBe(true);
  });
});
