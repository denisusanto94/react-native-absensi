import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { UI_COLORS } from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Gagal keluar', error instanceof Error ? error.message : String(error));
    }
  }, [logout, router]);

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
