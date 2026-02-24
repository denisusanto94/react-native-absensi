import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

import { UI_COLORS } from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';
import {
  areMandatoryPermissionsGranted,
  checkMandatoryPermissions,
  requestMandatoryPermissions,
  type MandatoryPermissionStatus,
} from '@/utils/permissions';

export default function LoginScreen() {
  const router = useRouter();
  const { login, status, biometricEnabled, biometricReady, restoreBiometricSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [permissionStatuses, setPermissionStatuses] = useState<MandatoryPermissionStatus[] | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [requestingPermissions, setRequestingPermissions] = useState(false);

  const isBusy = submitting || status === 'loading';
  const permissionsGranted = useMemo(
    () => (permissionStatuses ? areMandatoryPermissionsGranted(permissionStatuses) : false),
    [permissionStatuses]
  );
  const canSubmit = useMemo(
    () =>
      email.length > 0 &&
      password.length >= 6 &&
      !isBusy &&
      permissionsGranted &&
      !permissionsLoading &&
      !requestingPermissions,
    [email.length, isBusy, password.length, permissionsGranted, permissionsLoading, requestingPermissions]
  );
  const showBiometricLogin =
    biometricEnabled && biometricReady && biometricSupported && !checkingBiometric && permissionsGranted;

  useEffect(() => {
    let cancelled = false;
    const checkHardware = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!cancelled) {
          setBiometricSupported(hasHardware && isEnrolled);
        }
      } catch (error) {
        if (!cancelled) {
          setBiometricSupported(false);
          console.warn('Biometric hardware check failed', error);
        }
      } finally {
        if (!cancelled) {
          setCheckingBiometric(false);
        }
      }
    };

    checkHardware();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydratePermissions = async () => {
      try {
        const statuses = await checkMandatoryPermissions();
        if (!cancelled) {
          setPermissionStatuses(statuses);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    };

    hydratePermissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const validatePermissionsBeforeLogin = useCallback(async () => {
    const statuses = await checkMandatoryPermissions();
    setPermissionStatuses(statuses);
    const granted = areMandatoryPermissionsGranted(statuses);
    if (!granted) {
      Alert.alert(
        'Izin aplikasi wajib',
        'Aktifkan akses lokasi, kamera, mikrofon, galeri, dan telepon sebelum login.'
      );
    }
    return granted;
  }, []);

  const handleRequestPermissions = useCallback(async () => {
    setRequestingPermissions(true);
    try {
      const statuses = await requestMandatoryPermissions();
      setPermissionStatuses(statuses);
    } finally {
      setRequestingPermissions(false);
      setPermissionsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const latestGranted = await validatePermissionsBeforeLogin();
      if (!latestGranted) {
        return;
      }
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Login gagal', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, email, login, password, router, validatePermissionsBeforeLogin]);

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    try {
      const latestGranted = await validatePermissionsBeforeLogin();
      if (!latestGranted) {
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login dengan biometrik',
        fallbackLabel: 'Masukkan kata sandi',
        cancelLabel: 'Batal',
      });
      if (!result.success) {
        return;
      }
      await restoreBiometricSession();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Biometrik gagal', error instanceof Error ? error.message : String(error));
    } finally {
      setBiometricLoading(false);
    }
  }, [restoreBiometricSession, router, validatePermissionsBeforeLogin]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.title}>Masuk</Text>
          <Text style={styles.subtitle}>Gunakan akun absensi untuk melanjutkan.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="nama@perusahaan.com"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kata sandi</Text>
            <TextInput
              secureTextEntry
              placeholder="Kata sandi"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </Pressable>

          {showBiometricLogin ? (
            <Pressable
              style={[styles.secondaryButton, biometricLoading && styles.buttonDisabled]}
              disabled={biometricLoading}
              onPress={handleBiometricLogin}
            >
              {biometricLoading ? (
                <ActivityIndicator color={UI_COLORS.secondary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Masuk dengan sidik jari</Text>
              )}
            </Pressable>
          ) : null}

          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <Text style={styles.permissionTitle}>Izin Aplikasi</Text>
              <Text style={[styles.permissionStatusText, permissionsGranted && styles.permissionStatusSuccess]}>
                {permissionsGranted ? 'Semua izin aktif' : 'Aktifkan semua izin untuk melanjutkan.'}
              </Text>
            </View>
            {permissionsLoading ? (
              <View style={styles.permissionLoadingRow}>
                <ActivityIndicator color={UI_COLORS.secondary} />
                <Text style={styles.permissionLoadingText}>Memeriksa izin perangkat...</Text>
              </View>
            ) : (
              <View style={styles.permissionList}>
                {(permissionStatuses ?? []).map((status) => (
                  <View key={status.key} style={styles.permissionRow}>
                    <Ionicons
                      name={status.granted ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={status.granted ? '#16A34A' : '#DC2626'}
                    />
                    <Text style={styles.permissionLabel}>
                      {status.label}
                      {status.platform === 'android' ? ' (Android)' : ''}
                    </Text>
                    <Text
                      style={[
                        styles.permissionValue,
                        status.granted ? styles.permissionGranted : styles.permissionDenied,
                      ]}
                    >
                      {status.granted ? 'Diizinkan' : 'Ditolak'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              style={[
                styles.permissionButton,
                permissionsGranted && styles.permissionButtonSuccess,
                requestingPermissions && styles.buttonDisabled,
              ]}
              onPress={handleRequestPermissions}
              disabled={requestingPermissions}
            >
              {requestingPermissions ? (
                <ActivityIndicator color={permissionsGranted ? UI_COLORS.secondary : '#fff'} />
              ) : (
                <Text
                  style={[
                    styles.permissionButtonText,
                    permissionsGranted && styles.permissionButtonSuccessText,
                  ]}
                >
                  {permissionsGranted ? 'Semua izin aktif' : 'Aktifkan izin sekarang'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 12,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_COLORS.secondary,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: UI_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.secondary,
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: UI_COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  permissionCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  permissionHeader: {
    gap: 4,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  permissionStatusText: {
    fontSize: 13,
    color: '#DC2626',
  },
  permissionStatusSuccess: {
    color: '#16A34A',
  },
  permissionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionLoadingText: {
    color: '#6B7280',
    fontSize: 13,
  },
  permissionList: {
    gap: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionLabel: {
    flex: 1,
    color: '#374151',
    fontWeight: '500',
  },
  permissionValue: {
    fontWeight: '600',
    fontSize: 13,
  },
  permissionGranted: {
    color: '#16A34A',
  },
  permissionDenied: {
    color: '#DC2626',
  },
  permissionButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: UI_COLORS.primary,
  },
  permissionButtonSuccess: {
    backgroundColor: 'rgba(15, 98, 254, 0.08)',
    borderColor: UI_COLORS.primary,
    borderWidth: 1,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  permissionButtonSuccessText: {
    color: UI_COLORS.primary,
  },
});
