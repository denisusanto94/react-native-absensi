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

import { UI_COLORS } from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, status, biometricEnabled, biometricReady, restoreBiometricSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const isBusy = submitting || status === 'loading';
  const canSubmit = useMemo(() => email.length > 0 && password.length >= 6 && !isBusy, [email.length, isBusy, password.length]);
  const showBiometricLogin = biometricEnabled && biometricReady && biometricSupported && !checkingBiometric;

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

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Login gagal', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, email, login, password, router]);

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    try {
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
  }, [restoreBiometricSession, router]);

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
});
