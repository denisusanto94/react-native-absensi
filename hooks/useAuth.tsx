import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, type LoginResponse, type LoginUserPayload } from '@/utils/api';

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

const resolveLoginToken = (payload: LoginResponse) =>
  payload.token ??
  payload.access_token ??
  payload.data?.token ??
  payload.data?.access_token ??
  null;

const resolveLoginUserPayload = (payload: LoginResponse): LoginUserPayload => {
  if (payload.data?.user) {
    return payload.data.user;
  }
  if (payload.data) {
    const { token: _token, access_token: _accessToken, user: _nestedUser, ...rest } = payload.data;
    return rest;
  }
  return payload;
};

const mapLoginResponse = (payload: LoginUserPayload): AuthUser => {
  const id = payload.id_user ?? payload.id;
  const email = payload.email;

  if (!id || !email) {
    throw new Error('Data pengguna tidak lengkap pada respons login.');
  }

  return {
    id,
    email,
    roles: payload.roles ?? payload.role ?? '-',
    division: payload.divisi ?? payload.division ?? '-',
  };
};

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
      const tokenFromResponse = resolveLoginToken(result);
      const normalizedToken = tokenFromResponse?.toString();
      if (!normalizedToken) {
        throw new Error('Token tidak tersedia pada respons login.');
      }
      const mappedUser = mapLoginResponse(resolveLoginUserPayload(result));
      setUser(mappedUser);
      setToken(normalizedToken);
      await persist(mappedUser, normalizedToken);
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
