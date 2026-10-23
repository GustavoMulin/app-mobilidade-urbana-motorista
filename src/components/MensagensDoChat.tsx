import { Text } from "@/components/common/Texto";
import { ehMinha, type MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  type EntryExitAnimationFunction,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface Props {
  mensagens: MensagemDaCorrida[];
  textoVazio: string;
  onReenviar: (mensagem: MensagemDaCorrida) => void;
}

const MOLA = { damping: 17, stiffness: 240, mass: 0.8 };

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// chave estável: a mensagem enviada daqui passa de "enviando" para o id do
// servidor sem remontar (e sem animar de novo)
const chave = (item: MensagemDaCorrida, indice: number) =>
  item.client_message_id ??
  (item.id !== null ? `id-${item.id}` : `i-${indice}`);

// a minha sobe do campo de texto; a do outro cresce do canto esquerdo
const entradaMinha: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 22 }, { scale: 0.86 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 140 }),
      transform: [
        { translateY: withSpring(0, MOLA) },
        { scale: withSpring(1, MOLA) },
      ],
    },
  };
};

const entradaDoOutro: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: -16 }, { scale: 0.86 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 180 }),
      transform: [
        { translateX: withSpring(0, MOLA) },
        { scale: withSpring(1, MOLA) },
      ],
    },
  };
};

// Lista da conversa. Monta a cada abertura do chat: o que já estava na
// conversa aparece parado, só o que chega ou sai depois entra animado.
export default function MensagensDoChat({
  mensagens,
  textoVazio,
  onReenviar,
}: Props) {
  const lista = useRef<FlatList<MensagemDaCorrida>>(null);
  const [doHistorico] = useState(() => new Set(mensagens.map(chave)));

  const descer = () => lista.current?.scrollToEnd({ animated: true });

  return (
    <FlatList
      ref={lista}
      data={mensagens}
      keyExtractor={chave}
      // mensagem nova (e a primeira abertura): desce depois de medir o conteúdo
      onContentSizeChange={descer}
      // teclado ou sugestões mudando de altura encolhem a lista: a última
      // mensagem continua à vista
      onLayout={descer}
      contentContainerStyle={styles.mensagens}
      ListEmptyComponent={
        <View style={styles.vazio}>
          <Ionicons name="chatbubbles-outline" size={34} color="#9CA3AF" />
          <Text style={styles.vazioTexto}>{textoVazio}</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const minha = ehMinha(item);
        const nova = !doHistorico.has(chave(item, index));
        const enviada = minha && !item.enviando && !item.falhou;
        return (
          <View style={[styles.linha, minha && styles.linhaMinha]}>
            <Animated.View
              entering={
                nova ? (minha ? entradaMinha : entradaDoOutro) : undefined
              }
              style={[
                styles.entrada,
                minha ? styles.entradaMinha : styles.entradaDoOutro,
              ]}
            >
              <Animated.View
                style={[
                  styles.balao,
                  minha ? styles.balaoMeu : styles.balaoDele,
                  item.enviando && styles.balaoEnviando,
                ]}
              >
                <Text style={styles.conteudo}>{item.conteudo}</Text>
                <View style={styles.rodapeDoBalao}>
                  <Text style={styles.hora}>
                    {item.enviando ? "Enviando..." : hora(item.created_at)}
                  </Text>
                  {enviada ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color="#8A6100"
                      accessibilityLabel="Enviada"
                    />
                  ) : null}
                </View>
              </Animated.View>
            </Animated.View>
            {item.falhou ? (
              <TouchableOpacity
                style={styles.falhou}
                accessibilityRole="button"
                accessibilityLabel="Mensagem não enviada. Tocar para tentar de novo"
                onPress={() => onReenviar(item)}
              >
                <Ionicons name="alert-circle" size={14} color="#B42318" />
                <Text style={styles.falhouTexto}>
                  Não enviada · tocar para tentar de novo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  mensagens: { padding: 16, gap: 8, flexGrow: 1 },
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  vazioTexto: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  linha: { alignItems: "flex-start" },
  linhaMinha: { alignItems: "flex-end" },
  entrada: { maxWidth: "82%" },
  entradaMinha: { transformOrigin: "right bottom" },
  entradaDoOutro: { transformOrigin: "left bottom" },
  balao: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 2,
    // a confirmação do servidor clareia o balão aos poucos
    transitionProperty: "opacity",
    transitionDuration: 220,
  },
  balaoMeu: { backgroundColor: "#FFF1B8", borderBottomRightRadius: 4 },
  balaoDele: { backgroundColor: "#F2F3F5", borderBottomLeftRadius: 4 },
  balaoEnviando: { opacity: 0.6 },
  conteudo: { fontSize: 15, color: "#111", lineHeight: 21 },
  rodapeDoBalao: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hora: { fontSize: 11, color: "#6B7280" },
  falhou: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
  falhouTexto: { fontSize: 12, fontWeight: "600", color: "#B42318" },
});
