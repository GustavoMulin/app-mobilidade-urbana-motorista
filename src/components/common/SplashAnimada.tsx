import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Carregando3D from "./Carregando3D";

const AMARELO = "#FFD600";
const TAMANHO_ANEIS = 210;
const TAMANHO_MOEDA = 124;

export default function SplashAnimada() {
  const entrada = useSharedValue(0);
  const balanco = useSharedValue(0);

  useEffect(() => {
    entrada.value = withSpring(1, { damping: 11, stiffness: 70, mass: 1 });
    balanco.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, {
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
      ),
    );
  }, [entrada, balanco]);

  const moeda = useAnimatedStyle(() => ({
    opacity: Math.min(entrada.value * 2.5, 1),
    transform: [
      { perspective: 700 },
      { rotateY: `${-540 * (1 - entrada.value) + balanco.value * 14}deg` },
      { scale: 0.5 + 0.5 * Math.min(entrada.value, 1) },
    ],
  }));

  return (
    <View style={styles.tela}>
      <Carregando3D tamanho={TAMANHO_ANEIS} cor={AMARELO}>
        <Animated.View style={[styles.moeda, moeda]}>
          <Text allowFontScaling={false} style={styles.numero}>
            69
          </Text>
        </Animated.View>
      </Carregando3D>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D0D",
  },
  moeda: {
    width: TAMANHO_MOEDA,
    height: TAMANHO_MOEDA,
    borderRadius: TAMANHO_MOEDA / 2,
    backgroundColor: AMARELO,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AMARELO,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    backfaceVisibility: "visible",
  },
  numero: { fontSize: 54, fontWeight: "900", color: "#111", lineHeight: 60 },
});
