import { useToast } from "@/context/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  ativo: boolean;
  onAlternar: () => void;
}

// atalho de acessibilidade ao lado do mapa: liga e desliga a pilha de
// propostas do Negocia (ver useEmpilharNegociadas)
export default function BotaoEmpilharNegociadas({ ativo, onAlternar }: Props) {
  const { mostrarToast } = useToast();

  const alternar = () => {
    onAlternar();
    mostrarToast({
      tipo: "info",
      titulo: ativo
        ? "Empilhar corridas negociadas: desligado"
        : "Empilhar corridas negociadas: ligado",
      chave: `empilhar-negociadas:${!ativo}`,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.botao, ativo && styles.botaoAtivo]}
      onPress={alternar}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: ativo }}
      accessibilityLabel="Empilhar corridas negociadas"
      accessibilityHint="Liga ou desliga receber novas chamadas enquanto o passageiro decide sobre sua proposta"
    >
      <Ionicons
        name={ativo ? "layers" : "layers-outline"}
        size={24}
        color={ativo ? "#111" : "#6B7280"}
      />
      {!ativo && <View style={styles.risco} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: "white",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  botaoAtivo: {
    backgroundColor: "#FFD400",
  },
  risco: {
    position: "absolute",
    width: 30,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#6B7280",
    transform: [{ rotate: "-45deg" }],
  },
});
