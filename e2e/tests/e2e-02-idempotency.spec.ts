import { test, expect } from '@playwright/test';
import { login, idemHeaders } from './helpers';

test.describe('E2E-02: Idempotency (Exam Q4)', () => {
  test('3 requests with same key return same transactionRef', async ({ request }) => {
    const { accessToken } = await login(request);
    const key = `idem-pw-${Date.now()}`;
    const data = { fromAccount: '1234567891', toAccount: '1234567890', amount: 1, currency: 'THB' };

    const r1 = await request.post('/api/v1/transfers', { headers: idemHeaders(accessToken, key), data });
    const r2 = await request.post('/api/v1/transfers', { headers: idemHeaders(accessToken, key), data });
    const r3 = await request.post('/api/v1/transfers', { headers: idemHeaders(accessToken, key), data });

    const b1 = await r1.json();
    const b2 = await r2.json();
    const b3 = await r3.json();

    expect(b1.transactionRef).toBeDefined();
    expect(b1.transactionRef).toBe(b2.transactionRef);
    expect(b2.transactionRef).toBe(b3.transactionRef);
  });
});
