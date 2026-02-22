import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AttendanceRecord } from '@/types/attendance';
import { UI_COLORS } from '@/constants/attendance';

type Props = {
  data: AttendanceRecord[];
};

const formatTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
};

const getOfficeLabel = (record: AttendanceRecord) => {
  if (record.officeName) {
    return record.officeName;
  }
  if (record.officeId !== null && record.officeId !== undefined) {
    return `Kantor ID ${record.officeId}`;
  }
  return 'Kantor tidak diketahui';
};

const badgeStyle = (completed?: string): ViewStyle => ({
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 999,
  backgroundColor: completed ? '#E8FFF8' : '#FFF4E4',
});

const badgeTextStyle = (completed?: string): TextStyle => ({
  color: completed ? UI_COLORS.accent : '#A8680A',
  fontSize: 12,
  fontWeight: '600',
});

export const HistoryList = ({ data }: Props) => {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.employeeName}>{item.name}</Text>
              <Text style={styles.employeeId}>ID: {item.userId ?? '-'}</Text>
            </View>
            <View style={badgeStyle(item.checkOut)}>
              <Text style={badgeTextStyle(item.checkOut)}>
                {item.checkOut ? 'Lengkap' : 'Belum selesai'}
              </Text>
            </View>
          </View>
          <Text style={styles.officeText}>{getOfficeLabel(item)}</Text>
          <View style={styles.row}>
            <Text style={styles.date}>{formatDate(item.checkIn)}</Text>
          </View>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <Ionicons name="log-in-outline" size={18} color={UI_COLORS.primary} />
              <Text style={styles.timelineLabel}>Check-in</Text>
              <Text style={styles.timelineValue}>{formatTime(item.checkIn)}</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="log-out-outline" size={18} color={UI_COLORS.secondary} />
              <Text style={styles.timelineLabel}>Check-out</Text>
              <Text style={styles.timelineValue}>{formatTime(item.checkOut)}</Text>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
          <Text style={styles.emptySubtitle}>
            Check-in pertama kamu akan muncul di sini.
          </Text>
        </View>
      }
      contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  employeeId: {
    fontSize: 12,
    color: '#7A849C',
  },
  officeText: {
    fontSize: 13,
    color: '#6C768E',
    marginBottom: 8,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timelineItem: {
    flex: 1,
    backgroundColor: '#F5F7FF',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  timelineLabel: {
    color: '#687089',
    fontSize: 12,
  },
  timelineValue: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#687089',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
});
