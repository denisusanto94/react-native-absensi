import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SummaryCard } from '@/components/attendance/SummaryCard';
import { SelfieCaptureSheet } from '@/components/SelfieCaptureSheet';
import {
  Coordinates,
  TRANSUM_DOMICILES,
  TRANSUM_TRANSPORT_MODES,
  UI_COLORS,
} from '@/constants/attendance';
import { useAttendanceTransum } from '@/hooks/useAttendanceTransum';
import { useAuth } from '@/hooks/useAuth';
import { useLoadingOverlay } from '@/hooks/useLoadingOverlay';
import { animateLayoutTransition } from '@/utils/animation';

type PendingAction = {
  type: 'check-in' | 'check-out';
  coords: Coordinates & { accuracy?: number };
  locationLabel?: string;
  capturedAt: Date;
};

type LocationSnapshot = {
  coords: Coordinates & { accuracy?: number };
  label?: string;
  updatedAt: string;
};

export default function AbsenTransumScreen() {
  const {
    profile,
    summary,
    activeRecord,
    checkIn,
    checkOut,
    updateProfile,
  } = useAttendanceTransum();
  const { user, logout } = useAuth();
  const { withLoading } = useLoadingOverlay();
  const [refreshing, setRefreshing] = useState(false);
  const [locationInfo, setLocationInfo] = useState<LocationSnapshot | null>(null);
  const [selfieSheetOpen, setSelfieSheetOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const MAX_ALLOWED_ACCURACY = 75;

  const warnMockLocationDetected = useCallback(async () => {
    const warning =
      'Lokasi palsu terdeteksi. Matikan aplikasi spoofing / mock location sebelum melakukan absensi transum. Kamu otomatis keluar.';
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(warning, ToastAndroid.LONG, ToastAndroid.CENTER);
    }
    Alert.alert('Lokasi palsu terdeteksi', warning);
    await logout();
  }, [logout]);

  const fetchLocation = useCallback(async () => {
    const providerStatus = await Location.getProviderStatusAsync();
    if (!providerStatus.locationServicesEnabled) {
      Alert.alert(
        'Layanan lokasi mati',
        'Aktifkan GPS dan layanan lokasi agar absensi transum dapat berjalan.'
      );
      return null;
    }

    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      const request = await Location.requestForegroundPermissionsAsync();
      if (request.status !== 'granted') {
        Alert.alert('Izin Lokasi', 'Izinkan akses lokasi agar absensi transum bekerja.');
        return null;
      }
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (position.mocked) {
      await warnMockLocationDetected();
      return null;
    }

    const coords: Coordinates & { accuracy?: number } = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
    };

    if ((coords.accuracy ?? Infinity) > MAX_ALLOWED_ACCURACY) {
      Alert.alert(
        'Akurasi lokasi rendah',
        'Pindah ke area terbuka atau nyalakan GPS akurasi tinggi. (akurasi minimal 75 meter).'
      );
      return null;
    }

    let label: string | undefined;
    try {
      const [address] = await Location.reverseGeocodeAsync(position.coords);
      if (address) {
        label = `${address.street ?? address.name ?? 'Lokasi'} ${address.district ?? ''}`;
      }
    } catch {
      label = undefined;
    }

    const snapshot: LocationSnapshot = {
      coords,
      label,
      updatedAt: new Date().toLocaleTimeString('id-ID'),
    };

    animateLayoutTransition();
    setLocationInfo(snapshot);
    return snapshot;
  }, [warnMockLocationDetected]);

  const onRefreshLocation = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLocation();
    } finally {
      setRefreshing(false);
    }
  }, [fetchLocation]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const ensureProfileReady = useCallback(() => {
    if (!profile.userId) {
      Alert.alert('Profil belum siap', 'Silakan login ulang.');
      return false;
    }
    if (!profile.domicile) {
      Alert.alert('Pilih domisili', 'Silakan pilih domisili terlebih dahulu.');
      return false;
    }
    if (!profile.transportMode) {
      Alert.alert('Pilih moda transportasi', 'Silakan pilih moda transportasi terlebih dahulu.');
      return false;
    }
    return true;
  }, [profile.domicile, profile.transportMode, profile.userId]);

  const runAction = useCallback(
    async (type: 'check-in' | 'check-out') => {
      const ready = ensureProfileReady();
      if (!ready) {
        return;
      }

      const locationSnapshot = await fetchLocation();
      if (!locationSnapshot) {
        return;
      }

      animateLayoutTransition();
      setPendingAction({
        type,
        coords: locationSnapshot.coords,
        locationLabel: locationSnapshot.label,
        capturedAt: new Date(),
      });
      setSelfieSheetOpen(true);
    },
    [ensureProfileReady, fetchLocation]
  );

  const handleSelfieCaptured = useCallback(
    async (selfieUri: string) => {
      setSelfieSheetOpen(false);
      if (!pendingAction) {
        return;
      }

      // Small pause to let the camera modal close before showing loading
      await new Promise((resolve) => setTimeout(resolve, 300));

      const action = pendingAction.type;
      const coords = pendingAction.coords;
      const loadingMessage =
        action === 'check-in' ? 'Mengirim check-in transum...' : 'Mengirim check-out transum...';

      try {
        await withLoading(async () => {
          if (action === 'check-in') {
            await checkIn({
              coordinates: coords,
              selfieUri,
            });
          } else {
            await checkOut({
              coordinates: coords,
              selfieUri,
            });
          }
        }, loadingMessage);

        // Small pause before alert
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (action === 'check-in') {
          Alert.alert('Check-in transum berhasil', 'Selamat menjalankan hari Rabu tanpa macet!');
        } else {
          Alert.alert('Check-out transum berhasil', 'Terima kasih sudah mengikuti program.');
        }
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        Alert.alert('Ups', error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    },
    [checkIn, checkOut, pendingAction, withLoading]
  );

  const todaysSession = summary.todaysRecords[0];
  const checkInTime = todaysSession
    ? new Date(todaysSession.checkIn).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '-';
  const checkOutTime = todaysSession?.checkOut
    ? new Date(todaysSession.checkOut).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '-';

  const completedToday = useMemo(
    () => Boolean(todaysSession?.checkOut),
    [todaysSession?.checkOut]
  );
  const canCheckIn = useMemo(
    () => !activeRecord && !completedToday,
    [activeRecord, completedToday]
  );
  const canCheckOut = useMemo(() => Boolean(activeRecord), [activeRecord]);

  const handleSelectDomicile = useCallback(
    (domicile: string) => {
      animateLayoutTransition();
      updateProfile({ domicile });
    },
    [updateProfile]
  );
  const handleSelectTransportMode = useCallback(
    (mode: string) => {
      animateLayoutTransition();
      updateProfile({ transportMode: mode });
    },
    [updateProfile]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshLocation} />}
      >
        <SummaryCard
          name={profile.name}
          totalDays={summary.totalDays}
          completedSessions={summary.completedSessions}
          openSessions={summary.openSessions}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil Pengguna</Text>
          <Text style={styles.cardSubtitle}>Data login dari API /auth/login_user</Text>
          <View style={styles.profileBlock}>
            <Text style={styles.profileName}>{user?.email ?? profile.name}</Text>
            <Text style={styles.helperText}>User ID: {user?.id ?? '-'}</Text>
            <Text style={styles.helperText}>Divisi: {user?.division ?? '-'}</Text>
            <Text style={styles.helperText}>Role: {user?.roles ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Domisili</Text>
          <Text style={styles.cardSubtitle}>Pilih wilayah tempat tinggal kamu.</Text>
          <View style={styles.optionGrid}>
            {TRANSUM_DOMICILES.map((domicile) => {
              const active = profile.domicile === domicile;
              return (
                <Pressable
                  key={domicile}
                  style={[styles.optionPill, active && styles.optionPillActive]}
                  onPress={() => handleSelectDomicile(domicile)}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{domicile}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Moda Transportasi</Text>
          <Text style={styles.cardSubtitle}>Pilih moda utama yang kamu gunakan.</Text>
          <View style={styles.optionGrid}>
            {TRANSUM_TRANSPORT_MODES.map((mode) => {
              const active = profile.transportMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.optionPill, active && styles.optionPillActive]}
                  onPress={() => handleSelectTransportMode(mode)}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lokasi Terakhir</Text>
          <Text style={styles.cardSubtitle}>
            Data diambil dari GPS ketika kamu menyegarkan atau mengambil selfie.
          </Text>
          {locationInfo ? (
            <View style={styles.locationInfo}>
              <Text style={styles.helperText}>Diperbarui: {locationInfo.updatedAt}</Text>
              <Text style={styles.locationValue}>
                Koordinat: {locationInfo.coords.latitude.toFixed(5)},{' '}
                {locationInfo.coords.longitude.toFixed(5)}
              </Text>
              <Text style={styles.locationValue}>
                Akurasi: ±{locationInfo.coords.accuracy?.toFixed(0) ?? '0'} m
              </Text>
              {locationInfo.label ? (
                <Text style={styles.locationValue}>Alamat: {locationInfo.label}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.helperText}>Belum ada lokasi. Tarik untuk memperbarui.</Text>
          )}
        </View>

        <View style={styles.sessionCard}>
          <Text style={styles.cardTitle}>Aktivitas Transum Hari Ini</Text>
          <View style={styles.sessionRow}>
            <View style={styles.sessionBlock}>
              <Text style={styles.sessionLabel}>Check-in</Text>
              <Text style={styles.sessionValue}>{checkInTime}</Text>
            </View>
            <View style={styles.sessionBlock}>
              <Text style={styles.sessionLabel}>Check-out</Text>
              <Text style={styles.sessionValue}>{checkOutTime}</Text>
            </View>
          </View>
          <Text style={styles.sessionStatus}>
            Status: {activeRecord ? 'Sedang menjalankan transum' : completedToday ? 'Selesai hari ini' : 'Belum check-in'}
          </Text>
        </View>

        {completedToday ? (
          <View style={styles.completedCard}>
            <Text style={styles.completedMessage}>
              Terima kasih, hari ini sudah menggunakan transportasi umum.
            </Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, styles.checkInButton, !canCheckIn && styles.disabledButton]}
            disabled={!canCheckIn}
            onPress={() => runAction('check-in')}
          >
            <Text style={styles.actionLabel}>Check-in Transum</Text>
            <Text style={styles.actionHint}>Selfie & GPS</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.checkOutButton, !canCheckOut && styles.disabledButton]}
            disabled={!canCheckOut}
            onPress={() => runAction('check-out')}
          >
            <Text style={styles.actionLabel}>Check-out</Text>
            <Text style={styles.actionHint}>Akhiri sesi transum</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SelfieCaptureSheet
        visible={selfieSheetOpen}
        mode={pendingAction?.type ?? 'check-in'}
        watermark={
          pendingAction
            ? {
              latitude: pendingAction.coords.latitude,
              longitude: pendingAction.coords.longitude,
              timestamp: pendingAction.capturedAt,
              label: pendingAction.locationLabel,
            }
            : null
        }
        onCaptured={handleSelfieCaptured}
        onDismiss={() => {
          setSelfieSheetOpen(false);
          setPendingAction(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 12,
    color: '#7A849C',
  },
  profileBlock: {
    gap: 4,
    marginTop: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E8F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFF',
  },
  optionPillActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: 'rgba(15, 98, 254, 0.08)',
  },
  optionText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  optionTextActive: {
    color: UI_COLORS.primary,
  },
  locationInfo: {
    marginTop: 8,
    gap: 6,
  },
  locationValue: {
    color: UI_COLORS.secondary,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionBlock: {
    flex: 1,
    backgroundColor: '#F7F9FF',
    borderRadius: 18,
    padding: 12,
  },
  sessionLabel: {
    fontSize: 12,
    color: '#7A849C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  sessionStatus: {
    color: '#55617B',
    fontSize: 14,
  },
  completedCard: {
    backgroundColor: 'rgba(15, 98, 254, 0.08)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 98, 254, 0.2)',
  },
  completedMessage: {
    color: UI_COLORS.secondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    gap: 6,
  },
  checkInButton: {
    backgroundColor: UI_COLORS.primary,
  },
  checkOutButton: {
    backgroundColor: UI_COLORS.secondary,
  },
  disabledButton: {
    opacity: 0.4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
});
