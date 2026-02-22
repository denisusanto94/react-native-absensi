import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { UI_COLORS } from "@/constants/attendance";

type Props = {
  name: string;
  totalDays: number;
  completedSessions: number;
  openSessions: number;
};

export const SummaryCard = ({
  name,
  totalDays,
  completedSessions,
  openSessions,
}: Props) => {
  return (
    <LinearGradient
      colors={[UI_COLORS.primary, UI_COLORS.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.badge}>Sistem Absensi Pintar</Text>
      <Text style={styles.title}>Selamat datang, {name || "Rekan"} 👋</Text>
      <Text style={styles.subtitle}>
        Pastikan check-in dan check-out tetap tepat waktu.
      </Text>

      <View style={styles.statsRow}>
        <Stat label="Hari Aktif" value={totalDays} />
        <Stat label="Sesi Tuntas" value={completedSessions} />
        <Stat label="Sedang Berjalan" value={openSessions} />
      </View>
    </LinearGradient>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    color: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
});
