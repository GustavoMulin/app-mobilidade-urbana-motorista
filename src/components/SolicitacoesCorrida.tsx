import { Text } from "@/components/common/Texto";
import NegociarChamada from "@/components/NegociarChamada";
import { enderecoCurto } from "@/domain/endereco";
import { reputacaoPassageiro } from "@/domain/reputacaoPassageiro";
import { OfertaCorrida } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  disponivel: boolean;
  carregando: boolean;
  ofertas: OfertaCorrida[];
  ocupado: boolean;
  onClose: () => void;
  onAtualizar: () => void;
  onAceitar: (corridaId: number) => void;
  // Negocia: sem valor manda a oferta do passageiro; com valor, contraproposta
  onPropor: (corridaId: number, valorMotorista?: number) => void;
  onRecusar: (corridaId: number) => void;
  duration?: number;
}

const emKm = (valor: number) => `${valor.toFixed(1).replace(".", ",")} km`;
const emReais = (valor: number) => `R$ ${valor.toFixed(2).replace(".", ",")}`;

const ROTULO_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
};

export default function SolicitacoesCorrida({
  visible,
  disponivel,
  carregando,
  ofertas,
  ocupado,
  onClose,
  onAtualizar,
  onAceitar,
  onPropor,
  onRecusar,
  duration = 250,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!visible) return false;
      onClose();
      return true;
    });
    return () => assinatura.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      const montar = setTimeout(() => setIsMounted(true), 0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
      onAtualizar();
      return () => clearTimeout(montar);
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: width,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && setIsMounted(false));
  }, [duration, onAtualizar, overlayOpacity, translateX, visible, width]);

  if (!isMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.camada]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.fundo,
            { opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.drawer,
          {
            paddingTop: Math.max(insets.top + 12, 28),
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar solicitações"
          >
            <Ionicons name="arrow-back-outline" size={28} color="#111" />
          </TouchableOpacity>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitle}>Solicitações</Text>
            <Text style={styles.headerApoio}>
              {disponivel
                ? `${ofertas.length} na sua região`
                : "Fique online para receber corridas"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onAtualizar}
            disabled={carregando || !disponivel}
          >
            <Ionicons
              name="refresh"
              size={25}
              color={disponivel ? "#111" : "#AAA"}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={ofertas}
          keyExtractor={(item) => String(item.corrida_id)}
          contentContainerStyle={
            ofertas.length === 0 ? styles.listaVazia : styles.lista
          }
          refreshControl={
            <RefreshControl
              refreshing={carregando}
              onRefresh={onAtualizar}
              enabled={disponivel}
              colors={["#FFB800"]}
              tintColor="#FFB800"
            />
          }
          ListEmptyComponent={
            <View style={styles.vazio}>
              {carregando ? (
                <ActivityIndicator size="large" color="#FFB800" />
              ) : (
                <Ionicons name="car-outline" size={46} color="#AAA" />
              )}
              <Text style={styles.vazioTitulo}>
                {disponivel
                  ? "Nenhuma solicitação próxima"
                  : "Você está offline"}
              </Text>
              <Text style={styles.vazioTexto}>
                {disponivel
                  ? "A lista atualiza automaticamente conforme o raio de busca aumenta."
                  : "Feche esta tela e toque em Conectar."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitulo}>
                  {item.categoria ? (
                    <Text style={styles.categoria} numberOfLines={1}>
                      {item.categoria}
                    </Text>
                  ) : null}
                  <Text style={styles.codigo}>
                    {[
                      ROTULO_PAGAMENTO[item.metodo_pagamento ?? ""],
                      item.codigo_corrida,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <View style={styles.cardValor}>
                  {item.recusada_localmente ? (
                    <Text style={styles.recusadaSelo}>Recusada</Text>
                  ) : null}
                  <Text style={styles.valor}>
                    {emReais(item.valor_motorista)}
                  </Text>
                </View>
              </View>
              <Text style={styles.resumo}>
                {emKm(item.distancia_ate_origem_km)} até o embarque ·{" "}
                {emKm(item.distancia_corrida_km)} de viagem
              </Text>
              <View style={styles.enderecoLinha}>
                <View style={[styles.ponto, styles.origem]} />
                <Text style={styles.endereco} numberOfLines={2}>
                  {enderecoCurto(item.origem)}
                </Text>
              </View>
              <View style={styles.enderecoLinha}>
                <View style={[styles.ponto, styles.destino]} />
                <Text style={styles.endereco} numberOfLines={2}>
                  {item.destino
                    ? enderecoCurto(item.destino)
                    : "Destino não informado"}
                </Text>
              </View>
              <Text style={styles.reputacao}>
                {reputacaoPassageiro(
                  item.passageiro_nota,
                  item.passageiro_corridas,
                )}
                {item.paradas > 0
                  ? ` · ${item.paradas} ${item.paradas === 1 ? "parada" : "paradas"}`
                  : ""}
              </Text>
              <View style={styles.acoes}>
                {!item.recusada_localmente ? (
                  <TouchableOpacity
                    style={styles.recusar}
                    disabled={ocupado}
                    onPress={() => onRecusar(item.corrida_id)}
                  >
                    <Text style={styles.recusarTexto}>Recusar</Text>
                  </TouchableOpacity>
                ) : null}
                {item.negociavel && item.minha_proposta ? (
                  <View style={styles.propostaEnviada}>
                    <Text style={styles.propostaEnviadaTexto}>
                      Proposta enviada
                      {typeof item.minha_proposta.valor_motorista === "number"
                        ? `: ${emReais(item.minha_proposta.valor_motorista)}`
                        : ""}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.aceitar}
                    disabled={ocupado}
                    onPress={() =>
                      item.negociavel
                        ? onPropor(item.corrida_id)
                        : onAceitar(item.corrida_id)
                    }
                  >
                    <Text style={styles.aceitarTexto}>
                      {ocupado
                        ? "Aguarde..."
                        : item.negociavel
                          ? `Aceitar ${emReais(item.valor_motorista)}`
                          : item.recusada_localmente
                            ? "Aceitar agora"
                            : "Aceitar"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* no Negocia o passageiro escolhe entre as propostas */}
              {item.negociavel && !item.minha_proposta ? (
                <NegociarChamada
                  claro
                  valorBase={item.valor_motorista}
                  onValorEscolhido={(valor) => onPropor(item.corrida_id, valor)}
                />
              ) : null}
            </View>
          )}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { zIndex: 30 },
  fundo: { backgroundColor: "rgba(0,0,0,0.28)" },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    gap: 12,
  },
  headerTextos: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  headerApoio: { fontSize: 12, color: "#666", marginTop: 2 },
  lista: { paddingBottom: 32 },
  listaVazia: { flexGrow: 1 },
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  vazioTitulo: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
    color: "#222",
  },
  vazioTexto: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardValor: { alignItems: "flex-end", gap: 3 },
  recusadaSelo: {
    color: "#9A5A00",
    backgroundColor: "#FFF0CE",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  codigo: { color: "#666", fontSize: 12, fontWeight: "600" },
  valor: { color: "#111", fontSize: 23, fontWeight: "800" },
  resumo: { color: "#555", fontSize: 13, marginVertical: 12 },
  enderecoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  ponto: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cardTitulo: { flex: 1, minWidth: 0, gap: 2 },
  categoria: { fontSize: 15, fontWeight: "800", color: "#111" },
  propostaEnviada: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#FFF6DB",
    alignItems: "center",
    justifyContent: "center",
  },
  propostaEnviadaTexto: { fontSize: 15, fontWeight: "700", color: "#7A5A12" },
  origem: { backgroundColor: "#17A673" },
  destino: { backgroundColor: "#E53935" },
  endereco: { flex: 1, fontSize: 14, lineHeight: 19, color: "#222" },
  reputacao: { color: "#666", fontSize: 13, marginTop: 14 },
  acoes: { flexDirection: "row", gap: 10, marginTop: 16 },
  recusar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  recusarTexto: { color: "#555", fontWeight: "700" },
  aceitar: {
    flex: 2,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FFD200",
  },
  aceitarTexto: { color: "#111", fontWeight: "800" },
});
