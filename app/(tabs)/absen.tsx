import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SummaryCard } from '@/components/attendance/SummaryCard';
import { LocationGateCard } from '@/components/attendance/LocationGateCard';
import { SelfieCaptureSheet } from '@/components/SelfieCaptureSheet';
import {
  ALLOWED_RADIUS_METERS,
  Coordinates,
  FALLBACK_OFFICE,
  UI_COLORS,
} from '@/constants/attendance';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import { metersBetween } from '@/utils/geo';

type PendingAction = {
  type: 'check-in' | 'check-out';
  coords: Coordinates & { accuracy?: number };
  locationLabel?: string;
  capturedAt: Date;
};

type LocationSnapshot = {
  coords: Coordinates & { accuracy?: number };
  distance: number;
  label?: string;
  updatedAt: string;
};

export default function AbsenScreen() {
  const {
    profile,
    updateProfile,
    summary,
    activeRecord,
    checkIn,
    checkOut,
    offices,
    officesLoading,
    selectedOffice,
    refreshOffices,
  } = useAttendance();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [locationInfo, setLocationInfo] = useState<LocationSnapshot | null>(null);
  const [selfieSheetOpen, setSelfieSheetOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const MAX_ALLOWED_ACCURACY = 75;

  const officeForDisplay = selectedOffice ?? FALLBACK_OFFICE;
  const allowedRadius = officeForDisplay.radius ?? ALLOWED_RADIUS_METERS;

  const warnMockLocationDetected = useCallback(async () => {
    const warning =
      'Lokasi palsu terdeteksi. Matikan aplikasi spoofing / mock location sebelum melakukan absensi. Kamu otomatis keluar.';
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
        'Aktifkan GPS dan layanan lokasi agar absensi dapat berjalan.'
      );
      return null;
    }

    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      const request = await Location.requestForegroundPermissionsAsync();
      if (request.status !== 'granted') {
        Alert.alert('Izin Lokasi', 'Izinkan akses lokasi agar sistem absensi bekerja.');
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

    const distance = metersBetween(coords, officeForDisplay);

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
      distance,
      label,
      updatedAt: new Date().toLocaleTimeString('id-ID'),
    };

    setLocationInfo(snapshot);
    return snapshot;
  }, [officeForDisplay, warnMockLocationDetected]);

  const onRefreshLocation = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchLocation(), refreshOffices()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchLocation, refreshOffices]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const ensureProfileReady = useCallback(() => {
    if (!profile.userId) {
      Alert.alert('Profil belum siap', 'Silakan login ulang.');
      return false;
    }
    if (!profile.officeId) {
      Alert.alert('Pilih Kantor', 'Silakan pilih kantor yang tersedia.');
      return false;
    }
    return true;
  }, [profile.officeId, profile.userId]);

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

      if (locationSnapshot.distance > allowedRadius) {
        Alert.alert(
          'Di luar zona',
          `Kamu berada ${locationSnapshot.distance.toFixed(0)} m dari kantor ${officeForDisplay.name}. Mendekatlah lalu coba lagi.`
        );
        return;
      }

      setPendingAction({
        type,
        coords: locationSnapshot.coords,
        locationLabel: locationSnapshot.label,
        capturedAt: new Date(),
      });
      setSelfieSheetOpen(true);
    },
    [allowedRadius, ensureProfileReady, fetchLocation, officeForDisplay.name]
  );

  const handleSelfieCaptured = useCallback(
    async (selfieUri: string) => {
      if (!pendingAction) {
        setSelfieSheetOpen(false);
        return;
      }

      try {
        if (pendingAction.type === 'check-in') {
          await checkIn({
            coordinates: pendingAction.coords,
            selfieUri,
          });
          Alert.alert('Check-in berhasil', 'Selamat bekerja!');
        } else {
          await checkOut({
            coordinates: pendingAction.coords,
            selfieUri,
          });
          Alert.alert('Check-out berhasil', 'Sampai jumpa lagi besok!');
        }
      } catch (error) {
        Alert.alert('Ups', error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
        setSelfieSheetOpen(false);
      }
    },
    [checkIn, checkOut, pendingAction]
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

  const canCheckIn = useMemo(() => !activeRecord, [activeRecord]);
  const canCheckOut = useMemo(() => Boolean(activeRecord), [activeRecord]);

  const handleSelectOffice = useCallback(
    (officeId: number) => {
      updateProfile({ officeId });
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
          <Text style={styles.cardTitle}>Zona Kantor</Text>
          <Text style={styles.cardSubtitle}>Data diambil langsung dari API /offices</Text>
          <View style={styles.officeList}>
            {officesLoading ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color={UI_COLORS.primary} />
                <Text style={styles.helperText}>Memuat daftar kantor...</Text>
              </View>
            ) : null}
            {offices.map((office) => {
              const active = office.id === profile.officeId;
              return (
                <Pressable
                  key={office.id}
                  style={[styles.officeCard, active && styles.officeCardActive]}
                  onPress={() => handleSelectOffice(office.id)}
                >
                  <Text style={styles.officeType}>{office.name}</Text>
                  <Text style={styles.officeAddress}>{office.address}</Text>
                  <Text style={styles.helperText}>Radius: {office.radius} m</Text>
                </Pressable>
              );
            })}
            {offices.length === 0 && !officesLoading ? (
              <Text style={styles.emptyText}>Tidak ada data kantor. Tarik untuk menyegarkan.</Text>
            ) : null}
          </View>
          <Pressable style={styles.refreshButton} onPress={refreshOffices}>
            <Text style={styles.refreshText}>Segarkan data kantor</Text>
          </Pressable>
        </View>

        <LocationGateCard
          distanceMeters={locationInfo?.distance ?? null}
          allowedMeters={allowedRadius}
          gpsLabel={locationInfo?.label}
          lastUpdated={locationInfo?.updatedAt}
          officeName={officeForDisplay.name}
          officeAddress={officeForDisplay.address}
          officeCoords={{
            latitude: officeForDisplay.latitude,
            longitude: officeForDisplay.longitude,
          }}
        />

        <View style={styles.sessionCard}>
          <Text style={styles.cardTitle}>Aktivitas Hari Ini</Text>
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
            Status: {activeRecord ? 'Sedang bekerja' : 'Belum check-in'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, styles.checkInButton, !canCheckIn && styles.disabledButton]}
            disabled={!canCheckIn}
            onPress={() => runAction('check-in')}
          >
            <Text style={styles.actionLabel}>Check-in</Text>
            <Text style={styles.actionHint}>Selfie & GPS</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.checkOutButton, !canCheckOut && styles.disabledButton]}
            disabled={!canCheckOut}
            onPress={() => runAction('check-out')}
          >
            <Text style={styles.actionLabel}>Check-out</Text>
            <Text style={styles.actionHint}>Kirim selfie pulang</Text>
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
  officeList: {
    gap: 10,
    marginTop: 4,
  },
  officeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E8F5',
    padding: 14,
    backgroundColor: '#F8FAFF',
  },
  officeCardActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: 'rgba(15, 98, 254, 0.08)',
  },
  officeType: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  officeAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE3F4',
  },
  refreshText: {
    color: UI_COLORS.primary,
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
    fontSize: 18,
    fontWeight: '700',
  },
  actionHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  emptyText: {
    color: '#7A849C',
    marginTop: 4,
  },
});
