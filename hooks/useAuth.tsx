import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, type LoginResponse } from '@/utils/api';

export type AuthUser = {
  id: number;
  email: string;
  roles: string;
  division: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = '@absensi/auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapLoginResponse = (payload: LoginResponse) => ({
  id: payload.id_user,
  email: payload.email,
  roles: payload.roles,
  division: payload.divisi,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed.token) {
          setToken(parsed.token);
        }
        if (parsed.user) {
          setUser(parsed.user);
        }
      } catch (error) {
        console.warn('Failed to rehydrate auth state', error);
      } finally {
        setHydrating(false);
      }
    };

    restore();
  }, []);

  const persist = useCallback(async (nextUser: AuthUser | null, nextToken: string | null) => {
    if (nextUser && nextToken) {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: nextUser, token: nextToken })
      );
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const result = await api.loginUser(email, password);
      if (!result.token) {
        throw new Error('Token tidak tersedia pada respons login.');
      }
      const mappedUser = mapLoginResponse(result);
      setUser(mappedUser);
      setToken(result.token);
      await persist(mappedUser, result.token);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await persist(null, null);
  }, [persist]);

  const status: AuthContextValue['status'] = hydrating
    ? 'loading'
    : token
    ? 'authenticated'
    : 'unauthenticated';

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      login,
      logout,
    }),
    [login, logout, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
