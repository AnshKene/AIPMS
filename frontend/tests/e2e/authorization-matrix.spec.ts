import { test, expect } from '@playwright/test';

test.describe('Role-Based Authorization & API Enforcement Matrix', () => {
  const API_URL = 'http://localhost:3000/api';
  let memberToken = '';
  let memberId = '';
  let adminToken = '';

  test.beforeAll(async () => {
    // 1. Obtain Admin Token
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'abc@12345' }),
    }).then((r) => r.json());
    adminToken = adminLogin.accessToken;

    // 2. Register disposable test team member
    const uniqueEmail = `test.rbac.${Date.now()}@aipms.com`;
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'TestPassword123!', name: 'RBAC Team Member' }),
    }).then((r) => r.json());
    memberId = regRes.user.id;

    // 3. Obtain Team Member Token
    const memberLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'TestPassword123!' }),
    }).then((r) => r.json());
    memberToken = memberLogin.accessToken;
  });

  test.afterAll(async () => {
    // Clean up disposable member: Deactivate and permanently delete using admin client
    if (memberId && adminToken) {
      await fetch(`${API_URL}/auth/users/${memberId}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      await fetch(`${API_URL}/auth/users/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  test('Unauthenticated requests are rejected with 401 across protected endpoints', async () => {
    const endpoints = [
      { url: `${API_URL}/projects`, method: 'GET' },
      { url: `${API_URL}/tasks`, method: 'GET' },
      { url: `${API_URL}/teams`, method: 'GET' },
      { url: `${API_URL}/auth/users`, method: 'GET' },
      { url: `${API_URL}/auth/me`, method: 'GET' },
      { url: `${API_URL}/reports`, method: 'GET' },
      { url: `${API_URL}/risks`, method: 'GET' },
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, { method: ep.method });
      expect(res.status).toBe(401);
    }
  });

  test('TEAM_MEMBER is forbidden from accessing administrative endpoints (403 Forbidden)', async () => {
    const adminEndpoints = [
      { url: `${API_URL}/auth/users`, method: 'GET' },
      { url: `${API_URL}/auth/users/${memberId}/role`, method: 'PATCH', body: { role: 'ADMIN' } },
      { url: `${API_URL}/auth/users/${memberId}/deactivate`, method: 'POST' },
      { url: `${API_URL}/auth/users/${memberId}/reactivate`, method: 'POST' },
      { url: `${API_URL}/auth/users/${memberId}`, method: 'DELETE' },
    ];

    for (const ep of adminEndpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      expect([401, 403]).toContain(res.status);
    }
  });

  test('Unauthenticated browser visitor is redirected to /login when requesting protected pages', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const protectedPages = ['/dashboard', '/projects', '/tasks', '/teams', '/admin/users'];
    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    }
  });

  test('Modifying client-side claims or headers cannot escalate privileges on server APIs', async () => {
    // Attempt privilege escalation with forged role header or invalid signature token
    const res = await fetch(`${API_URL}/auth/users`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.forged.token',
        'X-User-Role': 'ADMIN',
      },
    });
    expect([401, 403]).toContain(res.status);
  });
});
