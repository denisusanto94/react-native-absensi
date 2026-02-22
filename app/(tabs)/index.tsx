import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SummaryCard } from '@/components/attendance/SummaryCard';
import { UI_COLORS } from '@/constants/attendance';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { summary, records, profile } = useAttendance();

  const latestRecords = useMemo(() => records.slice(0, 3), [records]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroGreeting}>Halo, {user?.email ?? profile.name ?? 'Pengguna'}!</Text>
          <Text style={styles.heroSubtitle}>Pantau aktivitas absensi & ajukan cuti langsung dari sini.</Text>
        </View>

        <SummaryCard
          name={profile.name}
          totalDays={summary.totalDays}
          completedSessions={summary.completedSessions}
          openSessions={summary.openSessions}
        />

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Akses Cepat</Text>
          <View style={styles.actionsRow}>
            <QuickAction
              icon="checkmark-circle"
              title="Mulai Absen"
              description="Selfie & GPS"
              onPress={() => router.push('/(tabs)/absen')}
            />
            <QuickAction
              icon="document-text"
              title="Ajukan Cuti"
              description="Sakit / Izin"
              onPress={() => router.push('/(tabs)/cuti')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riwayat Terbaru</Text>
          <Text style={styles.sectionSubtitle}>3 data terbaru dari perangkat ini.</Text>
          <View style={styles.historyList}>
            {latestRecords.length === 0 ? (
              <Text style={styles.emptyHistory}>Belum ada data, buka tab Absen untuk mulai check-in.</Text>
            ) : (
              latestRecords.map((record) => (
                <View key={record.id} style={styles.historyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>
                      {new Date(record.checkIn).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                    <Text style={styles.historyOffice}>{record.officeName ?? 'Kantor tidak diketahui'}</Text>
                  </View>
                  <View style={styles.historyTimes}>
                    <Text style={styles.historyTimeLabel}>IN</Text>
                    <Text style={styles.historyTimeValue}>
                      {new Date(record.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.historyTimes}>
                    <Text style={styles.historyTimeLabel}>OUT</Text>
                    <Text style={styles.historyTimeValue}>
                      {record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const QuickAction = ({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) => (
  <Pressable style={styles.actionCard} onPress={onPress}>
    <Ionicons name={icon} size={28} color={UI_COLORS.primary} />
    <Text style={styles.actionTitle}>{title}</Text>
    <Text style={styles.actionDescription}>{description}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  hero: {
    paddingTop: 16,
    gap: 6,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  heroSubtitle: {
    color: '#6B7280',
  },
  quickActions: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  actionDescription: {
    color: '#6B7280',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  sectionSubtitle: {
    color: '#6B7280',
    marginBottom: 6,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  historyOffice: {
    color: '#6B7280',
  },
  historyTimes: {
    alignItems: 'center',
  },
  historyTimeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  historyTimeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  emptyHistory: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
