import ConversaAjuda from "@/components/central-de-ajuda/ConversaAjuda";
import { Text, TextInput } from "@/components/common/Texto";
import { api, ehErroDeRede } from "@/Services/api";
import {
  Motivo,
  PedidoDeAjuda,
  ROTULO_MOTIVO,
  situacaoDoPedido,
} from "@/domain/ajuda";
import { useAuth } from "@/context/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  // o menu lateral ainda passa a duração da animação antiga
  duration?: number;
}

const TOPICOS: { motivo: Motivo; icone: keyof typeof Ionicons.glyphMap }[] = [
  { motivo: "corrida_com_problema", icone: "car-outline" },
  { motivo: "tarifa_incorreta", icone: "cash-outline" },
  { motivo: "objeto_esquecido", icone: "bag-handle-outline" },
  { motivo: "motorista_ou_passageiro", icone: "person-outline" },
  { motivo: "outro", icone: "help-circle-outline" },
];

interface CorridaResumo {
  id: number;
  motorista?: { user_id?: number | null } | null;
  codigo_corrida: string;
  status_corrida: string;
  tempo_solicitacao: string;
  corrida_destinos?: { tipo: string; endereco: string | null }[];
}

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const formatarHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// até quando o passageiro já leu cada pedido (para o selo "Nova resposta")
const CHAVE_PEDIDOS_VISTOS = "@ajuda_pedidos_vistos";

const lerVistos = async (): Promise<Record<string, string>> => {
  try {
    return JSON.parse(
      (await AsyncStorage.getItem(CHAVE_PEDIDOS_VISTOS)) ?? "{}",
    );
  } catch {
    return {};
  }
};

const SITUACAO_DA_CORRIDA: Record<string, string> = {
  finalizada: "Concluída",
  cancelada: "Cancelada",
  em_andamento: "Em andamento",
  aceita: "Motorista a caminho",
  motorista_chegou: "Motorista no local",
  solicitada: "Procurando motorista",
};

// o passageiro reconhece a corrida pelo destino, não pelo código
const destinoDaCorrida = (corrida: CorridaResumo) => {
  const endereco = corrida.corrida_destinos?.find(
    (ponto) => ponto.tipo === "destino",
  )?.endereco;

  return endereco
    ? endereco.split(" - ")[0]
    : `Corrida ${corrida.codigo_corrida}`;
};

// só repassa o texto do servidor em erros esperados (validação, regra de
// negócio); em erro interno a mensagem crua poderia expor detalhes do backend
const STATUS_COM_MENSAGEM = [404, 409, 422];

const mensagemDeErro = (falha: unknown) => {
  if (ehErroDeRede(falha)) {
    return "Sem conexão. Tente de novo quando a internet voltar.";
  }
  const resposta = (
    falha as { response?: { status?: number; data?: { message?: string } } }
  )?.response;
  if (
    resposta?.status !== undefined &&
    STATUS_COM_MENSAGEM.includes(resposta.status) &&
    typeof resposta.data?.message === "string"
  ) {
    return resposta.data.message;
  }
  return "Não foi possível enviar agora. Tente de novo.";
};

// Central de Ajuda do motorista: os tópicos abrem um pedido de verdade (salvo
// no servidor, como motorista) e cada pedido tem a sua conversa com o
// atendimento. Mesma tela do app do passageiro.
export default function CentralAjuda({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [descricao, setDescricao] = useState("");
  const [corridas, setCorridas] = useState<CorridaResumo[]>([]);
  const [corridaEscolhida, setCorridaEscolhida] = useState<number | null>(null);
  const [chamados, setChamados] = useState<PedidoDeAjuda[]>([]);
  const [carregandoChamados, setCarregandoChamados] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conversa, setConversa] = useState<number | null>(null);
  const [vistos, setVistos] = useState<Record<string, string>>({});

  const marcarVisto = useCallback(
    async (pedidoId: number, ultimaMensagemEm: string | null) => {
      const atuais = await lerVistos();
      atuais[pedidoId] = ultimaMensagemEm ?? new Date().toISOString();
      setVistos({ ...atuais });
      await AsyncStorage.setItem(
        CHAVE_PEDIDOS_VISTOS,
        JSON.stringify(atuais),
      ).catch(() => {});
    },
    [],
  );

  const carregarPedidos = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: PedidoDeAjuda[] }>(
        "/ajuda/tickets",
        { params: { per_page: 20, solicitante_tipo: "motorista" } },
      );
      setChamados(data.data);
    } catch {
      // mantém o que já estava na tela
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setMotivo(null);
    setDescricao("");
    setCorridaEscolhida(null);
    setErro(null);
    setConversa(null);
    void lerVistos().then(setVistos);
    // limpa o que estava na tela: sem isso, pedidos e corridas de uma sessão
    // anterior (outra conta, por exemplo) ficavam visíveis se a carga falhasse
    setChamados([]);
    setCorridas([]);

    let ativo = true;
    setCarregandoChamados(true);
    api
      .get<{ data: PedidoDeAjuda[] }>("/ajuda/tickets", {
        params: { per_page: 20, solicitante_tipo: "motorista" },
      })
      .then(({ data }) => {
        if (ativo) setChamados(data.data);
      })
      .catch(() => {
        if (ativo) setChamados([]);
      })
      .finally(() => {
        if (ativo) setCarregandoChamados(false);
      });
    api
      .get<{ data: CorridaResumo[] }>("/corridas", { params: { per_page: 20 } })
      .then(({ data }) => {
        // a mesma conta pode ser passageira: só as corridas em que dirigiu
        if (ativo)
          setCorridas(
            data.data
              .filter(
                (corrida) =>
                  String(corrida.motorista?.user_id ?? "") === String(user?.id),
              )
              .slice(0, 10),
          );
      })
      .catch(() => {
        if (ativo) setCorridas([]);
      });

    return () => {
      ativo = false;
    };
  }, [visible, user?.id]);

  const enviar = async () => {
    if (!motivo || descricao.trim().length < 10) {
      setErro("Descreva o problema com pelo menos 10 letras.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await api.post<{ data: PedidoDeAjuda }>(
        "/ajuda/tickets",
        {
          solicitante_tipo: "motorista",
          motivo,
          descricao: descricao.trim(),
          ...(corridaEscolhida !== null
            ? { corrida_id: corridaEscolhida }
            : {}),
        },
      );
      setChamados((atuais) => [data.data, ...atuais]);
      await marcarVisto(data.data.id, data.data.ultima_mensagem_em);
      // o pedido já abre a conversa, onde chega a resposta do atendimento
      setMotivo(null);
      setDescricao("");
      setCorridaEscolhida(null);
      setConversa(data.data.id);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  const fecharConversa = (ultimaMensagemEm: string | null) => {
    if (conversa !== null) void marcarVisto(conversa, ultimaMensagemEm);
    setConversa(null);
    void carregarPedidos();
  };

  const voltar = () => {
    if (conversa !== null) {
      fecharConversa(null);
      return;
    }
    if (motivo !== null) {
      setMotivo(null);
      setErro(null);
      return;
    }
    onClose();
  };

  const formulario = motivo !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={voltar}
      statusBarTranslucent
    >
      {conversa !== null ? (
        <ConversaAjuda pedidoId={conversa} onVoltar={fecharConversa} />
      ) : (
        <View style={[styles.tela, { paddingTop: insets.top + 8 }]}>
          <View style={styles.cabecalho}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={styles.voltar}
              onPress={voltar}
            >
              <Ionicons name="chevron-back" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.titulo}>
              {formulario ? ROTULO_MOTIVO[motivo] : "Central de Ajuda"}
            </Text>
          </View>

          {!formulario && (
            <ScrollView contentContainerStyle={styles.conteudo}>
              <Text style={styles.secao}>Como podemos ajudar?</Text>
              {TOPICOS.map((topico) => (
                <TouchableOpacity
                  key={topico.motivo}
                  style={styles.linha}
                  accessibilityRole="button"
                  onPress={() => setMotivo(topico.motivo)}
                >
                  <View style={styles.icone}>
                    <Ionicons name={topico.icone} size={18} color="#111" />
                  </View>
                  <Text style={styles.linhaTexto}>
                    {ROTULO_MOTIVO[topico.motivo]}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#BBB" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.emergencia}
                accessibilityRole="button"
                onPress={() => void Linking.openURL("tel:190")}
              >
                <Ionicons name="shield-checkmark" size={20} color="#B42318" />
                <Text style={styles.emergenciaTexto}>
                  Emergência: ligar 190 (Polícia)
                </Text>
              </TouchableOpacity>

              <Text style={styles.secao}>Meus pedidos</Text>
              {carregandoChamados && <ActivityIndicator color="#111" />}
              {!carregandoChamados && chamados.length === 0 && (
                <Text style={styles.vazio}>
                  Você ainda não abriu nenhum pedido de ajuda.
                </Text>
              )}
              {chamados.map((chamado) => {
                const situacao = situacaoDoPedido(chamado.status);
                const visto = vistos[chamado.id];
                const novaResposta =
                  !!chamado.ultima_mensagem_em &&
                  (!visto ||
                    new Date(chamado.ultima_mensagem_em) > new Date(visto));

                return (
                  <TouchableOpacity
                    key={chamado.id}
                    style={styles.pedido}
                    accessibilityRole="button"
                    accessibilityLabel={`${ROTULO_MOTIVO[chamado.motivo] ?? "Pedido"}, ${situacao.texto}${novaResposta ? ", nova resposta" : ""}. Abrir conversa`}
                    onPress={() => {
                      void marcarVisto(chamado.id, chamado.ultima_mensagem_em);
                      setConversa(chamado.id);
                    }}
                  >
                    <View style={styles.pedidoTopo}>
                      <Text style={styles.pedidoTitulo}>
                        {ROTULO_MOTIVO[chamado.motivo] ?? chamado.motivo}
                      </Text>
                      <Text style={styles.pedidoData}>
                        {formatarData(chamado.created_at)}
                      </Text>
                    </View>
                    <Text numberOfLines={2} style={styles.pedidoTexto}>
                      {chamado.descricao}
                    </Text>
                    <View style={styles.pedidoRodape}>
                      <Text
                        style={[styles.pedidoStatus, { color: situacao.cor }]}
                      >
                        {situacao.texto}
                      </Text>
                      {novaResposta ? (
                        <View style={styles.novaResposta}>
                          <Text style={styles.novaRespostaTexto}>
                            Nova resposta
                          </Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={18}
                          color="#6B7280"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {formulario && (
            <ScrollView contentContainerStyle={styles.conteudo}>
              <Text style={styles.secao}>Corrida relacionada (opcional)</Text>
              {corridas.length === 0 && (
                <Text style={styles.vazio}>Você ainda não tem corridas.</Text>
              )}
              {corridas.map((corrida) => {
                const escolhida = corridaEscolhida === corrida.id;
                return (
                  <TouchableOpacity
                    key={corrida.id}
                    style={[
                      styles.linha,
                      styles.linhaCorrida,
                      escolhida && styles.linhaEscolhida,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: escolhida }}
                    onPress={() =>
                      setCorridaEscolhida(escolhida ? null : corrida.id)
                    }
                  >
                    <View style={styles.textos}>
                      <Text style={styles.corridaCodigo} numberOfLines={1}>
                        {destinoDaCorrida(corrida)}
                      </Text>
                      <Text style={styles.pedidoData}>
                        {formatarData(corrida.tempo_solicitacao)} às{" "}
                        {formatarHora(corrida.tempo_solicitacao)} ·{" "}
                        {SITUACAO_DA_CORRIDA[corrida.status_corrida] ??
                          corrida.status_corrida}
                      </Text>
                    </View>
                    <Ionicons
                      name={escolhida ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={escolhida ? "#111" : "#BBB"}
                    />
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.secao}>Conte o que aconteceu</Text>
              <TextInput
                style={styles.campo}
                placeholder="Descreva o problema (mínimo de 10 letras)"
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                value={descricao}
                onChangeText={setDescricao}
              />
              {!!erro && (
                <Text style={styles.erro} accessibilityRole="alert">
                  {erro}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.botao, enviando && styles.botaoInativo]}
                disabled={enviando}
                accessibilityRole="button"
                onPress={enviar}
              >
                {enviando ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.botaoTexto}>Enviar pedido</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#FFF" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  voltar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 20, fontWeight: "800", color: "#111", flexShrink: 1 },
  conteudo: { padding: 16, gap: 10, paddingBottom: 40 },
  secao: { fontSize: 15, fontWeight: "800", color: "#111", marginTop: 8 },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 14,
  },
  linhaCorrida: { paddingVertical: 12 },
  linhaEscolhida: { backgroundColor: "#FFF4C2" },
  corridaCodigo: { fontSize: 15, fontWeight: "600", color: "#111" },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  linhaTexto: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111" },
  textos: { flex: 1 },
  emergencia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3C4C0",
    paddingHorizontal: 14,
    marginTop: 6,
  },
  emergenciaTexto: { fontSize: 15, fontWeight: "700", color: "#B42318" },
  vazio: { color: "#6B7280", fontSize: 14, lineHeight: 20 },
  pedido: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    padding: 14,
    gap: 4,
  },
  pedidoTopo: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  pedidoTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    flexShrink: 1,
  },
  pedidoData: { fontSize: 12, color: "#6B7280" },
  pedidoTexto: { fontSize: 13, color: "#374151", lineHeight: 18 },
  pedidoStatus: { fontSize: 12, fontWeight: "700", color: "#8A5A00" },
  pedidoRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  novaResposta: {
    borderRadius: 999,
    backgroundColor: "#1C6FD1",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  novaRespostaTexto: { fontSize: 12, fontWeight: "800", color: "#FFF" },
  campo: {
    minHeight: 120,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    padding: 14,
    fontSize: 15,
    color: "#111",
    textAlignVertical: "top",
  },
  erro: { color: "#B42318", fontSize: 14 },
  botao: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 6,
  },
  botaoInativo: { opacity: 0.6 },
  botaoTexto: { fontSize: 16, fontWeight: "700", color: "#111" },
});
