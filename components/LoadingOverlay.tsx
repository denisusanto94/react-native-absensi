import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { UI_COLORS } from '@/constants/attendance';

type Props = {
  visible: boolean;
  message?: string;
};

export const LoadingOverlay = ({ visible, message }: Props) => {
  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={UI_COLORS.primary} style={styles.loadingImage} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingImage: {
    marginVertical: 8,
  },
  message: {
    textAlign: 'center',
    color: UI_COLORS.secondary,
    fontWeight: '600',
  },
});
