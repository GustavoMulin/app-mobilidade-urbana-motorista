import { Text } from "@/components/common/Texto";
import type { CamadasDoMapa as Camadas } from "@/domain/dinamica";
import { useEstilos } from "@/theme/tema";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

interface Props {
  visivel: boolean;
  camadas: Camadas;
  onConfirmar: (camadas: Camadas) => void;
  onFechar: () => void;
}

const LINHAS: {
  chave: keyof Camadas;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  { chave: "demanda", titulo: "Mapa de demanda", icone: "people-outline" },
  { chave: "tarifas", titulo: "Mapa de tarifas", icone: "cash-outline" },
];

/** Janela para ligar e desligar as camadas do mapa de calor. */
export default function CamadasDoMapa(props: Props) {
  // a cada abertura o rascunho recomeça do que está valendo
  return (
    <Modal
      visible={props.visivel}
      transparent
      animationType="fade"
      onRequestClose={props.onFechar}
    >
      <Janela key={props.visivel ? "aberta" : "fechada"} {...props} />
    </Modal>
  );
}

function Janela({ camadas, onConfirmar, onFechar }: Props) {
  const estilos = useEstilos(styles);
  // só vale de verdade ao confirmar
  const [rascunho, setRascunho] = useState(camadas);

  return (
    <Pressable style={estilos.fundo} onPress={onFechar}>
      <Pressable style={estilos.janela} onPress={() => undefined}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.titulo}>Mapa de calor</Text>
          <Pressable
            accessibilityLabel="Fechar"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onFechar}
          >
            <Ionicons name="close" size={22} color="#111111" />
          </Pressable>
        </View>

        <Text style={estilos.subtitulo}>Ver informações</Text>

        {LINHAS.map(({ chave, titulo, icone }) => {
          const ligado = rascunho[chave];

          return (
            <Pressable
              key={chave}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ligado }}
              style={estilos.linha}
              onPress={() =>
                setRascunho((atual) => ({ ...atual, [chave]: !atual[chave] }))
              }
            >
              <Ionicons name={icone} size={20} color="#111111" />
              <Text style={estilos.linhaTitulo}>{titulo}</Text>
              <View style={[estilos.caixa, ligado && estilos.caixaLigada]}>
                {ligado && (
                  <MaterialIcons name="check" size={16} color="#111111" />
                )}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          style={estilos.confirmar}
          onPress={() => onConfirmar(rascunho)}
        >
          {/* preto também no tema escuro: o fundo do botão é sempre amarelo */}
          <Text style={[estilos.confirmarTexto, { color: "#000000" }]}>
            Confirmar
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  janela: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titulo: { fontSize: 18, fontWeight: "800", color: "#111111" },
  subtitulo: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  linhaTitulo: { flex: 1, fontSize: 16, color: "#111111" },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  caixaLigada: { borderColor: "#FFD600", backgroundColor: "#FFD600" },
  confirmar: {
    marginTop: 12,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD600",
  },
  confirmarTexto: { fontSize: 16, fontWeight: "800", color: "#111111" },
});
