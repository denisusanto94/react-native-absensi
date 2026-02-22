import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UI_COLORS } from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';
import { api, type LeaveRecord } from '@/utils/api';

const leaveOptions = [
  { label: 'Sakit', value: 'sick' },
  { label: 'Izin', value: 'permit' },
  { label: 'Cuti', value: 'leave' },
];

const formatDateInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default function CutiScreen() {
  const { user, token } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leave_type: leaveOptions[0].value,
    start_date: formatDateInput(new Date()),
    end_date: formatDateInput(new Date()),
    reason: '',
  });

  const refreshLeaves = useCallback(async () => {
    if (!token) {
      setLeaves([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getLeaves(token);
      setLeaves(data);
    } catch (error) {
      Alert.alert('Gagal memuat data cuti', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshLeaves();
  }, [refreshLeaves]);

  const submitLeave = useCallback(async () => {
    if (!token || !user?.id) {
      Alert.alert('Sesi kedaluwarsa', 'Silakan login ulang.');
      return;
    }
    if (!form.reason.trim()) {
      Alert.alert('Alasan diperlukan', 'Masukkan alasan singkat pengajuan cuti.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createLeave(token, {
        user_id: user.id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim(),
      });
      Alert.alert('Berhasil', 'Permohonan cuti dikirim.');
      setForm((prev) => ({
        ...prev,
        reason: '',
      }));
      refreshLeaves();
    } catch (error) {
      Alert.alert('Pengajuan gagal', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }, [form.end_date, form.leave_type, form.reason, form.start_date, refreshLeaves, token, user?.id]);

  const groupedLeaves = useMemo(() => {
    return leaves.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [leaves]);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={groupedLeaves}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={styles.container}>
            <Text style={styles.title}>Pengajuan Cuti & Izin</Text>
            <Text style={styles.subtitle}>Isi formulir di bawah untuk mengajukan cuti, izin, atau sakit.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Jenis</Text>
              <View style={styles.pillGroup}>
                {leaveOptions.map((option) => {
                  const active = option.value === form.leave_type;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => setForm((prev) => ({ ...prev, leave_type: option.value }))}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Mulai</Text>
              <TextInput
                style={styles.input}
                value={form.start_date}
                onChangeText={(value) => setForm((prev) => ({ ...prev, start_date: value }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.label}>Selesai</Text>
              <TextInput
                style={styles.input}
                value={form.end_date}
                onChangeText={(value) => setForm((prev) => ({ ...prev, end_date: value }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.label}>Alasan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.reason}
                onChangeText={(value) => setForm((prev) => ({ ...prev, reason: value }))}
                multiline
                numberOfLines={3}
                placeholder="Contoh: Sakit demam tinggi"
              />

              <Pressable
                style={[styles.submitButton, submitting && styles.submitDisabled]}
                onPress={submitLeave}
                disabled={submitting}
              >
                <Text style={styles.submitText}>{submitting ? 'Mengirim...' : 'Ajukan'}</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Riwayat Pengajuan</Text>
            <Text style={styles.subtitle}>
              {loading ? 'Memuat data...' : 'Periksa status cuti yang sudah diajukan.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitleText}>{item.leave_type.toUpperCase()}</Text>
              <View style={[styles.statusPill, getStatusColor(item.status)]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardDate}>
              {formatDateInput(item.start_date)} s/d {formatDateInput(item.end_date)}
            </Text>
            <Text style={styles.cardReason}>{item.reason}</Text>
            <Text style={styles.cardMeta}>Diajukan: {new Date(item.created_at).toLocaleString('id-ID')}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Belum ada cuti</Text>
              <Text style={styles.emptySubtitle}>Riwayat permohonan akan tampil di sini.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  if (status === 'approved') {
    return { backgroundColor: '#E8FFF2' };
  }
  if (status === 'rejected') {
    return { backgroundColor: '#FFECEE' };
  }
  return { backgroundColor: '#F2F4FF' };
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  subtitle: {
    color: '#6B7280',
  },
  form: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  label: {
    fontWeight: '600',
    color: UI_COLORS.secondary,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: 'rgba(15, 98, 254, 0.1)',
  },
  pillText: {
    color: '#6B7280',
  },
  pillTextActive: {
    color: UI_COLORS.primary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: UI_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontWeight: '600',
    color: UI_COLORS.secondary,
    textTransform: 'capitalize',
  },
  cardDate: {
    color: '#6B7280',
  },
  cardReason: {
    color: UI_COLORS.secondary,
    fontWeight: '500',
  },
  cardMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.secondary,
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
  },
});
