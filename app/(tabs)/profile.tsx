import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { UI_COLORS } from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, biometricEnabled, setBiometricEnabled } = useAuth();
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Gagal keluar', error instanceof Error ? error.message : String(error));
    }
  }, [logout, router]);

  const handleBiometricToggle = useCallback(
    async (nextValue: boolean) => {
      setBiometricLoading(true);
      try {
        await setBiometricEnabled(nextValue);
        if (nextValue) {
          Alert.alert('Biometrik aktif', 'Selanjutnya kamu bisa login dengan sidik jari.');
        }
      } catch (error) {
        Alert.alert(
          'Gagal mengubah biometrik',
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        setBiometricLoading(false);
      }
    },
    [setBiometricEnabled]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profil Pengguna</Text>
        <Text style={styles.subtitle}>Informasi akun yang digunakan untuk absensi.</Text>

        <View style={styles.card}>
          <ProfileRow label="Email" value={user?.email ?? '-'} />
          <ProfileRow label="User ID" value={user?.id ? String(user.id) : '-'} />
          <ProfileRow label="Divisi" value={user?.division ?? '-'} />
          <ProfileRow label="Role" value={user?.roles ?? '-'} />
          <View style={styles.biometricRow}>
            <View style={styles.biometricText}>
              <Text style={styles.profileValue}>Login sidik jari</Text>
              <Text style={styles.helperText}>Aktifkan untuk menggunakan biometrik di halaman login.</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={biometricLoading}
              trackColor={{ true: UI_COLORS.primary, false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const ProfileRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.profileRow}>
    <Text style={styles.profileLabel}>{label}</Text>
    <Text style={styles.profileValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  subtitle: {
    color: '#6B7280',
  },
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  profileRow: {
    gap: 4,
  },
  profileLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileValue: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  biometricRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  biometricText: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#FF4D4F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
