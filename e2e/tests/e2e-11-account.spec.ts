import { test, expect } from '@playwright/test';
import { login, authHeaders } from './helpers';

test.describe('E2E-11: Account Registration', () => {
  test('create account → ACTIVE', async ({ request }) => {
    const { accessToken } = await login(request);
    const acc = `PW${Date.now()}`;

    const res = await request.post('/api/v1/accounts', {
      headers: authHeaders(accessToken),
      data: { accountNumber: acc, accountName: 'Playwright Test', initialDeposit: 5000 },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('ACTIVE');
    expect(body.accountNumber).toBe(acc);
  });

  test('duplicate account → 409', async ({ request }) => {
    const { accessToken } = await login(request);
    const acc = `DUP${Date.now()}`;

    await request.post('/api/v1/accounts', {
      headers: authHeaders(accessToken),
      data: { accountNumber: acc, accountName: 'First', initialDeposit: 100 },
    });

    const res = await request.post('/api/v1/accounts', {
      headers: authHeaders(accessToken),
      data: { accountNumber: acc, accountName: 'Duplicate', initialDeposit: 100 },
    });

    expect(res.status()).toBe(409);
  });

  test('list accounts contains new account', async ({ request }) => {
    const { accessToken } = await login(request);
    const acc = `LIST${Date.now()}`;

    await request.post('/api/v1/accounts', {
      headers: authHeaders(accessToken),
      data: { accountNumber: acc, accountName: 'List Test' },
    });

    const res = await request.get('/api/v1/accounts', { headers: authHeaders(accessToken) });
    const body = await res.json();
    const found = body.find((a: any) => a.accountNumber === acc);
    expect(found).toBeTruthy();
  });
});
