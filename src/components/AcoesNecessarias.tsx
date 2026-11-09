import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// da alça da folha até o fim da faixa: quanto a folha sobe acima do "Conectar"
export const ALTURA_COM_ACOES = 170;

interface Props {
  acoes: string[];
  onPress: () => void;
}

export default function AcoesNecessarias({ acoes, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.faixa}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text maxFontSizeMultiplier={1.1} style={styles.titulo}>
        Ações necessárias ({acoes.length})
      </Text>
      <Text maxFontSizeMultiplier={1.1} style={styles.subtitulo}>
        Ficar online quando resolvido
      </Text>
      <View style={styles.linha}>
        <Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          style={styles.chamada}
        >
          Toque para ver o que resolver
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#1F1F1F" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  faixa: {
    alignSelf: "stretch",
    // anula o recuo da folha: a faixa vai de borda a borda
    marginHorizontal: -16,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#FCE8E6",
  },
  titulo: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: "#1F1F1F" },
  subtitulo: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#C5221F",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  chamada: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: "#1F1F1F",
  },
});
