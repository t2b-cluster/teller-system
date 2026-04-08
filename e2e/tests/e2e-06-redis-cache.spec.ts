import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-06: Redis Cache (Exam Q7)', () => {
  test('second call returns from cache', async ({ request }) => {
    const { accessToken } = await login(request);

    // First call
    const r1 = await request.get('/api/v1/balance/1001000001', { headers: authHeaders(accessToken) });
    const b1 = await r1.json();
    expect(b1.balance).toBeDefined();

    // Second call within 30s TTL
    const r2 = await request.get('/api/v1/balance/1001000001', { headers: authHeaders(accessToken) });
    const b2 = await r2.json();
    expect(b2.source).toBe('cache');
  });
});
