import { Text } from "@/components/common/Texto";
import OfertaNegociaMotorista, {
  EsperaProposta,
  segundosDaProposta,
} from "@/components/OfertaNegociaMotorista";
import { enderecoCurto } from "@/domain/endereco";
import { OfertaCorrida } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
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
  onPropor: (
    corridaId: number,
    valorMotorista?: number,
  ) => void | Promise<void>;
  onRecusar: (corridaId: number) => void;
  duration?: number;
}

const emKm = (valor: number) => `${valor.toFixed(1).replace(".", ",")} km`;
const emReais = (valor: number) => `R$${valor.toFixed(2).replace(".", ",")}`;
const minutosEstimados = (distancia: number) =>
  Math.max(1, Math.round((distancia / 25) * 60));

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
  const [isMounted, setIsMounted] = useState(visible);
  const [aba, setAba] = useState<"corridas" | "entregas">("corridas");
  const [ordenacao, setOrdenacao] = useState<"distancia" | "recentes">(
    "distancia",
  );
  const [ofertaNoModal, setOfertaNoModal] = useState<OfertaCorrida | null>(
    null,
  );
  const [, atualizarRelogio] = useState(0);
  const aoExpirar = useCallback(() => atualizarRelogio((n) => n + 1), []);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!visible) return false;
      if (ofertaNoModal) {
        setOfertaNoModal(null);
        return true;
      }
      onClose();
      return true;
    });
    return () => assinatura.remove();
  }, [visible, ofertaNoModal, onClose]);

  useEffect(() => {
    if (visible) {
      const montar = setTimeout(() => setIsMounted(true), 0);
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
      onAtualizar();
      return () => clearTimeout(montar);
    }

    Animated.timing(translateX, {
      toValue: width,
      duration,
      useNativeDriver: true,
    }).start(({ finished }) => finished && setIsMounted(false));
  }, [duration, onAtualizar, translateX, visible, width]);

  const corridas = useMemo(() => {
    const copia = [...ofertas];
    copia.sort((a, b) =>
      ordenacao === "distancia"
        ? a.distancia_ate_origem_km - b.distancia_ate_origem_km
        : b.corrida_id - a.corrida_id,
    );
    return copia;
  }, [ofertas, ordenacao]);

  if (!isMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.camada]}>
      <Animated.View
        style={[
          styles.drawer,
          {
            paddingTop: Math.max(insets.top, 16),
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar solicitações"
          >
            <Ionicons name="chevron-back" size={29} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Solicitações</Text>
        </View>

        <View style={styles.abas}>
          {(["corridas", "entregas"] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.aba}
              onPress={() => setAba(item)}
            >
              <Text
                style={[
                  styles.abaTexto,
                  aba === item && styles.abaTextoAtiva,
                ]}
              >
                {item === "corridas" ? "Corridas" : "Entregas"}
              </Text>
              {aba === item ? <View style={styles.abaIndicador} /> : null}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filtros}>
          <Text style={styles.quantidade}>
            {aba === "entregas"
              ? "Nenhuma entrega"
              : corridas.length === 0
                ? "Escolha uma"
                : `${corridas.length} encontrada${corridas.length === 1 ? "" : "s"}`}
          </Text>
          {aba === "corridas" ? (
            <TouchableOpacity
              style={styles.ordenacao}
              onPress={() =>
                setOrdenacao((atual) =>
                  atual === "distancia" ? "recentes" : "distancia",
                )
              }
            >
              <Text style={styles.ordenacaoTexto}>
                {ordenacao === "distancia"
                  ? "Km até o embarque"
                  : "Mais recentes"}
              </Text>
              <Ionicons name="caret-down" size={13} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={aba === "corridas" ? corridas : []}
          keyExtractor={(item) => String(item.corrida_id)}
          contentContainerStyle={
            corridas.length === 0 ? styles.listaVazia : styles.lista
          }
          refreshControl={
            <RefreshControl
              refreshing={carregando && corridas.length === 0}
              onRefresh={onAtualizar}
              enabled={disponivel}
              colors={["#FFB800"]}
              tintColor="#FFB800"
            />
          }
          ListEmptyComponent={
            <View style={styles.vazio}>
              {carregando && aba === "corridas" ? (
                <ActivityIndicator size="large" color="#FFB800" />
              ) : (
                <Ionicons name="car-outline" size={46} color="#AAA" />
              )}
              <Text style={styles.vazioTitulo}>
                {aba === "entregas"
                  ? "Nenhuma entrega disponível"
                  : disponivel
                    ? "Nenhuma corrida disponível agora"
                    : "Você está offline"}
              </Text>
              <Text style={styles.vazioTexto}>
                {aba === "entregas"
                  ? "As entregas aparecerão aqui quando estiverem disponíveis."
                  : disponivel
                    ? "Novas solicitações aparecem automaticamente."
                    : "Volte e toque em Conectar para receber solicitações."}
              </Text>
            </View>
          }
          ListFooterComponent={
            corridas.length > 0 ? (
              <Text style={styles.fimLista}>Isso é tudo por enquanto</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const proposta = item.minha_proposta;
            const pendente =
              item.negociavel &&
              proposta?.status === "pendente" &&
              segundosDaProposta(proposta.expira_em) > 0;
            const expirada = item.negociavel && proposta && !pendente;
            const minutosEmbarque = minutosEstimados(
              item.distancia_ate_origem_km,
            );
            const minutosCorrida = minutosEstimados(item.distancia_corrida_km);
            const valorKm =
              item.valor_motorista /
              Math.max(item.distancia_corrida_km, 0.1);

            return (
              <View style={[styles.card, pendente && styles.cardEsperando]}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoriaChip}>
                    <Text style={styles.categoria}>
                      {item.negociavel
                        ? "Negocia Nova"
                        : item.categoria ?? "Corrida"}
                    </Text>
                  </View>
                  <View style={styles.iconeMapa}>
                    <Ionicons name="map-outline" size={24} color="#737983" />
                  </View>
                </View>

                <View style={styles.precoLinha}>
                  <Text style={styles.valor}>
                    {emReais(item.valor_motorista)}
                  </Text>
                  {item.negociavel ? (
                    <View style={styles.ganhosChip}>
                      <Ionicons name="ribbon" size={14} color="#D69D00" />
                      <Text style={styles.ganhosTexto}>100% dos ganhos</Text>
                    </View>
                  ) : null}
                  <Text style={styles.valorKm}>
                    {"R$" + valorKm.toFixed(2).replace(".", ",") + "/km"}
                  </Text>
                </View>

                <View style={styles.passageiroLinha}>
                  <Ionicons name="person-circle" size={20} color="#6B7078" />
                  <Text style={styles.passageiroTexto}>
                    {typeof item.passageiro_nota === "number"
                      ? item.passageiro_nota.toFixed(2).replace(".", ",")
                      : "Novo"}
                    {` · ${item.passageiro_corridas} corridas`}
                  </Text>
                  {item.metodo_pagamento === "cartao" ? (
                    <>
                      <Text style={styles.separadorTexto}>·</Text>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#5893C6"
                      />
                      <Text style={styles.verificado}>Cartão verif.</Text>
                    </>
                  ) : null}
                </View>

                <View style={styles.rota}>
                  <View style={styles.linhaVertical} />
                  <View style={styles.enderecoLinha}>
                    <View style={[styles.ponto, styles.origem]}>
                      <Ionicons name="arrow-up" size={10} color="#FFF" />
                    </View>
                    <Text style={styles.endereco} numberOfLines={2}>
                      <Text style={styles.tempoEndereco}>
                        ({minutosEmbarque} min{" "}
                        {emKm(item.distancia_ate_origem_km)}){" "}
                      </Text>
                      {enderecoCurto(item.origem)}
                    </Text>
                  </View>
                  <View style={styles.enderecoLinha}>
                    <View style={[styles.ponto, styles.destino]}>
                      <Ionicons name="arrow-down" size={10} color="#FFF" />
                    </View>
                    <Text style={styles.endereco} numberOfLines={2}>
                      <Text style={styles.tempoEndereco}>
                        ({minutosCorrida} min{" "}
                        {emKm(item.distancia_corrida_km)}){" "}
                      </Text>
                      {item.destino
                        ? enderecoCurto(item.destino)
                        : "Destino não informado"}
                    </Text>
                  </View>
                </View>

                {pendente ? (
                  <EsperaProposta
                    expiraEm={proposta?.expira_em}
                    onExpirar={aoExpirar}
                  />
                ) : expirada ? (
                  <TouchableOpacity
                    style={styles.novaOferta}
                    onPress={() => setOfertaNoModal(item)}
                    disabled={ocupado}
                  >
                    <Ionicons name="refresh" size={21} color="#111" />
                    <Text style={styles.aceitarTexto}>Fazer nova oferta</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.aceitar}
                      disabled={ocupado || item.recusada_localmente}
                      onPress={() =>
                        item.negociavel
                          ? void onPropor(item.corrida_id)
                          : onAceitar(item.corrida_id)
                      }
                    >
                      <Text style={styles.aceitarTexto}>
                        {item.negociavel
                          ? `Aceitar por ${emReais(item.valor_motorista)}`
                          : "Aceitar corrida"}
                      </Text>
                    </TouchableOpacity>

                    {item.negociavel ? (
                      <View style={styles.sugestoes}>
                        {[1.05, 1.08, 1.1].map((fator) => {
                          const sugerido =
                            Math.round(
                              item.valor_motorista * fator * 100,
                            ) / 100;
                          return (
                            <TouchableOpacity
                              key={fator}
                              style={styles.sugestao}
                              onPress={() =>
                                void onPropor(item.corrida_id, sugerido)
                              }
                              disabled={ocupado}
                            >
                              <Text style={styles.sugestaoTexto}>
                                {emReais(sugerido)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity
                          style={styles.editarOferta}
                          onPress={() => setOfertaNoModal(item)}
                          accessibilityLabel="Editar oferta"
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={21}
                            color="#111"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.recusar}
                        onPress={() => onRecusar(item.corrida_id)}
                      >
                        <Text style={styles.recusarTexto}>Recusar</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {carregando && corridas.length > 0 ? (
                  <View style={styles.atualizando} pointerEvents="none">
                    <ActivityIndicator color="#111" />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </Animated.View>
      <OfertaNegociaMotorista
        oferta={ofertaNoModal}
        ocupado={ocupado}
        onClose={() => setOfertaNoModal(null)}
        onConfirmar={onPropor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { zIndex: 100 },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#F5F5F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    paddingHorizontal: 20,
    gap: 2,
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E3E3E3",
  },
  botaoVoltar: { width: 46, height: 46, justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#171717" },
  abas: {
    height: 82,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 34,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
  },
  aba: { height: 63, justifyContent: "center" },
  abaTexto: { fontSize: 22, color: "#242424" },
  abaTextoAtiva: { fontWeight: "800" },
  abaIndicador: {
    position: "absolute",
    bottom: 6,
    left: "25%",
    right: "25%",
    height: 5,
    borderRadius: 4,
    backgroundColor: "#FFD400",
  },
  filtros: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#F0F0F1",
  },
  quantidade: { fontSize: 18, color: "#222" },
  ordenacao: { flexDirection: "row", alignItems: "center", gap: 7 },
  ordenacaoTexto: { fontSize: 17, color: "#555" },
  lista: { padding: 12, paddingBottom: 40 },
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
  fimLista: {
    textAlign: "center",
    fontSize: 16,
    color: "#777",
    marginVertical: 24,
  },
  card: {
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardEsperando: { opacity: 0.72 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoriaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#EAF9F2",
  },
  iconeMapa: {
    width: 42,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F3F5",
  },
  precoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 5,
  },
  valor: { color: "#111", fontSize: 29, fontWeight: "800" },
  ganhosChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#FFF9E5",
  },
  ganhosTexto: { fontSize: 12, color: "#B48612" },
  valorKm: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    fontSize: 12,
    color: "#745C2A",
    backgroundColor: "#FFF7E4",
  },
  passageiroLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    gap: 4,
  },
  passageiroTexto: { fontSize: 14, color: "#6A6D73" },
  separadorTexto: { color: "#A1A4A8" },
  verificado: { fontSize: 13, color: "#71818F" },
  rota: { marginTop: 17, gap: 15, position: "relative" },
  linhaVertical: {
    position: "absolute",
    left: 8,
    top: 15,
    bottom: 16,
    width: 1,
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#C2C6CA",
  },
  enderecoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ponto: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    zIndex: 2,
  },
  categoria: {
    fontSize: 13,
    fontWeight: "700",
    fontStyle: "italic",
    color: "#15A96C",
  },
  origem: { backgroundColor: "#20C99A" },
  destino: { backgroundColor: "#FF7849" },
  endereco: { flex: 1, fontSize: 15, lineHeight: 20, color: "#222" },
  tempoEndereco: { fontWeight: "800" },
  recusar: {
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  recusarTexto: { color: "#8B1717", fontWeight: "600" },
  aceitar: {
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#FFD400",
    marginTop: 20,
  },
  aceitarTexto: { color: "#111", fontSize: 17, fontWeight: "800" },
  novaOferta: {
    height: 53,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#FFD400",
    marginTop: 20,
  },
  sugestoes: { flexDirection: "row", gap: 7, marginTop: 9 },
  sugestao: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#F3F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sugestaoTexto: { fontSize: 15, fontWeight: "700", color: "#1B1B1B" },
  editarOferta: {
    width: 48,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#F3F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  atualizando: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
});
