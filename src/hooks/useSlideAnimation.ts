// hooks/useSlideAnimation.ts
import { useCallback, useEffect, useState } from "react";
import { Animated } from "react-native";

export interface AnimationConfig {
  damping?: number;
  stiffness?: number;
  duration?: number;
  overlayDuration?: number;
}

export function useSlideAnimation(
  visible: boolean,
  drawerWidth: number,
  config: AnimationConfig = {},
) {
  const {
    damping = 20,
    stiffness = 90,
    duration = 250,
    overlayDuration = 300,
  } = config;

  const [translateX] = useState(() => new Animated.Value(-drawerWidth));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping,
          stiffness,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: overlayDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    visible,
    damping,
    stiffness,
    overlayDuration,
    overlayOpacity,
    translateX,
  ]);

  const closeAnimation = useCallback(
    (onClose: () => void) => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -drawerWidth,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: overlayDuration - 100,
          useNativeDriver: true,
        }),
      ]).start(onClose);
    },
    [drawerWidth, duration, overlayDuration, overlayOpacity, translateX],
  );

  return {
    translateX,
    overlayOpacity,
    closeAnimation,
  };
}
