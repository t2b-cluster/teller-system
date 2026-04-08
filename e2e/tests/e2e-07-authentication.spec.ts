import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-07: Authentication Flow (Exam Q5)', () => {
  test('login returns JWT tokens', async ({ request }) => {
    const { accessToken, refreshToken } = await login(request);
    expect(accessToken).toMatch(/^eyJ/);
    expect(refreshToken).toBeTruthy();
  });

  test('valid token → 200', async ({ request }) => {
    const { accessToken } = await login(request);
    const res = await request.get('/api/v1/balance/1001000001', { headers: authHeaders(accessToken) });
    expect(res.status()).toBe(200);
  });

  test('no token → 401', async ({ request }) => {
    const res = await request.get('/api/v1/balance/1001000001');
    expect(res.status()).toBe(401);
  });

  test('bad token → 401', async ({ request }) => {
    const res = await request.get('/api/v1/balance/1001000001', {
      headers: authHeaders('invalid.token.here'),
    });
    expect(res.status()).toBe(401);
  });

  test('refresh returns new token', async ({ request }) => {
    const { refreshToken } = await login(request);
    const res = await request.post('/api/v1/auth/refresh', { data: { refreshToken } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toMatch(/^eyJ/);
  });

  test('reuse old refresh token → 401 (rotation)', async ({ request }) => {
    const { refreshToken } = await login(request);
    // Use it once
    await request.post('/api/v1/auth/refresh', { data: { refreshToken } });
    // Reuse → should fail
    const res = await request.post('/api/v1/auth/refresh', { data: { refreshToken } });
    expect(res.status()).toBe(401);
  });

  test('logout returns success', async ({ request }) => {
    const { refreshToken } = await login(request);
    const res = await request.post('/api/v1/auth/logout', { data: { refreshToken } });
    const body = await res.json();
    expect(body.message).toContain('Logged out');
  });

  test('wrong password → 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { username: 'teller01', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });
});
