import { APIRequestContext } from '@playwright/test';

const KONG = 'http://localhost:8000';

export async function login(request: APIRequestContext, username = 'teller01', password = 'teller123') {
  const res = await request.post(`${KONG}/api/v1/auth/login`, {
    data: { username, password },
  });
  const body = await res.json();
  return {
    accessToken: body.accessToken as string,
    refreshToken: body.refreshToken as string,
    user: body.user,
  };
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function idemHeaders(token: string, key?: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-idempotency-key': key || `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}
