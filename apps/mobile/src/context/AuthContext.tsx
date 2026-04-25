import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearToken, getToken, setToken } from '../lib/auth';

type AuthState = {
  token: string | null;
  isReady: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await getToken();
      if (alive) {
        setTokenState(t);
        setIsReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (t: string) => {
    await setToken(t);
    setTokenState(t);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({ token, isReady, signIn, signOut }),
    [isReady, signIn, signOut, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
