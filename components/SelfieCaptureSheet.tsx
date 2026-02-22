import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import { UI_COLORS } from "@/constants/attendance";

type Props = {
  visible: boolean;
  mode: "check-in" | "check-out";
  onCaptured: (uri: string) => void;
  onDismiss: () => void;
};

export const SelfieCaptureSheet = ({
  visible,
  mode,
  onCaptured,
  onDismiss,
}: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPreviewUri(null);
      setCapturing(false);
      return;
    }

    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission, visible]);

  const takeSelfie = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }
    setCapturing(true);
    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (result?.uri) {
        setPreviewUri(result.uri);
      }
    } catch (error) {
      console.warn("Gagal mengambil foto", error);
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleUseSelfie = useCallback(() => {
    if (previewUri) {
      onCaptured(previewUri);
      setPreviewUri(null);
    }
  }, [onCaptured, previewUri]);

  const headerText = useMemo(
    () =>
      mode === "check-in"
        ? "Ambil selfie untuk check-in"
        : "Ambil selfie untuk check-out",
    [mode]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable hitSlop={16} onPress={onDismiss}>
            <Ionicons name="close" size={24} color={UI_COLORS.secondary} />
          </Pressable>
          <Text style={styles.headerText}>{headerText}</Text>
          <View style={{ width: 24 }} />
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Kami membutuhkan izin kamera untuk mengambil selfie.
            </Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
            </Pressable>
          </View>
        ) : previewUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              ref={(ref) => {
                cameraRef.current = ref;
              }}
              style={StyleSheet.absoluteFill}
              facing="front"
              enableTorch={false}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.overlayText}>Posisikan wajahmu di tengah layar</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {previewUri ? (
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton} onPress={() => setPreviewUri(null)}>
                <Text style={styles.secondaryButtonText}>Ulangi Foto</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleUseSelfie}>
                <Text style={styles.primaryButtonText}>Gunakan Selfie</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryButton, capturing && styles.disabledButton]}
              onPress={takeSelfie}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Ambil Selfie</Text>
              )}
            </Pressable>
          )}
          <Text style={styles.helperText}>
            Foto disimpan hanya di perangkat ini sebagai bukti selfie.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: UI_COLORS.secondary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    color: UI_COLORS.secondary,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: UI_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  previewWrapper: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  footer: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: UI_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI_COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: UI_COLORS.secondary,
    fontWeight: "600",
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  helperText: {
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
