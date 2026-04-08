import { test, expect } from '@playwright/test';

test.describe('E2E-09: Health Probes (Exam Q6)', () => {
  test('transfer-service liveness', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/v1/health/live');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('transfer-service readiness (DB connected)', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/v1/health/ready');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.db || body.status).toBeTruthy();
  });

  test('notification-service health', async ({ request }) => {
    const res = await request.get('http://localhost:3004/api/v1/notifications/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
