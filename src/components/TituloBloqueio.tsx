import { Text } from "@/components/common/Texto";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const TEXTOS = ["Não é possível ficar conectado", "A conta requer atenção"];
const TROCA_MS = 3000;
// o vermelho é o aviso do toque: aparece mesmo com animações reduzidas no aparelho
const SEMPRE = { reduceMotion: ReduceMotion.Never };

// cada toque no "Conectar" com ação pendente aumenta `aviso` e a faixa fica vermelha
export default function TituloBloqueio({ aviso }: { aviso: number }) {
  const [indice, setIndice] = useState(0);
  const [avisoVisto, setAvisoVisto] = useState(aviso);
  const alerta = useSharedValue(0);

  // no aviso volta ao primeiro texto, o mesmo que o vermelho mostra
  if (aviso !== avisoVisto) {
    setAvisoVisto(aviso);
    setIndice(0);
  }

  // reinicia a contagem a cada aviso para o primeiro texto ficar o tempo todo
  useEffect(() => {
    const relogio = setInterval(
      () => setIndice((atual) => (atual + 1) % TEXTOS.length),
      TROCA_MS,
    );
    return () => clearInterval(relogio);
  }, [aviso]);

  useEffect(() => {
    if (aviso === 0) return;
    alerta.set(
      withSequence(
        ReduceMotion.Never,
        withTiming(1, { duration: 150, ...SEMPRE }),
        withDelay(
          1800,
          withTiming(0, { duration: 400, ...SEMPRE }),
          ReduceMotion.Never,
        ),
      ),
    );
  }, [aviso, alerta]);

  const vermelho = useAnimatedStyle(() => ({ opacity: alerta.get() }));

  return (
    <View
      style={styles.faixa}
      accessible
      accessibilityRole="header"
      accessibilityLabel={TEXTOS[0]}
    >
      <Animated.View
        key={indice}
        entering={FadeIn.duration(350)}
        exiting={FadeOut.duration(350)}
        style={styles.camada}
      >
        <Text maxFontSizeMultiplier={1.1} style={styles.texto}>
          {TEXTOS[indice]}
        </Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.camada, styles.vermelho, vermelho]}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          style={[styles.texto, styles.textoAlerta]}
        >
          {TEXTOS[0]}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // de borda a borda, como a faixa das ações logo abaixo
  faixa: { height: 28, marginHorizontal: -16 },
  camada: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  vermelho: { backgroundColor: "#E8604C" },
  texto: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111",
  },
  textoAlerta: { color: "#FFF" },
});
