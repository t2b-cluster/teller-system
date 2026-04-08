import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-04: Reconciliation (Exam Q4)', () => {
  test('reconciliation endpoint responds', async ({ request }) => {
    const { accessToken } = await login(request);

    const res = await request.get('/api/v1/reconciliation/logs', {
      headers: authHeaders(accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
