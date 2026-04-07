import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  branchCode: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('teller_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setAccessToken(parsed.accessToken);
        setRefreshToken(parsed.refreshToken);
      } catch {
        sessionStorage.removeItem('teller_auth');
      }
    }
  }, []);

  const persistSession = useCallback((u: User, at: string, rt: string) => {
    setUser(u);
    setAccessToken(at);
    setRefreshToken(rt);
    sessionStorage.setItem('teller_auth', JSON.stringify({
      user: u, accessToken: at, refreshToken: rt,
    }));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();
    persistSession(data.user, data.accessToken, data.refreshToken);

    // Schedule token refresh before expiry
    scheduleRefresh(data.expiresIn);
  }, [persistSession]);

  const logout = useCallback(async () => {
    if (refreshToken) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    sessionStorage.removeItem('teller_auth');
  }, [refreshToken]);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    // Refresh 2 minutes before expiry
    const refreshMs = (expiresIn - 120) * 1000;
    if (refreshMs <= 0) return;

    setTimeout(async () => {
      if (!refreshToken) return;
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          const stored = sessionStorage.getItem('teller_auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.accessToken = data.accessToken;
            parsed.refreshToken = data.refreshToken;
            sessionStorage.setItem('teller_auth', JSON.stringify(parsed));
          }
          scheduleRefresh(data.expiresIn);
        } else {
          await logout();
        }
      } catch {
        await logout();
      }
    }, refreshMs);
  }, [refreshToken, logout]);

  const getToken = useCallback(() => accessToken, [accessToken]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isAuthenticated: !!accessToken && !!user,
      login,
      logout,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
