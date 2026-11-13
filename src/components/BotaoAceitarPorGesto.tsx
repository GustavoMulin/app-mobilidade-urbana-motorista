import { useToast } from "@/context/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { useCameraPermission } from "react-native-vision-camera";

interface Props {
  ativo: boolean;
  onDefinir: (ativo: boolean) => void;
}

// ao lado do empilhar: liga e desliga aceitar/recusar a chamada pelo gesto da
// mão (ver DetectorDeGesto). Só liga com a permissão da câmera.
export default function BotaoAceitarPorGesto({ ativo, onDefinir }: Props) {
  const { mostrarToast } = useToast();
  const { hasPermission, canRequestPermission, requestPermission } =
    useCameraPermission();

  const avisar = (
    situacao: "ligado" | "desligado" | "camera",
    titulo: string,
    mensagem?: string,
  ) =>
    mostrarToast({
      tipo: "info",
      titulo,
      mensagem,
      chave: `aceitar-por-gesto:${situacao}`,
    });

  const alternar = async () => {
    if (ativo) {
      onDefinir(false);
      avisar("desligado", "Aceitar por gesto: desligado");
      return;
    }
    const permitido =
      hasPermission || (canRequestPermission && (await requestPermission()));
    if (!permitido) {
      avisar(
        "camera",
        "Permita a câmera para usar o gesto",
        "Libere a câmera nas configurações do app.",
      );
      // negada de vez: só pelas configurações do aparelho
      if (!canRequestPermission) void Linking.openSettings();
      return;
    }
    onDefinir(true);
    avisar(
      "ligado",
      "Aceitar por gesto: ligado",
      "Na chamada, feche a mão aberta (como quem pega) para aceitar ou abra a mão fechada (como quem solta) para recusar.",
    );
  };

  return (
    <TouchableOpacity
      style={[styles.botao, ativo && styles.botaoAtivo]}
      onPress={() => void alternar()}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: ativo }}
      accessibilityLabel="Aceitar corrida por gesto"
      accessibilityHint="Liga ou desliga aceitar e recusar a chamada passando a mão na frente da câmera"
    >
      <Ionicons
        name={ativo ? "hand-right" : "hand-right-outline"}
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
