// CODEX: 6 linhas alteradas (4 adicionadas, 2 removidas); permite contraste próprio no rótulo do deslizador. Remover após validação/commit.
import { Text } from "@/components/common/Texto";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";

const TAMANHO_ALCA = 52;
const MARGEM = 4;

interface props {
  rotulo: string;
  cor: string;
  corTexto?: string;
  onConfirmar: () => void;
  desabilitado?: boolean;
}

export default function BotaoDeslizar({
  rotulo,
  cor,
  corTexto = "#FFF",
  onConfirmar,
  desabilitado = false,
}: props) {
  const [largura, setLargura] = useState(0);
  const [deslocamento] = useState(() => new Animated.Value(0));
  const confirmado = useRef(false);
  const desabilitadoRef = useRef(desabilitado);

  useEffect(() => {
    desabilitadoRef.current = desabilitado;
  }, [desabilitado]);

  // o curso é medido a cada render; o PanResponder lê pela ref pra não
  // ficar preso ao valor do primeiro layout
  const cursoRef = useRef(0);
  const curso = Math.max(largura - TAMANHO_ALCA - MARGEM * 2, 0);

  useEffect(() => {
    cursoRef.current = curso;
  }, [curso]);

  const voltar = () => {
    Animated.spring(deslocamento, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  // mantém o callback atual sem recriar o PanResponder
  const onConfirmarRef = useRef(onConfirmar);

  useEffect(() => {
    onConfirmarRef.current = onConfirmar;
  }, [onConfirmar]);

  // O responder só lê as refs quando o usuário inicia um gesto.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesto) =>
        !desabilitadoRef.current &&
        Math.abs(gesto.dx) > 4 &&
        Math.abs(gesto.dx) > Math.abs(gesto.dy),
      onPanResponderMove: (_, gesto) => {
        if (confirmado.current || desabilitadoRef.current) return;

        const limitado = Math.min(Math.max(gesto.dx, 0), cursoRef.current);

        deslocamento.setValue(limitado);
      },
      onPanResponderRelease: (_, gesto) => {
        if (confirmado.current) return;
        if (desabilitadoRef.current) {
          voltar();
          return;
        }

        const curso = cursoRef.current;

        if (curso > 0 && gesto.dx >= curso * 0.75) {
          confirmado.current = true;

          Animated.timing(deslocamento, {
            toValue: curso,
            duration: 120,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished && !desabilitadoRef.current) onConfirmarRef.current();

            // libera pro próximo passo do fluxo
            confirmado.current = false;
            deslocamento.setValue(0);
          });

          return;
        }

        voltar();
      },
      onPanResponderTerminate: voltar,
    }),
  );

  const medir = (evento: LayoutChangeEvent) =>
    setLargura(evento.nativeEvent.layout.width);

  const opacidadeRotulo = deslocamento.interpolate({
    inputRange: [0, Math.max(curso, 1)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={medir}
      style={[
        styles.trilho,
        { backgroundColor: cor },
        desabilitado && styles.desabilitado,
      ]}
    >
      <Animated.View
        style={[styles.rotuloContainer, { opacity: opacidadeRotulo }]}
        pointerEvents="none"
      >
        <Text style={[styles.rotulo, { color: corTexto }]} numberOfLines={2}>
          {rotulo}
        </Text>
      </Animated.View>

      <Animated.View
        style={[styles.alca, { transform: [{ translateX: deslocamento }] }]}
        {...(desabilitado ? {} : responder.panHandlers)}
      >
        <Feather name="chevrons-right" size={24} color={cor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    height: TAMANHO_ALCA + MARGEM * 2,
    borderRadius: (TAMANHO_ALCA + MARGEM * 2) / 2,
    justifyContent: "center",
    alignItems: "center",
  },

  desabilitado: {
    opacity: 0.5,
  },

  rotuloContainer: {
    alignSelf: "stretch",
    paddingLeft: TAMANHO_ALCA + MARGEM * 3,
    paddingRight: MARGEM * 3,
  },

  rotulo: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },

  alca: {
    position: "absolute",
    left: MARGEM,
    width: TAMANHO_ALCA,
    height: TAMANHO_ALCA,
    borderRadius: TAMANHO_ALCA / 2,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
