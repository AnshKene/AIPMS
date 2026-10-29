import { test, expect } from '@playwright/test';

test.describe('API & Network Reliability and Security Hardening', () => {
  const API_URL = 'http://localhost:3000/api';
  let adminToken = '';

  test.beforeAll(async () => {
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'abc@12345' }),
    }).then((r) => r.json());
    adminToken = adminLogin.accessToken;
  });

  test('Malformed UUID in URL parameters returns clean 400 Bad Request without stack trace leakage', async () => {
    const invalidUuids = ['not-a-uuid', '12345', 'SELECT * FROM users', '..%2F..%2Fetc%2Fpasswd'];

    for (const badId of invalidUuids) {
      const res = await fetch(`${API_URL}/projects/${encodeURIComponent(badId)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      // Gateway or microservice validation pipe should reject with 400
      expect([400, 404]).toContain(res.status);

      const bodyText = await res.text();
      // Ensure no raw SQL, PostgreSQL internal identifiers, or Node internal traces are leaked
      expect(bodyText).not.toMatch(/syntax error at or near/i);
      expect(bodyText).not.toMatch(/node:internal/i);
      expect(bodyText).not.toMatch(/pg_catalog/i);
    }
  });

  test('Duplicate user registration returns 409 Conflict with user-friendly message', async () => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.ansh@aipms.com', password: 'AnyPassword123!', name: 'Duplicate Admin' }),
    });
    expect([400, 409]).toContain(res.status);
    const data = await res.json();
    expect(data.message).toMatch(/already registered|already exists|conflict/i);
  });

  test('Expired / Invalid token returns clean 401 Unauthorized', async () => {
    const res = await fetch(`${API_URL}/projects`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID_SIGNATURE' },
    });
    expect(res.status).toBe(401);
  });
});
