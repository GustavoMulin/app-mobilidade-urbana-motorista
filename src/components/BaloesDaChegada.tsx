import { Text } from "@/components/common/Texto";
import { useToast } from "@/context/ToastContext";
import { MENSAGENS_RAPIDAS_VISIVEIS } from "@/domain/mensagensRapidas";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  type EntryExitAnimationFunction,
  FadeIn,
  FadeOutRight,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

const MOLA = { damping: 15, stiffness: 150, mass: 0.9 };

const abrirPainel: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [
        { perspective: 900 },
        { translateY: 50 },
        { rotateX: "-75deg" },
      ],
    },
    animations: {
      opacity: withTiming(1, { duration: 160 }),
      transform: [
        { perspective: 900 },
        { translateY: withSpring(0, MOLA) },
        { rotateX: withSpring("0deg", MOLA) },
      ],
    },
  };
};

const fecharPainel: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: {
      opacity: 1,
      transform: [{ perspective: 900 }, { translateY: 0 }, { rotateX: "0deg" }],
    },
    animations: {
      opacity: withTiming(0, { duration: 200 }),
      transform: [
        { perspective: 900 },
        { translateY: withTiming(40, { duration: 220 }) },
        { rotateX: withTiming("-75deg", { duration: 220 }) },
      ],
    },
  };
};

// o painel espera um pouco para entrar, fica 10 s e some com o botão
const ATRASO_MS = 3500;
const EXIBICAO_MS = 10_000;

// No embarque o motorista fica parado e o mapa não tem nada novo: o painel
// ocupa esse espaço com as mensagens de um toque, sem abrir a conversa. Cada
// uma sai do painel quando aparece na conversa (enviada por aqui ou pelo chat).
// Recolhido pelo motorista, vira uma pílula que abre de novo; com o tempo
// esgotado, painel e pílula saem de vez.
interface Props {
  enviadas: string[];
  // as frases da etapa, na ordem das preferências do motorista
  mensagens: string[];
  onEnviar: (texto: string) => Promise<boolean>;
  // quanto o painel (ou a pílula) ocupa acima da folha, 0 quando não aparece
  onAlturaChange?: (altura: number) => void;
}

// monta a cada abertura do painel, sempre cheia
function BarraDoTempo() {
  const restante = useSharedValue(1);

  useEffect(() => {
    restante.set(
      withTiming(0, { duration: EXIBICAO_MS, easing: Easing.linear }),
    );
  }, [restante]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ scaleX: restante.value }],
  }));

  return (
    <View style={styles.trilho}>
      <Animated.View style={[styles.barra, estilo]} />
    </View>
  );
}

export default function BaloesDaChegada({
  enviadas,
  mensagens,
  onEnviar,
  onAlturaChange,
}: Props) {
  const { mostrarToast } = useToast();
  const { height: alturaTela } = useWindowDimensions();
  const compacto = alturaTela < 700;
  const [fase, setFase] = useState<
    "aguardando" | "aberto" | "recolhido" | "expirado"
  >("aguardando");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [falhou, setFalhou] = useState<string | null>(null);
  // trava na hora do toque: dois toques seguidos não mandam duas mensagens
  const travado = useRef(false);

  useEffect(() => {
    if (fase === "aguardando") {
      const entrada = setTimeout(() => setFase("aberto"), ATRASO_MS);
      return () => clearTimeout(entrada);
    }
    if (fase === "aberto") {
      const fim = setTimeout(() => setFase("expirado"), EXIBICAO_MS);
      return () => clearTimeout(fim);
    }
  }, [fase]);

  const candidatas = mensagens.slice(0, MENSAGENS_RAPIDAS_VISIVEIS);
  const pendentes = candidatas;
  // enviou qualquer uma (por aqui ou pelo chat): o painel inteiro some
  const jaEnviou = candidatas.some((mensagem) => enviadas.includes(mensagem));

  const visivel =
    !jaEnviou &&
    pendentes.length > 0 &&
    fase !== "aguardando" &&
    fase !== "expirado";

  useEffect(() => {
    if (!visivel) onAlturaChange?.(0);
  }, [visivel, onAlturaChange]);

  if (!visivel) return null;

  const enviar = async (mensagem: string) => {
    if (travado.current) return;
    travado.current = true;
    setEnviando(mensagem);
    setFalhou(null);
    try {
      if (await onEnviar(mensagem)) {
        setFase("expirado");
        mostrarToast({
          tipo: "success",
          titulo: "Mensagem enviada",
          chave: "mensagem-rapida:enviada",
          duracaoMs: 1500,
        });
      } else {
        setFalhou(mensagem);
      }
    } finally {
      setEnviando(null);
      travado.current = false;
    }
  };

  if (fase === "recolhido") {
    return (
      <View
        style={styles.lugarDaPilula}
        pointerEvents="box-none"
        onLayout={({ nativeEvent }) =>
          onAlturaChange?.(Math.ceil(nativeEvent.layout.height) + 10)
        }
      >
        <Animated.View entering={ZoomIn.springify().damping(16)}>
          <TouchableOpacity
            style={styles.pilula}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir mensagens rápidas para o passageiro"
            onPress={() => setFase("aberto")}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#111" />
            <Text style={styles.pilulaTexto}>Mensagens rápidas</Text>
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{pendentes.length}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={abrirPainel}
      exiting={fecharPainel}
      layout={LinearTransition.springify().damping(20)}
      style={styles.painel}
      onLayout={({ nativeEvent }) =>
        onAlturaChange?.(Math.ceil(nativeEvent.layout.height) + 10)
      }
    >
      <View style={styles.cabecalho}>
        <View style={styles.iconeCabecalho}>
          <Ionicons name="chatbubbles" size={18} color="#111" />
        </View>
        <View style={styles.cabecalhoTextos}>
          <Text style={styles.titulo}>Avise o passageiro</Text>
          <Text style={styles.subtitulo}>Um toque envia no chat</Text>
        </View>
        <TouchableOpacity
          style={styles.fechar}
          accessibilityRole="button"
          accessibilityLabel="Recolher mensagens rápidas"
          hitSlop={8}
          onPress={() => setFase("recolhido")}
        >
          <Ionicons name="chevron-down" size={20} color="#444" />
        </TouchableOpacity>
      </View>

      <BarraDoTempo />

      <View style={styles.lista}>
        {pendentes.map((mensagem) => {
          const ocupado = enviando === mensagem;
          const erro = falhou === mensagem;
          return (
            <Animated.View
              key={mensagem}
              entering={FadeIn.duration(160)}
              exiting={FadeOutRight.duration(220)}
              layout={LinearTransition.springify().damping(20)}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Enviar ao passageiro: ${mensagem}`}
                activeOpacity={0.75}
                disabled={enviando !== null}
                onPress={() => void enviar(mensagem)}
                style={[
                  styles.mensagem,
                  compacto && styles.mensagemCompacta,
                  ocupado && styles.mensagemEnviando,
                ]}
              >
                <View style={styles.mensagemTextos}>
                  <Text style={styles.mensagemTexto} numberOfLines={2}>
                    {mensagem}
                  </Text>
                  {erro ? (
                    <Text style={styles.erro}>
                      Não foi enviada. Toque para tentar de novo.
                    </Text>
                  ) : null}
                </View>
                {ocupado ? (
                  <ActivityIndicator size="small" color="#111" />
                ) : (
                  <View style={styles.enviar}>
                    <Ionicons name="send" size={15} color="#111" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  painel: {
    transformOrigin: "bottom",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 10,
    marginHorizontal: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  cabecalho: { alignItems: "center", flexDirection: "row", gap: 10 },
  iconeCabecalho: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  cabecalhoTextos: { flex: 1 },
  titulo: { color: "#111", fontSize: 17, fontWeight: "800" },
  subtitulo: { color: "#6B7280", fontSize: 13 },
  fechar: {
    alignItems: "center",
    backgroundColor: "#F2F3F5",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  trilho: {
    backgroundColor: "#F2F3F5",
    borderRadius: 3,
    height: 6,
    marginBottom: 10,
    marginTop: 10,
    overflow: "hidden",
  },
  barra: {
    backgroundColor: "#FFD600",
    borderRadius: 3,
    height: "100%",
    transformOrigin: "left",
    width: "100%",
  },
  lista: { gap: 8 },
  mensagem: {
    alignItems: "center",
    backgroundColor: "#F6F7F9",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mensagemCompacta: { minHeight: 48, paddingVertical: 6 },
  mensagemEnviando: { backgroundColor: "#FFF4B8" },
  mensagemTextos: { flex: 1 },
  mensagemTexto: { color: "#111", fontSize: 16, fontWeight: "700" },
  erro: { color: "#B42318", fontSize: 12, fontWeight: "600", marginTop: 2 },
  enviar: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  lugarDaPilula: {
    alignItems: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  pilula: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pilulaTexto: { color: "#111", fontSize: 15, fontWeight: "700" },
  contador: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
  },
  contadorTexto: { color: "#111", fontSize: 12, fontWeight: "800" },
});
