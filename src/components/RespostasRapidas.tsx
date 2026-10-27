import { Text } from "@/components/common/Texto";
import type { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

// Fileira de respostas de um toque do chat. Sem tempo de exibição: o efeito
// de tempo acabando fica só nos balões do mapa, que disputam espaço com a
// rota. Aqui a resposta enviada sai e as novas sugestões entram suavemente.
interface Props {
  respostas: string[];
  onEnviar: (texto: string) => void;
  // antes das respostas (ex.: caneta para criar uma)
  inicio?: ReactNode;
  destacadas?: string[];
  onSegurar?: (texto: string) => void;
}

export default function RespostasRapidas({
  respostas,
  onEnviar,
  inicio,
  destacadas = [],
  onSegurar,
}: Props) {
  if (!inicio && respostas.length === 0) return null;

  return (
    <View style={styles.fileira}>
      {inicio}
      {respostas.map((resposta) => {
        const destacada = destacadas.includes(resposta);
        return (
          <Animated.View
            key={resposta}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
            layout={LinearTransition.duration(200)}
          >
            <TouchableOpacity
              style={[styles.resposta, destacada && styles.respostaDestacada]}
              accessibilityRole="button"
              accessibilityHint={
                onSegurar && destacada
                  ? "Toque para enviar. Toque e segure para remover."
                  : "Toque para enviar."
              }
              onPress={() => onEnviar(resposta)}
              onLongPress={
                onSegurar && destacada ? () => onSegurar(resposta) : undefined
              }
            >
              <Text style={styles.respostaTexto} numberOfLines={1}>
                {resposta}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // duas respostas cabem na tela: toque único, sem rolar para o lado
  fileira: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resposta: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    maxWidth: "100%",
    justifyContent: "center",
  },
  respostaDestacada: { backgroundColor: "#FFF8D6", borderColor: "#F2D45C" },
  respostaTexto: { fontSize: 13, color: "#111", fontWeight: "600" },
});
