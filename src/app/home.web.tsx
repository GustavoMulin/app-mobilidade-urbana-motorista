// CODEX: 72 linhas criadas neste arquivo; impede que o navegador carregue o mapa nativo do aplicativo do motorista.
import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

export default function HomeWeb() {
  return (
    <View style={styles.tela}>
      <View style={styles.cartao}>
        <View style={styles.icone}>
          <Ionicons name="phone-portrait-outline" size={34} color="#111" />
        </View>

        <Text style={styles.titulo}>Abra no Expo Go</Text>
        <Text style={styles.mensagem}>
          O mapa, o GPS e a navegação do motorista precisam dos recursos nativos
          do Android ou do iPhone.
        </Text>
        <Text style={styles.instrucao}>
          No Expo Go, use a opção de escanear QR Code dentro do próprio
          aplicativo.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F5F7FA",
  },
  cartao: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 12,
    padding: 28,
    borderRadius: 22,
    backgroundColor: "#FFF",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.10)",
  },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD429",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  mensagem: {
    fontSize: 16,
    lineHeight: 23,
    color: "#444",
    textAlign: "center",
  },
  instrucao: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    textAlign: "center",
  },
});
