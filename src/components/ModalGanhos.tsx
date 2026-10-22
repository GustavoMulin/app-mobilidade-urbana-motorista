// components/ModalGanhos.tsx
import {
  ModalAnimationConfig,
  useModalAnimation,
} from "@/hooks/useModalAnimation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

interface ModalGanhosProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  config?: ModalAnimationConfig;
}

export default function ModalGanhos({
  visible,
  onClose,
  children,
  config = { slideFrom: "bottom" },
}: ModalGanhosProps) {
  const { slideAnim, overlayOpacity, closeAnimation } = useModalAnimation(
    visible,
    config,
  );

  const handleClose = useCallback(() => {
    closeAnimation(() => {
      onClose?.(); // Fecha no final da animação
    });
  }, [closeAnimation, onClose]);

  const [pan] = useState(() => new Animated.Value(0));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Ativa o gesto se o movimento for predominantemente para baixo
          return Math.abs(gestureState.dy) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            pan.setValue(gestureState.dy); // Atualiza posição do modal durante o arraste
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -120) {
            // Se arrastar mais de 120px → fecha com animação
            Animated.timing(pan, {
              toValue: -400,
              duration: 200,
              useNativeDriver: true,
            }).start(handleClose);
          } else {
            // Volta à posição inicial se o gesto for curto
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [handleClose, pan],
  );

  const [mounted, setMounted] = React.useState(visible);
  useEffect(() => {
    if (visible) {
      setTimeout(() => setMounted(true), 0);
    } else {
      // espera a duração da animação antes de desmontar
      const timer = setTimeout(() => setMounted(false), config.duration || 400);
      return () => clearTimeout(timer);
    }
  }, [visible, config.duration]);

  if (!mounted) return null;

  const combinedTranslateY = Animated.add(slideAnim, pan);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </Pressable>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.modalContainer,
          config.slideFrom === "top" ? styles.fromTop : styles.fromBottom,
          { transform: [{ translateY: combinedTranslateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  fromTop: {
    top: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  fromBottom: {
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
