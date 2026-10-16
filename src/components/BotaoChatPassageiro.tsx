import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

interface Props {
  naoLidas: number;
  onPress: () => void;
  // mesmo tamanho e cor do botão de ligar ao lado
  estilo: ViewStyle;
}

// abre a conversa com o passageiro; o selo conta o que chegou sem ser lido
export default function BotaoChatPassageiro({
  naoLidas,
  onPress,
  estilo,
}: Props) {
  return (
    <TouchableOpacity
      style={estilo}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversar com o passageiro${naoLidas > 0 ? `, ${naoLidas} ${naoLidas === 1 ? "mensagem nova" : "mensagens novas"}` : ""}`}
    >
      <Ionicons name="chatbubble-outline" size={20} color="#111" />
      {naoLidas > 0 ? (
        <View style={styles.selo}>
          <Text style={styles.seloTexto}>{naoLidas > 9 ? "9+" : naoLidas}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  selo: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5372B",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  seloTexto: { color: "#FFF", fontSize: 10, fontWeight: "800" },
});
