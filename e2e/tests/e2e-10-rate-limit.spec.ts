import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-10: API Gateway Rate Limiting', () => {
  test('Kong returns rate limit headers', async ({ request }) => {
    const { accessToken } = await login(request);

    const res = await request.get('/api/v1/balance/1001000001', {
      headers: authHeaders(accessToken),
    });

    const headers = res.headers();
    const hasRateLimit =
      headers['ratelimit-limit'] ||
      headers['x-ratelimit-limit-minute'] ||
      headers['ratelimit-remaining'];

    expect(hasRateLimit).toBeTruthy();
  });
});
