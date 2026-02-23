import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, type LoginResponse, type LoginUserPayload } from '@/utils/api';

export type AuthUser = {
  id: number;
  email: string;
  roles: string;
  division: string;
  permissions: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  biometricEnabled: boolean;
  biometricReady: boolean;
  setBiometricEnabled: (nextEnabled: boolean) => Promise<void>;
  restoreBiometricSession: () => Promise<void>;
};

const AUTH_STORAGE_KEY = '@absensi/auth';
const BIOMETRIC_STORAGE_KEY = '@absensi/biometric';

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
  if (payload.user) {
    return payload.user;
  }
  if (payload.data) {
    const { token: _token, access_token: _accessToken, user: _nestedUser, ...rest } = payload.data;
    return rest;
  }
  return payload;
};

const normalizePermissions = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => entry?.toString()).filter((entry): entry is string => Boolean(entry?.trim()));
  }
  if (typeof value === 'string') {
    return value
      .split(/[,|\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
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
    permissions: normalizePermissions(payload.permissions ?? payload.permission),
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [biometricState, setBiometricState] = useState<{
    enabled: boolean;
    storedUser: AuthUser | null;
    storedToken: string | null;
  }>({
    enabled: false,
    storedUser: null,
    storedToken: null,
  });

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
          const restoredUser: AuthUser = {
            ...parsed.user,
            permissions: Array.isArray(parsed.user.permissions)
              ? parsed.user.permissions
              : normalizePermissions(parsed.user.permissions),
          };
          setUser(restoredUser);
        }
      } catch (error) {
        console.warn('Failed to rehydrate auth state', error);
      } finally {
        setHydrating(false);
      }
    };

    restore();
  }, []);

  useEffect(() => {
    const restoreBiometric = async () => {
      try {
        const raw = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        setBiometricState({
          enabled: Boolean(parsed.enabled),
          storedUser: parsed.storedUser ?? null,
          storedToken: parsed.storedToken ?? null,
        });
      } catch (error) {
        console.warn('Failed to rehydrate biometric setting', error);
      }
    };

    restoreBiometric();
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

  const persistBiometricState = useCallback(
    async (nextState: { enabled: boolean; storedUser: AuthUser | null; storedToken: string | null }) => {
      setBiometricState(nextState);
      try {
        await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(nextState));
      } catch (error) {
        console.warn('Failed to persist biometric setting', error);
      }
    },
    []
  );

  const applySession = useCallback(
    async (nextUser: AuthUser, nextToken: string) => {
      setUser(nextUser);
      setToken(nextToken);
      await persist(nextUser, nextToken);
    },
    [persist]
  );

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const result = await api.loginUser(email, password);
      let normalizedToken: string | null = resolveLoginToken(result)?.toString() ?? null;
      let userPayload = resolveLoginUserPayload(result);
      let fallbackUserPayload: LoginUserPayload | null = null;

      if (!normalizedToken) {
        try {
          const fallback = await api.login(email, password);
          normalizedToken = resolveLoginToken(fallback)?.toString() ?? null;
          fallbackUserPayload = resolveLoginUserPayload(fallback);
        } catch (error) {
          console.warn('Fallback login failed', error);
        }
      }

      if (!userPayload.email && fallbackUserPayload?.email) {
        userPayload = fallbackUserPayload;
      } else if (fallbackUserPayload) {
        const mergedPermissions =
          userPayload.permissions ??
          userPayload.permission ??
          fallbackUserPayload.permissions ??
          fallbackUserPayload.permission ??
          null;

        userPayload = {
          ...fallbackUserPayload,
          ...userPayload,
          permissions: mergedPermissions ?? undefined,
          permission: mergedPermissions ?? undefined,
        };
      }

      if (!normalizedToken) {
        throw new Error('Token tidak tersedia pada respons login.');
      }

      const mappedUser = mapLoginResponse(userPayload);
      await applySession(mappedUser, normalizedToken);

      if (biometricState.enabled) {
        await persistBiometricState({
          enabled: true,
          storedUser: mappedUser,
          storedToken: normalizedToken,
        });
      }
    },
    [applySession, biometricState.enabled, persistBiometricState]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await persist(null, null);
  }, [persist]);

  const setBiometricEnabled = useCallback(
    async (nextEnabled: boolean) => {
      if (nextEnabled) {
        if (!user || !token) {
          throw new Error('Aktifkan biometrik setelah berhasil login.');
        }
        await persistBiometricState({
          enabled: true,
          storedUser: user,
          storedToken: token,
        });
        return;
      }
      await persistBiometricState({
        enabled: false,
        storedUser: null,
        storedToken: null,
      });
    },
    [persistBiometricState, token, user]
  );

  const restoreBiometricSession = useCallback(async () => {
    if (!biometricState.enabled || !biometricState.storedUser || !biometricState.storedToken) {
      throw new Error('Biometrik belum dikonfigurasi.');
    }
    await applySession(biometricState.storedUser, biometricState.storedToken);
  }, [applySession, biometricState.enabled, biometricState.storedToken, biometricState.storedUser]);

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
      biometricEnabled: biometricState.enabled,
      biometricReady: Boolean(
        biometricState.enabled && biometricState.storedUser && biometricState.storedToken
      ),
      setBiometricEnabled,
      restoreBiometricSession,
    }),
    [
      biometricState.enabled,
      biometricState.storedToken,
      biometricState.storedUser,
      login,
      logout,
      restoreBiometricSession,
      setBiometricEnabled,
      status,
      token,
      user,
    ]
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
