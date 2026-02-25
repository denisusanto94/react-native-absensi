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
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraMountError,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";

import { UI_COLORS } from "@/constants/attendance";

type Props = {
  visible: boolean;
  mode: "check-in" | "check-out";
  onCaptured: (uri: string) => void;
  onDismiss: () => void;
  watermark?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    label?: string | null;
  } | null;
};

export const SelfieCaptureSheet = ({
  visible,
  mode,
  onCaptured,
  onDismiss,
  watermark,
}: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const previewRef = useRef<View | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [microphonePrompted, setMicrophonePrompted] = useState(false);

  const resetCameraSession = useCallback(() => {
    setCameraReady(false);
    setCameraError(null);
    setCameraKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!visible) {
      setPreviewUri(null);
      setCapturing(false);
      resetCameraSession();
      setMicrophonePrompted(false);
      return;
    }

    if (!permission) {
      requestPermission();
      return;
    }

    if (!permission.granted) {
      return;
    }

    resetCameraSession();
  }, [permission, requestPermission, resetCameraSession, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (microphonePrompted) {
      return;
    }
    if (
      !microphonePermission ||
      (!microphonePermission.granted && microphonePermission.canAskAgain)
    ) {
      requestMicrophonePermission();
      setMicrophonePrompted(true);
    }
  }, [
    microphonePermission,
    microphonePrompted,
    requestMicrophonePermission,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !permission?.granted || cameraReady || cameraError) {
      return;
    }
    const timeout = setTimeout(() => {
      setCameraError(
        "Kamera tidak merespons. Tutup aplikasi lain yang memakai kamera lalu coba lagi."
      );
    }, 8000);
    return () => clearTimeout(timeout);
  }, [cameraError, cameraReady, permission?.granted, visible]);

  const takeSelfie = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) {
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
  }, [cameraReady]);

  const handleSkipSelfie = useCallback(() => {
    onCaptured("");
    setPreviewUri(null);
    resetCameraSession();
  }, [onCaptured, resetCameraSession]);

  const handleUseSelfie = useCallback(async () => {
    if (!previewUri) {
      return;
    }
    let finalUri = previewUri;
    if (previewRef.current) {
      try {
        const captured = await captureRef(previewRef, {
          format: "jpg",
          quality: 0.9,
          result: "tmpfile",
        });
        if (captured) {
          finalUri = captured;
        }
      } catch (error) {
        console.warn("Gagal membuat watermark pada selfie", error);
      }
    }
    onCaptured(finalUri);
    setPreviewUri(null);
    resetCameraSession();
  }, [onCaptured, previewUri, resetCameraSession]);

  const handleRetake = useCallback(() => {
    setPreviewUri(null);
    resetCameraSession();
  }, [resetCameraSession]);

  const handleCameraError = useCallback((event: CameraMountError) => {
    setCameraError(event.message ?? "Kamera tidak dapat dibuka.");
  }, []);

  const headerText = useMemo(
    () =>
      mode === "check-in"
        ? "Ambil selfie untuk check-in"
        : "Ambil selfie untuk check-out",
    [mode]
  );

  const watermarkInfo = useMemo(() => {
    if (!watermark) {
      return null;
    }
    const date = watermark.timestamp;
    const dateText = date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeText = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return {
      location: watermark.label ?? "Lokasi terdeteksi",
      coords: `Lat ${watermark.latitude.toFixed(5)}, Lon ${watermark.longitude.toFixed(5)}`,
      timestamp: `${dateText} ${timeText}`,
    };
  }, [watermark]);

  const renderWatermark = () =>
    watermarkInfo ? (
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>{watermarkInfo.location}</Text>
        <Text style={styles.watermarkText}>{watermarkInfo.coords}</Text>
        <Text style={styles.watermarkText}>{watermarkInfo.timestamp}</Text>
      </View>
    ) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      hardwareAccelerated
    >
      {visible ? (
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
            <Pressable style={styles.skipButton} onPress={handleSkipSelfie}>
              <Text style={styles.skipButtonText}>Lanjut Tanpa Selfie</Text>
            </Pressable>
          </View>
        ) : previewUri ? (
          <View ref={previewRef} style={styles.previewWrapper} collapsable={false}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
            {renderWatermark()}
          </View>
        ) : cameraError ? (
          <View style={styles.cameraErrorContainer}>
            <Text style={styles.permissionText}>Kamera tidak bisa dimuat.</Text>
            <Text style={styles.helperText}>{cameraError}</Text>
            <Pressable style={styles.permissionButton} onPress={resetCameraSession}>
              <Text style={styles.permissionButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              key={cameraKey}
              ref={(ref) => {
                cameraRef.current = ref;
              }}
              style={StyleSheet.absoluteFill}
              facing="front"
              enableTorch={false}
              mode="picture"
              active={visible && !previewUri}
              onCameraReady={() => setCameraReady(true)}
              onMountError={handleCameraError}
            />
            <View style={styles.cameraOverlay}>
              {cameraReady ? (
                <Text style={styles.overlayText}>Posisikan wajahmu di tengah layar</Text>
              ) : (
                <View style={styles.cameraLoading}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.overlayText}>Menyiapkan kamera...</Text>
                </View>
              )}
            </View>
            {renderWatermark()}
          </View>
        )}

        <View style={styles.footer}>
          {!permission?.granted ? null : previewUri ? (
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton} onPress={handleRetake}>
                <Text style={styles.secondaryButtonText}>Ulangi Foto</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleUseSelfie}>
                <Text style={styles.primaryButtonText}>Gunakan Selfie</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                styles.primaryButton,
                (capturing || !cameraReady || !!cameraError) && styles.disabledButton,
              ]}
              onPress={takeSelfie}
              disabled={capturing || !cameraReady || !!cameraError}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Ambil Selfie</Text>
              )}
            </Pressable>
          )}
          {!permission?.granted ? (
            <Text style={styles.helperText}>Selfie opsional jika izin kamera ditolak.</Text>
          ) : (
            <Text style={styles.helperText}>
              Foto hanya digunakan untuk absensi, tidak disimpan ke galeri.
            </Text>
          )}
        </View>
        </View>
      ) : null}
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
  skipButton: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDE3F4",
  },
  skipButtonText: {
    color: UI_COLORS.secondary,
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
    top: 24,
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
  cameraLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  watermark: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "flex-end",
  },
  watermarkText: {
    color: "#fff",
    fontSize: 11,
    lineHeight: 14,
  },
  cameraErrorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
});
