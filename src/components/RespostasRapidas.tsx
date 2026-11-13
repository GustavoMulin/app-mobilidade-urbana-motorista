import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

// Lista de frases de um toque do chat, uma por linha, ocupando toda a largura
// abaixo do campo de texto. Sem tempo de exibição: o efeito de tempo acabando
// fica só no painel do mapa, que disputa espaço com a rota. A frase enviada
// sai e as outras sobem.
interface Props {
  respostas: string[];
  onEnviar: (texto: string) => void;
  // primeira linha: leva à tela onde as frases são adicionadas e editadas
  onEditar?: () => void;
  // espaço da barra de gestos/teclado, pintado da cor da lista
  paddingInferior?: number;
}

export default function RespostasRapidas({
  respostas,
  onEnviar,
  onEditar,
  paddingInferior = 0,
}: Props) {
  if (respostas.length === 0 && !onEditar) return null;

  return (
    <ScrollView
      style={styles.lista}
      contentContainerStyle={{ paddingBottom: paddingInferior }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {onEditar ? (
        <TouchableOpacity
          style={styles.resposta}
          accessibilityRole="button"
          accessibilityLabel="Adicionar ou editar frases rápidas"
          activeOpacity={0.7}
          onPress={onEditar}
        >
          <Ionicons name="add-circle-outline" size={22} color="#E8590C" />
          <Text style={styles.editarTexto}>Adicionar/Editar frases</Text>
        </TouchableOpacity>
      ) : null}
      {respostas.map((resposta) => (
        <Animated.View
          key={resposta}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          layout={LinearTransition.duration(200)}
        >
          <TouchableOpacity
            style={styles.resposta}
            accessibilityRole="button"
            accessibilityHint="Toque para enviar."
            activeOpacity={0.7}
            onPress={() => onEnviar(resposta)}
          >
            <Text style={styles.respostaTexto}>{resposta}</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lista: { maxHeight: 270, backgroundColor: "#F1F1F3" },
  resposta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F1F1F3",
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  respostaTexto: { flex: 1, fontSize: 17, lineHeight: 23, color: "#111" },
  editarTexto: { fontSize: 17, lineHeight: 23, color: "#E8590C" },
});
