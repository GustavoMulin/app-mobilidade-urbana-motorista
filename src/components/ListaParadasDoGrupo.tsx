import { Text } from "@/components/common/Texto";
import { enderecoCurto } from "@/domain/endereco";
import type { ParadaDoGrupo } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

interface Props {
  paradas: ParadaDoGrupo[];
}

const emReais = (valor: number) => `R$ ${valor.toFixed(2).replace(".", ",")}`;

// Viagem compartilhada: as paradas na ordem do trajeto (o carro nunca volta
// atrás). A parada da vez fica em destaque; quem cancelou some do caminho.
export default function ListaParadasDoGrupo({ paradas }: Props) {
  const visiveis = paradas.filter((parada) => !parada.cancelada);
  const daVez = visiveis.findIndex((parada) => !parada.feita);
  const pessoas = new Set(visiveis.map((parada) => parada.corrida_id)).size;

  return (
    <View style={styles.caixa} accessibilityRole="list">
      <View style={styles.cabecalho}>
        <Ionicons name="people" size={16} color="#111" />
        <Text style={styles.titulo}>
          Compartilhada · {pessoas}{" "}
          {pessoas === 1 ? "passageiro" : "passageiros"}
        </Text>
      </View>
      {visiveis.map((parada, indice) => {
        const atual = indice === daVez;
        const embarque = parada.acao === "embarque";
        return (
          <View
            key={`${parada.corrida_id}-${parada.acao}`}
            style={[styles.linha, atual && styles.linhaAtual]}
            accessibilityLabel={`${indice + 1}. ${embarque ? "Buscar" : "Deixar"} ${parada.passageiro}${parada.feita ? ", feito" : atual ? ", agora" : ""}`}
          >
            <View
              style={[
                styles.icone,
                embarque ? styles.iconeEmbarque : styles.iconeDesembarque,
                parada.feita && styles.iconeFeito,
              ]}
            >
              <Ionicons
                name={
                  parada.feita
                    ? "checkmark"
                    : embarque
                      ? "arrow-up"
                      : "arrow-down"
                }
                size={12}
                color="#FFF"
              />
            </View>
            <View style={styles.textos}>
              <Text
                style={[styles.nome, parada.feita && styles.feito]}
                numberOfLines={1}
              >
                {embarque ? "Buscar" : "Deixar"} {parada.passageiro}
                {parada.metodo_pagamento !== "dinheiro"
                  ? ""
                  : embarque
                    ? " · paga em dinheiro"
                    : ` · receber ${emReais(parada.valor_passageiro)}`}
              </Text>
              <Text style={styles.endereco} numberOfLines={1}>
                {enderecoCurto(parada.endereco)}
              </Text>
            </View>
            {atual ? <Text style={styles.agora}>agora</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    borderRadius: 14,
    backgroundColor: "#F7F8FA",
    paddingVertical: 8,
    marginBottom: 12,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  titulo: { fontSize: 14, fontWeight: "800", color: "#111" },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  linhaAtual: { backgroundColor: "#FFF4C2" },
  icone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  iconeEmbarque: { backgroundColor: "#17A673" },
  iconeDesembarque: { backgroundColor: "#2F6BFF" },
  iconeFeito: { backgroundColor: "#B8BEC6" },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontSize: 14, fontWeight: "700", color: "#111" },
  feito: { color: "#9CA3AF", textDecorationLine: "line-through" },
  endereco: { fontSize: 12, color: "#6B7280" },
  agora: { fontSize: 12, fontWeight: "800", color: "#111" },
});
