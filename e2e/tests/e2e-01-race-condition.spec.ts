import { test, expect } from '@playwright/test';
import { login, authHeaders, idemHeaders } from './helpers';

test.describe('E2E-01: Race Condition (Exam Q1)', () => {
  test('2 concurrent transfers — balance must not go negative', async ({ request }) => {
    const { accessToken } = await login(request);
    const acc = `RACE${Date.now()}`;

    // Create account with 1500
    await request.post('/api/v1/accounts', {
      headers: authHeaders(accessToken),
      data: { accountNumber: acc, accountName: 'Race Test', initialDeposit: 1500 },
    });

    // Send 2 concurrent transfers of 1000 each
    const [r1, r2] = await Promise.all([
      request.post('/api/v1/transfers', {
        headers: idemHeaders(accessToken, `race-a-${Date.now()}`),
        data: { fromAccount: acc, toAccount: '1001000001', amount: 1000, currency: 'THB' },
      }),
      request.post('/api/v1/transfers', {
        headers: idemHeaders(accessToken, `race-b-${Date.now()}`),
        data: { fromAccount: acc, toAccount: '1001000001', amount: 1000, currency: 'THB' },
      }),
    ]);

    // At least one should succeed, at most one should fail
    const statuses = [r1.status(), r2.status()];
    const successCount = statuses.filter((s) => s === 200).length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    // Balance must not be negative
    await new Promise((r) => setTimeout(r, 1000));
    const balRes = await request.get(`/api/v1/balance/${acc}`, { headers: authHeaders(accessToken) });
    const { balance } = await balRes.json();
    expect(balance).toBeGreaterThanOrEqual(0);
  });
});
