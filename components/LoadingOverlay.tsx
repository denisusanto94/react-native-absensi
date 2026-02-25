import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { UI_COLORS } from '@/constants/attendance';

type Props = {
  visible: boolean;
  message?: string;
};

export const LoadingOverlay = ({ visible, message }: Props) => {
  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      presentationStyle="overFullScreen"
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={UI_COLORS.primary} style={styles.loadingImage} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
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
