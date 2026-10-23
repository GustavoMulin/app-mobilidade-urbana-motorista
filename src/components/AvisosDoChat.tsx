import { FATOR_FONTE_GLOBAL, Text } from "@/components/common/Texto";
import type { MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

// Mensagens que chegam com o chat fechado viram pop-ups no topo: a mais nova
// entra em cima, as anteriores descem, e cada uma some sozinha. Tocar abre a
// conversa; arrastar para o lado dispensa, como uma notificação do celular.
// O que já estava na conversa ao abrir a corrida não vira aviso.
interface Props {
  corridaId: number | null;
  recebidas: MensagemDaCorrida[];
  carregada: boolean;
  onAbrir: () => void;
  distanciaDoTopo?: number;
}

interface Aviso {
  id: number;
  autor: string;
  conteudo: string;
}

// o app do motorista reduz toda a tipografia; o pop-up fica do tamanho do
// pop-up do passageiro
const fonte = (tamanho: number) => tamanho / FATOR_FONTE_GLOBAL;

const VIDA_MS = 6000;
const MAXIMO_NA_TELA = 3;

function BarraDeVida() {
  const restante = useSharedValue(1);

  useEffect(() => {
    restante.value = withTiming(0, {
      duration: VIDA_MS,
      easing: Easing.linear,
    });
  }, [restante]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ scaleX: restante.value }],
  }));

  return <Animated.View style={[styles.barra, estilo]} />;
}

interface CartaoProps {
  aviso: Aviso;
  antigo: boolean;
  onAbrir: () => void;
  onDispensar: (id: number) => void;
}

function CartaoDoAviso({ aviso, antigo, onAbrir, onDispensar }: CartaoProps) {
  const { width: largura } = useWindowDimensions();
  const deslocamento = useSharedValue(0);

  const arrastar = Gesture.Pan()
    // só o arrasto para os lados; o toque continua abrindo a conversa
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((evento) => {
      deslocamento.value = evento.translationX;
    })
    .onEnd((evento) => {
      const longe = Math.abs(evento.translationX) > largura * 0.3;
      const rapido = Math.abs(evento.velocityX) > 650;
      if (!longe && !rapido) {
        deslocamento.value = withSpring(0, { damping: 18, stiffness: 220 });
        return;
      }
      const lado =
        (rapido ? evento.velocityX : evento.translationX) < 0 ? -1 : 1;
      deslocamento.value = withTiming(
        lado * largura,
        { duration: 170, easing: Easing.out(Easing.quad) },
        (terminou) => {
          if (terminou) scheduleOnRN(onDispensar, aviso.id);
        },
      );
    });

  const estilo = useAnimatedStyle(() => ({
    // o aviso mais antigo fica um pouco atrás; arrastando, vai sumindo
    opacity:
      (antigo ? 0.92 : 1) *
      (1 - Math.min(Math.abs(deslocamento.value) / largura, 1) * 0.85),
    transform: [
      { translateX: deslocamento.value },
      { scale: antigo ? 0.97 : 1 },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOut.duration(220)}
      layout={LinearTransition.springify().damping(18)}
    >
      <GestureDetector gesture={arrastar}>
        <Animated.View style={[styles.cartao, estilo]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mensagem de ${aviso.autor}: ${aviso.conteudo}. Tocar para abrir a conversa`}
            accessibilityHint="Arraste para o lado para dispensar"
            accessibilityActions={[{ name: "dismiss", label: "Dispensar" }]}
            onAccessibilityAction={() => onDispensar(aviso.id)}
            onPress={onAbrir}
            style={styles.toque}
          >
            <View style={styles.icone}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#111" />
            </View>
            <View style={styles.textos}>
              <Text style={styles.autor} numberOfLines={1}>
                {aviso.autor}
              </Text>
              <Text style={styles.conteudo} numberOfLines={2}>
                {aviso.conteudo}
              </Text>
            </View>
            <Text style={styles.responder}>Responder</Text>
          </Pressable>
          <BarraDeVida />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function AvisosDoChat({
  corridaId,
  recebidas,
  carregada,
  onAbrir,
  distanciaDoTopo = 72,
}: Props) {
  const insets = useSafeAreaInsets();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const vistos = useRef<{ corridaId: number | null; ids: Set<number> }>({
    corridaId: null,
    ids: new Set(),
  });
  const historicoMarcado = useRef<number | null>(null);
  const relogios = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // a pilha acompanha o que está no topo da tela (pílula, cartão de manobra)
  // e desliza quando ele muda de altura, sem pular
  const topo = useSharedValue(insets.top + distanciaDoTopo);
  useEffect(() => {
    topo.set(
      withTiming(insets.top + distanciaDoTopo, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [topo, insets.top, distanciaDoTopo]);
  const estiloDoTopo = useAnimatedStyle(() => ({ top: topo.value }));

  useEffect(() => {
    const ativos = relogios.current;
    return () => {
      ativos.forEach(clearTimeout);
      ativos.clear();
    };
  }, []);

  useEffect(() => {
    if (vistos.current.corridaId !== corridaId) {
      vistos.current = { corridaId, ids: new Set() };
      historicoMarcado.current = null;
      relogios.current.forEach(clearTimeout);
      relogios.current.clear();
      setAvisos((atuais) => (atuais.length === 0 ? atuais : []));
    }
    if (corridaId === null || !carregada) return;

    // a primeira carga é histórico: só o que chegar depois vira aviso
    if (historicoMarcado.current !== corridaId) {
      historicoMarcado.current = corridaId;
      recebidas.forEach((item) => {
        if (item.id !== null) vistos.current.ids.add(item.id);
      });
      return;
    }

    // chat aberto (lista vazia): os avisos da tela saem junto
    if (recebidas.length === 0) {
      relogios.current.forEach(clearTimeout);
      relogios.current.clear();
      setAvisos((atuais) => (atuais.length === 0 ? atuais : []));
      return;
    }

    const novos: Aviso[] = [];
    recebidas.forEach((item) => {
      if (item.id === null || vistos.current.ids.has(item.id)) return;
      vistos.current.ids.add(item.id);
      novos.push({
        id: item.id,
        autor:
          item.autor_nome?.trim().split(/\s+/)[0] ||
          (item.autor_tipo === "motorista" ? "Motorista" : "Passageiro"),
        conteudo: item.conteudo,
      });
    });
    if (novos.length === 0) return;

    novos.forEach((aviso) => {
      relogios.current.set(
        aviso.id,
        setTimeout(() => {
          relogios.current.delete(aviso.id);
          setAvisos((atuais) => atuais.filter((item) => item.id !== aviso.id));
        }, VIDA_MS),
      );
    });
    setAvisos((atuais) =>
      [...novos.reverse(), ...atuais].slice(0, MAXIMO_NA_TELA),
    );
  }, [corridaId, carregada, recebidas]);

  const dispensar = useCallback((id: number) => {
    const relogio = relogios.current.get(id);
    if (relogio !== undefined) clearTimeout(relogio);
    relogios.current.delete(id);
    setAvisos((atuais) => atuais.filter((item) => item.id !== id));
  }, []);

  const abrir = useCallback(() => {
    relogios.current.forEach(clearTimeout);
    relogios.current.clear();
    setAvisos([]);
    onAbrir();
  }, [onAbrir]);

  if (avisos.length === 0) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.pilha, estiloDoTopo]}
    >
      {avisos.map((aviso, posicao) => (
        <CartaoDoAviso
          key={aviso.id}
          aviso={aviso}
          antigo={posicao > 0}
          onAbrir={abrir}
          onDispensar={dispensar}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pilha: {
    position: "absolute",
    left: 12,
    right: 12,
    gap: 8,
    // acima da navegação ativa (zIndex/elevation 100), que cobre a tela toda
    zIndex: 120,
    elevation: 120,
  },
  cartao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  toque: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icone: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  textos: { flex: 1 },
  autor: { color: "#111", fontSize: fonte(14), fontWeight: "800" },
  conteudo: { color: "#333", fontSize: fonte(14), lineHeight: fonte(19) },
  responder: { color: "#1C6FD1", fontSize: fonte(13), fontWeight: "700" },
  barra: {
    backgroundColor: "#FFD600",
    height: 3,
    transformOrigin: "left",
    width: "100%",
  },
});
