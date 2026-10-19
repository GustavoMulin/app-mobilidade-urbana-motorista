import { Text } from "@/components/common/Texto";
import type { MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mensagens que chegam com o chat fechado viram pop-ups no topo: a mais nova
// entra em cima, as anteriores descem, e cada uma some sozinha. Tocar abre a
// conversa. O que já estava na conversa ao abrir a corrida não vira aviso.
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

  if (avisos.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.pilha, { top: insets.top + distanciaDoTopo }]}
    >
      {avisos.map((aviso, posicao) => (
        <Animated.View
          key={aviso.id}
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOut.duration(220)}
          layout={LinearTransition.springify().damping(18)}
          style={[styles.cartao, posicao > 0 && styles.cartaoAntigo]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mensagem de ${aviso.autor}: ${aviso.conteudo}. Tocar para abrir a conversa`}
            onPress={() => {
              relogios.current.forEach(clearTimeout);
              relogios.current.clear();
              setAvisos([]);
              onAbrir();
            }}
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pilha: {
    position: "absolute",
    left: 12,
    right: 12,
    gap: 8,
    zIndex: 70,
    elevation: 70,
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
  cartaoAntigo: { opacity: 0.92, transform: [{ scale: 0.97 }] },
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
  autor: { color: "#111", fontSize: 14, fontWeight: "800" },
  conteudo: { color: "#333", fontSize: 14, lineHeight: 19 },
  responder: { color: "#1C6FD1", fontSize: 13, fontWeight: "700" },
  barra: {
    backgroundColor: "#FFD600",
    height: 3,
    transformOrigin: "left",
    width: "100%",
  },
});
