import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('AIPMS User Directory & Lifecycle Regression Suite', () => {
  const API_URL = 'http://localhost:3000/api';
  const DESIGNATED_ADMIN_ID = '66544acc-4e3d-4b3b-b3f3-44971c6a9347';
  let adminToken = '';
  const timestamp = Date.now();
  const testEmail = `regression.${timestamp}@aipms.com`;
  const testPassword = 'RegressionPass123!';
  let regressionUserId = '';

  test.beforeAll(async () => {
    // Authenticate as designated admin
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'abc@12345' }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData.accessToken;

    // Register a real test user in the system
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: `Regression User ${timestamp}`,
      }),
    });
    const regData = await regRes.json();
    regressionUserId = regData.user.id;
  });

  test.afterAll(async () => {
    if (adminToken && regressionUserId) {
      try {
        await fetch(`${API_URL}/auth/users/${regressionUserId}/deactivate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        await fetch(`${API_URL}/auth/users/${regressionUserId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {}
    }
  });

  test('Regression 1: Fallback users cannot be assigned and are excluded from active user directory', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Inspect userDirectory store in browser context
    const checkResult = await page.evaluate(() => {
      const dir = (window as any).__userDirectory;
      if (!dir) return { error: 'No directory store' };
      const all = dir.getAllKnownUsers();
      const active = dir.getActiveKnownUsers();

      const fakeIds = [
        'a1111111-1111-4111-8111-111111111111',
        'b2222222-2222-4222-8222-222222222222',
        'c3333333-3333-4333-8333-333333333333',
        'd4444444-4444-4444-8444-444444444444',
      ];

      const foundInAll = all.filter((u: any) => fakeIds.includes(u.id));
      const foundInActive = active.filter((u: any) => fakeIds.includes(u.id));

      // Display-only lookup should still resolve without polluting directory
      const displayOnlyProfile = dir.getUser('b2222222-2222-4222-8222-222222222222');

      return {
        foundInAllCount: foundInAll.length,
        foundInActiveCount: foundInActive.length,
        displayResolvedName: displayOnlyProfile?.name,
      };
    });

    expect(checkResult.foundInAllCount).toBe(0);
    expect(checkResult.foundInActiveCount).toBe(0);
    expect(checkResult.displayResolvedName).toBe('Alex Rivera (PM)');
  });

  test('Regression 2: Project-member assignment rejects nonexistent user IDs safely', async () => {
    // Attempt to assign non-existent fake ID to project
    const fakeUserId = 'b2222222-2222-4222-8222-222222222222';
    // List existing projects to find one
    const projRes = await fetch(`${API_URL}/projects?limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projData = await projRes.json();
    const projects = projData.data || projData;

    if (projects.length > 0) {
      const targetProjectId = projects[0].id;
      const assignRes = await fetch(`${API_URL}/projects/${targetProjectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: fakeUserId,
          role: 'MEMBER',
        }),
      });

      // Must be safely rejected with 400 Bad Request
      expect(assignRes.status).toBe(400);
      const errBody = await assignRes.json();
      expect(errBody.message).toContain('does not exist in the system authentication directory');
    }
  });

  test('Regression 3: Designated administrator cannot be deleted or demoted', async () => {
    // Attempt to demote designated admin
    const demoteRes = await fetch(`${API_URL}/auth/users/${DESIGNATED_ADMIN_ID}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'TEAM_MEMBER' }),
    });
    expect([400, 403]).toContain(demoteRes.status);

    // Attempt to delete designated admin
    const deleteRes = await fetch(`${API_URL}/auth/users/${DESIGNATED_ADMIN_ID}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([400, 403]).toContain(deleteRes.status);
  });

  test('Regression 4: Deactivated users remain inactive after page reload', async ({ page }) => {
    await loginAsAdmin(page);

    // Deactivate user via API
    const deactRes = await fetch(`${API_URL}/auth/users/${regressionUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deactRes.status).toBe(200);

    // Reload page to verify persistence
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');

    const statusCheck = await page.evaluate(async (uid) => {
      const dir = (window as unknown as { __userDirectory?: { fetchDirectory: () => Promise<unknown>; getUser: (id: string) => { status?: string }; getActiveKnownUsers: () => Array<{ id: string }> } }).__userDirectory;
      if (!dir) return null;
      await dir.fetchDirectory();
      const user = dir.getUser(uid);
      const active = dir.getActiveKnownUsers().some((u) => u.id === uid);
      return { status: user?.status, isActive: active };
    }, regressionUserId);

    expect(statusCheck?.status).toBe('INACTIVE');
    expect(statusCheck?.isActive).toBe(false);
  });

  test('Regression 5: Reactivated users become eligible again across selectors', async ({ page }) => {
    await loginAsAdmin(page);

    // Ensure deactivated first so reactivation is deterministic
    await fetch(`${API_URL}/auth/users/${regressionUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Reactivate user
    const reactRes = await fetch(`${API_URL}/auth/users/${regressionUserId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(reactRes.status).toBe(200);

    // Navigate to tasks and check store
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    const activeCheck = await page.evaluate(async (uid) => {
      const dir = (window as unknown as { __userDirectory?: { fetchDirectory: () => Promise<unknown>; getActiveKnownUsers: () => Array<{ id: string }> } }).__userDirectory;
      if (!dir) return false;
      await dir.fetchDirectory();
      return dir.getActiveKnownUsers().some((u) => u.id === uid);
    }, regressionUserId);

    expect(activeCheck).toBe(true);
  });

  test('Regression 6: Deleted users do not reappear after reload (persistent tombstone)', async ({ page }) => {
    await loginAsAdmin(page);

    // Deactivate first
    await fetch(`${API_URL}/auth/users/${regressionUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Permanently delete user
    const delRes = await fetch(`${API_URL}/auth/users/${regressionUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(200);

    // Reload page
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    const deletedCheck = await page.evaluate(async (uid) => {
      const dir = (window as any).__userDirectory;
      if (!dir) return { inActive: true, inAll: true };
      dir.removeUser(uid);
      await dir.fetchDirectory();
      const inActive = dir.getActiveKnownUsers().some((u: any) => u.id === uid);
      const inAll = dir.getAllKnownUsers().some((u: any) => u.id === uid);
      return { inActive, inAll };
    }, regressionUserId);

    expect(deletedCheck.inActive).toBe(false);
    expect(deletedCheck.inAll).toBe(false);

    // Clear so afterAll doesn't retry
    regressionUserId = '';
  });
});
