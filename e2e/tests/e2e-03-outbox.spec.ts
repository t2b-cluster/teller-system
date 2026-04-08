import { test, expect } from '@playwright/test';
import { login, authHeaders, idemHeaders } from './helpers';

test.describe('E2E-03: Outbox Pattern (Exam Q4)', () => {
  test('transfer PENDING → SUCCESS after outbox worker processes', async ({ request }) => {
    const { accessToken } = await login(request);

    const res = await request.post('/api/v1/transfers', {
      headers: idemHeaders(accessToken),
      data: { fromAccount: '1234567891', toAccount: '1234567890', amount: 1, currency: 'THB' },
    });
    const { transactionId, status } = await res.json();

    expect(status).toBe('PENDING');

    // Wait for outbox worker (cron every 5s)
    await new Promise((r) => setTimeout(r, 8000));

    const statusRes = await request.get(`/api/v1/transfers/${transactionId}/status`, {
      headers: authHeaders(accessToken),
    });
    const result = await statusRes.json();
    expect(result.status).toBe('SUCCESS');
  });
});
