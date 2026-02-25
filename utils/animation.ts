import { LayoutAnimation } from 'react-native';

// setLayoutAnimationEnabledExperimental is a no-op in New Architecture; avoid calling to prevent warning.

export const animateLayoutTransition = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch {
    // Fallback silently when layout animation is not supported.
  }
};
