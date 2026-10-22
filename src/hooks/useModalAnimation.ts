// hooks/useModalAnimation.ts
import { useCallback, useEffect, useState } from "react";
import { Animated, Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface ModalAnimationConfig {
  duration?: number;
  overlayDuration?: number;
  slideFrom?: "bottom" | "top" | "right";
}

const getInitialValue = (slideFrom: ModalAnimationConfig["slideFrom"]) => {
  switch (slideFrom) {
    case "top":
      return -SCREEN_HEIGHT;
    case "right":
      return SCREEN_HEIGHT;
    case "bottom":
    default:
      return SCREEN_HEIGHT;
  }
};

export function useModalAnimation(
  visible: boolean,
  config: ModalAnimationConfig = {},
) {
  const {
    duration = 400,
    overlayDuration = 400,
    slideFrom = "bottom",
  } = config;

  const [slideAnim] = useState(
    () => new Animated.Value(getInitialValue(slideFrom)),
  );
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  // 🔹 Animação de abertura
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: overlayDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, duration, overlayDuration, slideAnim]);

  // 🔹 Corrigido: aguarda animação terminar antes de fechar
  const closeAnimation = useCallback(
    (onClose: () => void) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: getInitialValue(slideFrom),
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: overlayDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 🔸 Só fecha após a animação terminar
        onClose?.();
      });
    },
    [duration, overlayDuration, overlayOpacity, slideAnim, slideFrom],
  );

  return {
    slideAnim,
    overlayOpacity,
    closeAnimation,
  };
}
