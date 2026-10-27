import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface Props {
  tamanho?: number;
  cor?: string;
  children?: ReactNode;
}

function useGiro(duracao: number) {
  const giro = useSharedValue(0);

  useEffect(() => {
    giro.set(
      withRepeat(
        withTiming(360, { duration: duracao, easing: Easing.linear }),
        -1,
      ),
    );
    return () => cancelAnimation(giro);
  }, [giro, duracao]);

  return giro;
}

export default function Carregando3D({
  tamanho = 56,
  cor = "#FFD600",
  children,
}: Props) {
  const giroY = useGiro(1500);
  const giroX = useGiro(2100);
  const pulso = useSharedValue(1);

  useEffect(() => {
    pulso.set(
      withRepeat(
        withSequence(
          withTiming(1.25, {
            duration: 600,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(0.8, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(pulso);
  }, [pulso]);

  const anelExterno = useAnimatedStyle(() => ({
    transform: [{ perspective: 420 }, { rotateY: `${giroY.value}deg` }],
  }));
  const anelDoMeio = useAnimatedStyle(() => ({
    transform: [{ perspective: 420 }, { rotateX: `${giroX.value}deg` }],
  }));
  const nucleo = useAnimatedStyle(() => ({
    transform: [{ scale: pulso.value }],
  }));

  const espessura = Math.max(3, Math.round(tamanho * 0.07));
  const medio = tamanho * 0.74;
  const centro = tamanho * 0.2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      style={{ width: tamanho, height: tamanho }}
    >
      <Animated.View
        style={[
          styles.anel,
          anelExterno,
          {
            width: tamanho,
            height: tamanho,
            borderRadius: tamanho / 2,
            borderWidth: espessura,
            borderColor: cor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.anel,
          anelDoMeio,
          {
            width: medio,
            height: medio,
            borderRadius: medio / 2,
            borderWidth: espessura,
            borderColor: cor,
            opacity: 0.55,
            left: (tamanho - medio) / 2,
            top: (tamanho - medio) / 2,
          },
        ]}
      />
      <View style={styles.centro} pointerEvents="none">
        {children ?? (
          <Animated.View
            style={[
              nucleo,
              {
                width: centro,
                height: centro,
                borderRadius: centro / 2,
                backgroundColor: cor,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anel: { position: "absolute", left: 0, top: 0 },
  centro: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
