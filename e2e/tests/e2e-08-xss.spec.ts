import { test, expect } from '@playwright/test';
import { login, idemHeaders } from './helpers';

test.describe('E2E-08: XSS Prevention (Exam Q5)', () => {
  test('API accepts script in description without crashing', async ({ request }) => {
    const { accessToken } = await login(request);

    const res = await request.post('/api/v1/transfers', {
      headers: idemHeaders(accessToken),
      data: {
        fromAccount: '1234567891',
        toAccount: '1234567890',
        amount: 1,
        currency: 'THB',
        description: '<script>alert("xss")</script>',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.transactionRef || body.status).toBeTruthy();
  });
});
