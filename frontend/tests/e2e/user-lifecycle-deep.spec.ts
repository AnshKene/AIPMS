import { test, expect } from '@playwright/test';

test.describe('Complete User Lifecycle & Account Retention Workflows', () => {
  const API_URL = 'http://localhost:3000/api';
  const designatedAdminId = '66544acc-4e3d-4b3b-b3f3-44971c6a9347';
  let adminToken = '';
  let disposableUserId = '';
  const testEmail = `deep.lifecycle.${Date.now()}@aipms.com`;
  const testPassword = 'LifecyclePassword123!';

  test.beforeAll(async () => {
    // Authenticate as Admin
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'abc@12345' }),
    }).then((r) => r.json());
    adminToken = adminLogin.accessToken;
  });

  test('1. User registers and receives active status', async () => {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: 'Deep Lifecycle User' }),
    });
    expect(regRes.status).toBe(201);
    const body = await regRes.json();
    disposableUserId = body.user.id;
    expect(body.user.status).toBe('ACTIVE');
    expect(body.user.role).toBe('TEAM_MEMBER');
  });

  test('2. Newly registered user can authenticate and obtain active session', async () => {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    expect(body.accessToken).toBeDefined();
    expect(body.user.status).toBe('ACTIVE');
  });

  test('3. Deletion of an active user account is strictly rejected with 400 Bad Request', async () => {
    const delRes = await fetch(`${API_URL}/auth/users/${disposableUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(400);
    const body = await delRes.json();
    expect(body.message).toContain('must be deactivated before permanent deletion');
  });

  test('4. Administrator deactivates user account and audit event is recorded', async () => {
    const deactRes = await fetch(`${API_URL}/auth/users/${disposableUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deactRes.status).toBe(200);
    const body = await deactRes.json();
    expect(body.status).toBe('INACTIVE');
    expect(body.deactivatedAt).toBeDefined();
  });

  test('5. Deactivated user login attempts are rejected with 401 Unauthorized', async () => {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(loginRes.status).toBe(401);
    const body = await loginRes.json();
    expect(body.message).toContain('Account is deactivated');
  });

  test('6. Administrator reactivates user account and login is restored', async () => {
    const reactRes = await fetch(`${API_URL}/auth/users/${disposableUserId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(reactRes.status).toBe(200);
    const body = await reactRes.json();
    expect(body.status).toBe('ACTIVE');
    expect(body.deactivatedAt).toBeNull();

    // Verify authentication works again
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(loginRes.status).toBe(200);
  });

  test('7. Two-step permanent deletion permanently removes user account', async () => {
    // Step 1: Deactivate
    await fetch(`${API_URL}/auth/users/${disposableUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Step 2: Delete
    const delRes = await fetch(`${API_URL}/auth/users/${disposableUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.message).toContain('permanently deleted successfully');
  });

  test('8. Repeated deletion returns 400 Bad Request', async () => {
    const repeatRes = await fetch(`${API_URL}/auth/users/${disposableUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(repeatRes.status).toBe(400);
  });

  test('9. Designated Root Administrator account is strictly protected from deactivation and deletion', async () => {
    // Attempt deactivation of root admin
    const deactRes = await fetch(`${API_URL}/auth/users/${designatedAdminId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deactRes.status).toBe(403);
    const deactBody = await deactRes.json();
    expect(deactBody.message).toContain('designated system administrator account cannot be deactivated');

    // Attempt deletion of root admin
    const delRes = await fetch(`${API_URL}/auth/users/${designatedAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([400, 403]).toContain(delRes.status);
  });
});
