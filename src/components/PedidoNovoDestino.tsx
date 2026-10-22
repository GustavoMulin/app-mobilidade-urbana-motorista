import { Text } from "@/components/common/Texto";
import type { PedidoNovoDestino as Pedido } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  pedido: Pedido | null;
  origem?: string | null;
  paradasFeitas?: number;
  respondendo?: boolean;
  onResponder: (aceitar: boolean) => void;
}

const formatarValor = (valor: number) =>
  `R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`;

const segundosAte = (iso: string | null) => {
  if (!iso) return null;
  const alvo = Date.parse(iso);
  return Number.isFinite(alvo)
    ? Math.max(0, Math.round((alvo - Date.now()) / 1000))
    : null;
};

// como no 99: o passageiro pede outro destino e o motorista aceita ou recusa,
// vendo o novo valor; sem resposta no prazo, o pedido expira no servidor
export default function PedidoNovoDestino({
  pedido,
  origem,
  paradasFeitas = 0,
  respondendo = false,
  onResponder,
}: Props) {
  const insets = useSafeAreaInsets();
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!pedido) return;
    const atualizar = () => setRestante(segundosAte(pedido.expira_em));
    const inicio = setTimeout(atualizar, 0);
    const relogio = setInterval(atualizar, 1000);
    return () => {
      clearTimeout(inicio);
      clearInterval(relogio);
    };
  }, [pedido]);

  const visivel = pedido !== null && restante !== 0;
  const pontos =
    pedido?.paradas && pedido.paradas.length > 0
      ? pedido.paradas
      : pedido
        ? [pedido.endereco]
        : [];
  const mudaParadas = pontos.length > 1;
  const diferenca =
    pedido && typeof pedido.valor_motorista_anterior === "number"
      ? pedido.valor_motorista - pedido.valor_motorista_anterior
      : null;
  const tempo =
    restante === null
      ? null
      : `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.fundo} />
      {pedido && (
        <View
          style={[
            styles.folha,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <View style={styles.topo}>
            <Text style={styles.titulo}>
              {mudaParadas
                ? "O passageiro quer mudar o trajeto"
                : "O passageiro quer mudar o destino"}
            </Text>
            {tempo && (
              <View style={styles.prazo}>
                <Ionicons name="time-outline" size={14} color="#8A5A00" />
                <Text style={styles.prazoTexto}>{tempo}</Text>
              </View>
            )}
          </View>

          {origem ? (
            <View style={styles.origemAtual}>
              <View style={styles.pontoOrigem}>
                <View style={styles.pontoOrigemCentro} />
              </View>
              <View style={styles.origemConteudo}>
                <Text style={styles.origemRotulo}>Local de embarque</Text>
                <Text numberOfLines={2} style={styles.origemEndereco}>
                  {origem}
                </Text>
              </View>
            </View>
          ) : null}

          {pontos.map((ponto, indice) => {
            const ehDestino = indice === pontos.length - 1;
            // o servidor mantém as paradas já feitas no começo do trajeto
            const feita = !ehDestino && indice < paradasFeitas;
            return (
              <View
                key={`${indice}-${ponto}`}
                style={styles.enderecoLinha}
                accessibilityLabel={
                  feita ? `Parada já feita: ${ponto}` : undefined
                }
              >
                {ehDestino ? (
                  <View style={styles.pontoDestino}>
                    <Ionicons name="flag" size={22} color="#111" />
                  </View>
                ) : feita ? (
                  <View style={[styles.pontoParada, styles.pontoParadaFeita]}>
                    <Ionicons name="checkmark" size={15} color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.pontoParada}>
                    <Text style={styles.pontoParadaTexto}>{indice + 1}</Text>
                  </View>
                )}
                <Text
                  numberOfLines={2}
                  style={[
                    styles.endereco,
                    !ehDestino && styles.enderecoParada,
                    feita && styles.enderecoFeito,
                  ]}
                >
                  {ponto}
                </Text>
                {feita && <Text style={styles.seloFeita}>Feita</Text>}
              </View>
            );
          })}

          <View style={styles.valores}>
            <View style={styles.valorBloco}>
              <Text style={styles.valorRotulo}>Você recebe</Text>
              <Text style={styles.valor}>
                {formatarValor(pedido.valor_motorista)}
              </Text>
            </View>
            {diferenca !== null && Math.abs(diferenca) >= 0.01 && (
              <Text
                style={[
                  styles.diferenca,
                  diferenca < 0 && styles.diferencaNegativa,
                ]}
              >
                {diferenca > 0 ? "+" : "−"}
                {formatarValor(diferenca)}
              </Text>
            )}
          </View>

          <Text style={styles.apoio}>
            {mudaParadas
              ? "Viagem inteira com o novo trajeto"
              : "Viagem inteira com o novo destino"}
            : cerca de {pedido.distancia_km.toFixed(1).replace(".", ",")} km e{" "}
            {Math.max(1, Math.round(pedido.tempo_min))} min.
          </Text>

          <View style={styles.acoes}>
            <TouchableOpacity
              style={[styles.botao, styles.botaoRecusar]}
              disabled={respondendo}
              accessibilityRole="button"
              onPress={() => onResponder(false)}
            >
              <Text style={styles.botaoTexto}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botao, styles.botaoAceitar]}
              disabled={respondendo}
              accessibilityRole="button"
              onPress={() => onResponder(true)}
            >
              {respondendo ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.botaoTexto}>Aceitar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(16,24,32,0.45)" },
  folha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14,
  },
  topo: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titulo: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    lineHeight: 26,
  },
  prazo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    backgroundColor: "#FFF6DB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  prazoTexto: { fontSize: 14, fontWeight: "700", color: "#8A5A00" },
  origemAtual: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pontoOrigem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  pontoOrigemCentro: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111",
  },
  origemConteudo: { flex: 1, gap: 2 },
  origemRotulo: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  origemEndereco: { fontSize: 15, fontWeight: "600", color: "#111", lineHeight: 20 },
  enderecoLinha: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pontoDestino: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  endereco: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    lineHeight: 22,
  },
  enderecoParada: { fontSize: 15, fontWeight: "500", color: "#374151" },
  pontoParada: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  pontoParadaTexto: { fontSize: 12, fontWeight: "700", color: "#111" },
  pontoParadaFeita: { backgroundColor: "#9CA3AF" },
  enderecoFeito: { color: "#9CA3AF", textDecorationLine: "line-through" },
  seloFeita: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 3,
  },
  valores: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  valorBloco: { gap: 2 },
  valorRotulo: { fontSize: 13, color: "#6B7280" },
  valor: { fontSize: 22, fontWeight: "800", color: "#111" },
  diferenca: { fontSize: 16, fontWeight: "800", color: "#15803D" },
  diferencaNegativa: { color: "#B42318" },
  apoio: { fontSize: 13, lineHeight: 18, color: "#4B5563" },
  acoes: { flexDirection: "row", gap: 12, marginTop: 4 },
  botao: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoRecusar: { backgroundColor: "#F0F0F2" },
  botaoAceitar: { backgroundColor: "#FFD600" },
  botaoTexto: { fontSize: 16, fontWeight: "700", color: "#111" },
});
