# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-03-outbox.spec.ts >> E2E-03: Outbox Pattern (Exam Q4) >> transfer PENDING → SUCCESS after outbox worker processes
- Location: tests/e2e-03-outbox.spec.ts:5:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "PENDING"
Received: undefined
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { login, authHeaders, idemHeaders } from './helpers';
  3  | 
  4  | test.describe('E2E-03: Outbox Pattern (Exam Q4)', () => {
  5  |   test('transfer PENDING → SUCCESS after outbox worker processes', async ({ request }) => {
  6  |     const { accessToken } = await login(request);
  7  | 
  8  |     const res = await request.post('/api/v1/transfers', {
  9  |       headers: idemHeaders(accessToken),
  10 |       data: { fromAccount: '1234567891', toAccount: '1234567890', amount: 1, currency: 'THB' },
  11 |     });
  12 |     const { transactionId, status } = await res.json();
  13 | 
> 14 |     expect(status).toBe('PENDING');
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  15 | 
  16 |     // Wait for outbox worker (cron every 5s)
  17 |     await new Promise((r) => setTimeout(r, 8000));
  18 | 
  19 |     const statusRes = await request.get(`/api/v1/transfers/${transactionId}/status`, {
  20 |       headers: authHeaders(accessToken),
  21 |     });
  22 |     const result = await statusRes.json();
  23 |     expect(result.status).toBe('SUCCESS');
  24 |   });
  25 | });
  26 | 
```