import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-05: Transaction History 2M records (Exam Q3)', () => {
  test('cursor pagination returns 50 items with hasMore', async ({ request }) => {
    const { accessToken } = await login(request);

    const start = Date.now();
    const res = await request.get('/api/v1/transactions?accountId=1234567890&limit=50', {
      headers: authHeaders(accessToken),
    });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.items).toHaveLength(50);
    expect(body.hasMore).toBe(true);
    expect(body.nextCursor).toBeTruthy();
    expect(elapsed).toBeLessThan(5000);
  });

  test('page 2 via cursor returns next 50 items', async ({ request }) => {
    const { accessToken } = await login(request);

    const page1 = await request.get('/api/v1/transactions?accountId=1234567890&limit=50', {
      headers: authHeaders(accessToken),
    });
    const { nextCursor } = await page1.json();

    const page2 = await request.get(`/api/v1/transactions?accountId=1234567890&limit=50&cursor=${nextCursor}`, {
      headers: authHeaders(accessToken),
    });
    const body2 = await page2.json();

    expect(body2.items).toHaveLength(50);
    expect(body2.hasMore).toBe(true);
  });
});
