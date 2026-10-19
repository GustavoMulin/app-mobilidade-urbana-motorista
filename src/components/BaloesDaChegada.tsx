import { Text } from "@/components/common/Texto";
import { MENSAGENS_DA_CHEGADA } from "@/domain/mensagensRapidas";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";

// No embarque, mensagens de um toque fora do chat: o motorista avisa o
// passageiro sem abrir a conversa. O balão some depois que a mensagem
// aparece na conversa (enviada por aqui ou pelo chat).
interface Props {
  enviadas: string[];
  onEnviar: (texto: string) => Promise<boolean>;
}

export default function BaloesDaChegada({ enviadas, onEnviar }: Props) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [oculto, setOculto] = useState(false);
  // trava na hora do toque: dois toques seguidos não mandam duas mensagens
  const travado = useRef(false);

  const pendentes = MENSAGENS_DA_CHEGADA.filter(
    (mensagem) => !enviadas.includes(mensagem),
  );

  if (oculto || pendentes.length === 0) return null;

  const enviar = async (mensagem: string) => {
    if (travado.current) return;
    travado.current = true;
    setEnviando(mensagem);
    try {
      await onEnviar(mensagem);
    } finally {
      setEnviando(null);
      travado.current = false;
    }
  };

  return (
    <View style={styles.grupo} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.ocultar}
        accessibilityRole="button"
        accessibilityLabel="Esconder mensagens rápidas"
        hitSlop={8}
        onPress={() => setOculto(true)}
      >
        <Ionicons name="close" size={16} color="#444" />
      </TouchableOpacity>

      {pendentes.map((mensagem) => {
        const ocupado = enviando === mensagem;
        return (
          <Animated.View
            key={mensagem}
            entering={FadeInRight.springify().damping(18)}
            exiting={FadeOutRight.duration(200)}
            layout={LinearTransition.springify().damping(18)}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Enviar ao passageiro: ${mensagem}`}
              activeOpacity={0.8}
              disabled={enviando !== null}
              onPress={() => void enviar(mensagem)}
              style={[styles.balao, ocupado && styles.balaoPressionado]}
            >
              <Ionicons
                name={ocupado ? "time-outline" : "chatbubble-ellipses"}
                size={16}
                color="#111"
              />
              <Text style={styles.texto} numberOfLines={2}>
                {mensagem}
              </Text>
              <Ionicons name="send" size={14} color="#6B7280" />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  ocultar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  balao: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomRightRadius: 6,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    maxWidth: 300,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balaoPressionado: { backgroundColor: "#FFF4B8" },
  texto: { color: "#111", flexShrink: 1, fontSize: 14, fontWeight: "600" },
});
