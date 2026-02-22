import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UI_COLORS, type Coordinates } from "@/constants/attendance";

type Props = {
  distanceMeters: number | null;
  allowedMeters: number;
  officeName: string;
  officeAddress: string;
  officeCoords: Coordinates;
  gpsLabel?: string;
  lastUpdated?: string;
};

const formatMeters = (meters: number) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

export const LocationGateCard = ({
  distanceMeters,
  allowedMeters,
  officeName,
  officeAddress,
  officeCoords,
  gpsLabel,
  lastUpdated,
}: Props) => {
  const inside = typeof distanceMeters === "number" && distanceMeters <= allowedMeters;

  return (
    <View style={[styles.container, inside ? styles.successBorder : styles.warnBorder]}>
      <View style={styles.headerRow}>
        <Ionicons
          name={inside ? "shield-checkmark" : "location-outline"}
          size={24}
          color={inside ? UI_COLORS.accent : UI_COLORS.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Zona Lokasi {officeName}</Text>
          <Text style={styles.subtitle}>
            {inside
              ? "Kamu sudah berada di radius kantor"
              : "Harus berada di lokasi kantor untuk absen"}
          </Text>
        </View>
      </View>

      <View style={styles.distanceRow}>
        <View style={styles.distanceValue}>
          <Text style={styles.distanceLabel}>Jarakmu</Text>
          <Text style={styles.distanceFigure}>
            {distanceMeters === null ? "..." : formatMeters(distanceMeters)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.distanceLabel}>Batas</Text>
          <Text style={styles.distanceFigure}>{formatMeters(allowedMeters)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Alamat kantor: {officeAddress}</Text>
        <Text style={styles.footerText}>
          Koordinat: {officeCoords.latitude.toFixed(5)},{" "}
          {officeCoords.longitude.toFixed(5)}
        </Text>
        {gpsLabel ? <Text style={styles.footerText}>GPS: {gpsLabel}</Text> : null}
        {lastUpdated ? (
          <Text style={styles.footerText}>Update: {lastUpdated}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  successBorder: {
    borderWidth: 1,
    borderColor: "rgba(34, 209, 179, 0.3)",
  },
  warnBorder: {
    borderWidth: 1,
    borderColor: "rgba(15, 98, 254, 0.3)",
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_COLORS.secondary,
  },
  subtitle: {
    color: "#5A6473",
    fontSize: 13,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  distanceValue: {
    flex: 1,
    paddingRight: 8,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "#E3E8F2",
    marginHorizontal: 12,
  },
  distanceLabel: {
    color: "#536079",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  distanceFigure: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_COLORS.secondary,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: "#EFF2FB",
    paddingTop: 8,
    gap: 2,
  },
  footerText: {
    fontSize: 12,
    color: "#7A849C",
  },
});
