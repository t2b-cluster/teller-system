const API_BASE = '/api/v1';

/** Get current access token from sessionStorage */
function getAccessToken(): string | null {
  try {
    const stored = sessionStorage.getItem('teller_auth');
    if (stored) return JSON.parse(stored).accessToken;
  } catch { /* ignore */ }
  return null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Attach Bearer token to all API requests
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired — clear session and redirect to login
    sessionStorage.removeItem('teller_auth');
    window.location.href = '/';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface TransferResponse {
  transactionId: string;
  transactionRef: string;
  status: string;
}

export interface Transaction {
  id: string;
  transactionRef: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BalanceResponse {
  accountId: string;
  balance: number;
  source: string;
}

export interface AccountResponse {
  id: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: string;
  status: string;
}

export interface CreateAccountRequest {
  accountNumber: string;
  accountName: string;
  initialDeposit?: number;
  currency?: string;
}

export const api = {
  transfer: (data: TransferRequest, idempotencyKey: string) =>
    request<TransferResponse>('/transfers', {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  getTransactions: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<TransactionPage>(`/transactions?${qs}`);
  },

  getBalance: (accountId: string) =>
    request<BalanceResponse>(`/balance/${accountId}`),

  createAccount: (data: CreateAccountRequest) =>
    request<AccountResponse>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAccounts: () =>
    request<AccountResponse[]>('/accounts'),
};
