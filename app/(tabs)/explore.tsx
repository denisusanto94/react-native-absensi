import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { HistoryList } from "@/components/attendance/HistoryList";
import { useAttendance } from "@/hooks/useAttendance";
import { UI_COLORS } from "@/constants/attendance";

export default function HistoryScreen() {
  const { records, profile } = useAttendance();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat Absensi</Text>
        <Text style={styles.subtitle}>
          {profile.name ? `Data milik ${profile.name}` : "Lengkapi nama di tab Beranda"}
        </Text>
      </View>
      <HistoryList data={records} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_COLORS.softBackground,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: UI_COLORS.secondary,
  },
  subtitle: {
    marginTop: 4,
    color: "#6B7280",
  },
});
