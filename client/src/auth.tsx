import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler, User } from './api';

export type LoginKind = 'customer' | 'rider' | 'staff';

const LOGIN_PATHS: Record<LoginKind, string> = {
  customer: '/auth/login',
  rider: '/auth/rider/login',
  staff: '/auth/staff/login',
};

const STORAGE_KEY = 'logistic.session';

interface Session {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  login: (kind: LoginKind, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — session lives in memory only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = loadSession();
    setAuthToken(stored?.token ?? null);
    return stored;
  });

  const logout = useCallback(() => {
    setAuthToken(null);
    saveSession(null);
    setSession(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const login = useCallback(async (kind: LoginKind, email: string, password: string) => {
    const result = await api<Session>(LOGIN_PATHS[kind], { method: 'POST', body: { email, password } });
    setAuthToken(result.token);
    saveSession(result);
    setSession(result);
    return result.user;
  }, []);

  const value = useMemo(() => ({ user: session?.user ?? null, login, logout }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
