import { Text } from "@/components/common/Texto";
import { api } from "@/Services/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// "Seus ganhos": os mesmos números da tela de ganhos da gestão
// (/motorista/me/ganhos/resumo e /detalhes), no visual da referência
const { width } = Dimensions.get("window");
const AZUL = "#2D2F50";
const FUNDO = "#F2F3F5";
const APAGADO = "#9A9AA0";
const TEXTO = "#2B2B2B";
const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

type Periodo = "diario" | "semanal" | "mensal";
type TipoServico = "todos" | "corrida" | "entrega";
type Visao =
  | "solicitacoes"
  | "demonstrativo"
  | "valor_solicitacoes"
  | "recompensas"
  | "gorjetas"
  | "compensacoes"
  | "outros";

interface Resumo {
  totais: {
    valor_solicitacoes: string;
    recompensas: string;
    gorjetas: string;
    compensacoes: string;
    outros: string;
    total_ganhos: string;
    total_dinheiro: string;
    total_online: string;
    quantidade_solicitacoes: number;
  };
  produtividade: {
    ganho_por_solicitacao: string | null;
    ganho_por_km: string | null;
  };
  grafico: { data: string; valor: string }[];
}

interface LinhaDetalhe {
  id: string | number;
  data: string;
  categoria?: string;
  descricao?: string | null;
  codigo_corrida?: string;
  produto?: string | null;
  valor?: string;
  valor_liquido?: string;
}

const TIPOS: [TipoServico, string][] = [
  ["todos", "Tudo"],
  ["corrida", "Corridas"],
  ["entrega", "Entregas"],
];
const PERIODOS: [Periodo, string][] = [
  ["diario", "Diários"],
  ["semanal", "Semanais"],
  ["mensal", "Mensais"],
];
const COMPONENTES: [Visao, string][] = [
  ["valor_solicitacoes", "Valor da solicitação"],
  ["recompensas", "Recompensa"],
  ["gorjetas", "Gorjeta"],
  ["compensacoes", "Compensação"],
  ["outros", "Outro"],
];
const ROTULO_COMPONENTE = Object.fromEntries(COMPONENTES);

const reais = (valor?: string | number | null) => {
  const numero = Number(valor ?? 0) || 0;
  const [inteiro, centavos] = Math.abs(numero).toFixed(2).split(".");
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${numero < 0 ? "-" : ""}R$${milhar},${centavos}`;
};
const decimal = (valor: string) =>
  (Number(valor) || 0).toFixed(2).replace(".", ",");
const iso = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
const paraData = (texto: string) => {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};
const somarDias = (data: Date, dias: number) =>
  new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
const segunda = (data: Date) => somarDias(data, -((data.getDay() + 6) % 7));
const diaMes = (data: Date) => `${data.getDate()} ${MESES[data.getMonth()]}`;
const diaDeMes = (data: Date) =>
  `${String(data.getDate()).padStart(2, "0")} de ${MESES[data.getMonth()]}`;

const buscarResumo = (data: string, periodo: Periodo, tipo: TipoServico) =>
  api
    .get<{
      data: Resumo;
    }>("/motorista/me/ganhos/resumo", {
      params: { data, periodo, tipo_servico: tipo },
    })
    .then((resposta) => resposta.data.data);

export type PeriodoGanhos = Periodo;

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  // aba em que a tela abre, sempre no dia de hoje
  periodoInicial?: Periodo;
}

export default function SeusGanhos({
  visible,
  onClose,
  duration = 200,
  periodoInicial = "semanal",
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [isMounted, setIsMounted] = useState(visible);
  const hoje = new Date(new Date().setHours(0, 0, 0, 0));
  const [tipo, setTipo] = useState<TipoServico>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("semanal");
  const [dia, setDia] = useState(() => iso(new Date()));
  const [tentativa, setTentativa] = useState(0);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [mesSemanas, setMesSemanas] = useState(() => new Date());
  const [valoresSemanas, setValoresSemanas] = useState<Record<string, string>>(
    {},
  );
  const [lista, setLista] = useState<{ visao: Visao; titulo: string } | null>(
    null,
  );
  // cada abertura recomeça na aba pedida e em hoje, não onde parou da última vez
  const [aberta, setAberta] = useState(false);
  if (visible !== aberta) {
    setAberta(visible);
    if (visible) {
      setPeriodo(periodoInicial);
      setDia(iso(new Date()));
      setLista(null);
      setSeletorAberto(false);
    }
  }
  // a resposta guarda a consulta que a gerou: enquanto não bate, está carregando
  const chave = [dia, periodo, tipo, tentativa].join("|");
  const [resultado, setResultado] = useState<{
    chave: string;
    resumo?: Resumo;
    semana?: Resumo | null;
    erro?: boolean;
  } | null>(null);
  const carregando = resultado?.chave !== chave;
  const resumo = resultado?.resumo;
  const referencia = paraData(dia);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0);
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: width,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => finished && setIsMounted(false));
    }
  }, [visible, translateX, duration]);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!visible) return false;
      if (seletorAberto) setSeletorAberto(false);
      else if (lista) setLista(null);
      else onClose();
      return true;
    });
    return () => assinatura.remove();
  }, [visible, seletorAberto, lista, onClose]);

  useEffect(() => {
    if (!visible) return;
    let ativo = true;
    Promise.all([
      buscarResumo(dia, periodo, tipo),
      // no diário o gráfico é o da semana: tocar numa barra escolhe o dia
      periodo === "diario" ? buscarResumo(dia, "semanal", tipo) : null,
    ])
      .then(([atual, semana]) => {
        if (ativo) setResultado({ chave, resumo: atual, semana });
      })
      .catch(() => {
        if (ativo) setResultado({ chave, erro: true });
      });
    return () => {
      ativo = false;
    };
  }, [visible, chave, dia, periodo, tipo]);

  const semanas = useMemo(() => {
    const fim = new Date(
      mesSemanas.getFullYear(),
      mesSemanas.getMonth() + 1,
      0,
    );
    const agora = new Date();
    const lista: Date[] = [];
    for (
      let inicio = segunda(
        new Date(mesSemanas.getFullYear(), mesSemanas.getMonth(), 1),
      );
      inicio <= fim && inicio <= agora;
      inicio = somarDias(inicio, 7)
    ) {
      lista.push(inicio);
    }
    return lista;
  }, [mesSemanas]);

  useEffect(() => {
    if (!seletorAberto || periodo === "mensal") return;
    let ativo = true;
    Promise.all(
      semanas.map((inicio) =>
        buscarResumo(iso(inicio), "semanal", tipo).then(
          (semana) => [iso(inicio), semana.totais.total_ganhos] as const,
        ),
      ),
    )
      .then((pares) => {
        if (ativo) setValoresSemanas(Object.fromEntries(pares));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [seletorAberto, periodo, semanas, tipo]);

  if (!isMounted) return null;

  const inicioSemana = segunda(referencia);
  const rotuloPeriodo =
    periodo === "mensal"
      ? `${MESES[referencia.getMonth()]} ${referencia.getFullYear()}`
      : periodo === "semanal"
        ? `${diaMes(inicioSemana)} - ${diaMes(somarDias(inicioSemana, 6))}`
        : `${diaMes(referencia)}${dia === iso(hoje) ? " (hoje)" : ""}`;
  const grafico =
    periodo === "diario"
      ? resultado?.semana?.grafico
      : periodo === "semanal"
        ? resumo?.grafico
        : undefined;
  const meses = Array.from(
    { length: 12 },
    (_, indice) =>
      new Date(hoje.getFullYear(), hoje.getMonth() - 11 + indice, 1),
  );

  const abrirSeletor = () => {
    setMesSemanas(new Date(referencia.getFullYear(), referencia.getMonth(), 1));
    setSeletorAberto(true);
  };
  // semana passada abre na segunda; a atual, hoje
  const escolherSemana = (inicio: Date) => {
    setDia(iso(somarDias(inicio, 6) >= hoje ? hoje : inicio));
    setSeletorAberto(false);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 35 }]}>
      <Animated.View style={[styles.tela, { transform: [{ translateX }] }]}>
        <View style={[styles.topo, { paddingTop: insets.top + 8 }]}>
          <View style={styles.cabecalho}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={26} color={TEXTO} />
            </TouchableOpacity>
            <Text style={styles.titulo}>Seus ganhos</Text>
          </View>

          <View style={styles.tipos}>
            {TIPOS.map(([valor, rotulo]) => (
              <TouchableOpacity
                key={valor}
                onPress={() => setTipo(valor)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tipo === valor }}
              >
                <Text style={[styles.tipo, tipo === valor && styles.tipoAtivo]}>
                  {rotulo}
                </Text>
                <View
                  style={[
                    styles.sublinhado,
                    tipo === valor && { backgroundColor: AZUL },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.segmentos}>
            {PERIODOS.map(([valor, rotulo]) => (
              <TouchableOpacity
                key={valor}
                style={[
                  styles.segmento,
                  periodo === valor && styles.segmentoAtivo,
                ]}
                onPress={() => setPeriodo(valor)}
                accessibilityRole="tab"
                accessibilityState={{ selected: periodo === valor }}
              >
                <Text
                  style={[
                    styles.segmentoTexto,
                    periodo === valor && styles.segmentoTextoAtivo,
                  ]}
                >
                  {rotulo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.seletorData}
            onPress={abrirSeletor}
            accessibilityRole="button"
          >
            <Text style={styles.seletorDataTexto}>{rotuloPeriodo}</Text>
            <Ionicons name="caret-down" size={16} color={TEXTO} />
          </TouchableOpacity>
        </View>

        {!resumo ? (
          <View style={styles.vazio}>
            {resultado?.erro && !carregando ? (
              <>
                <Text style={styles.vazioTexto}>
                  Não foi possível carregar seus ganhos.
                </Text>
                <TouchableOpacity
                  style={styles.botaoCinza}
                  onPress={() => setTentativa((atual) => atual + 1)}
                >
                  <Text style={styles.botaoCinzaTexto}>Tentar de novo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator size="large" color={AZUL} />
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.corpo}
            contentContainerStyle={[
              styles.corpoConteudo,
              {
                paddingBottom: insets.bottom + 24,
                opacity: carregando ? 0.5 : 1,
              },
            ]}
          >
            <View style={styles.cartao}>
              <Text style={styles.total}>
                {reais(resumo.totais.total_ganhos)}
              </Text>
              <View style={styles.colunas}>
                <View style={styles.colunaResumo}>
                  <Text style={styles.valorMedio}>
                    {reais(resumo.totais.total_dinheiro)}
                  </Text>
                  <Text style={styles.legenda}>Ganhos pagos em dinheiro</Text>
                </View>
                <View style={styles.divisor} />
                <View style={styles.colunaResumo}>
                  <Text style={styles.valorMedio}>
                    {reais(resumo.totais.total_online)}
                  </Text>
                  <Text style={styles.legenda}>Ganhos pagos no app</Text>
                </View>
              </View>

              {grafico && grafico.length === 7 && (
                <Grafico
                  pontos={grafico}
                  selecionado={periodo === "diario" ? dia : undefined}
                  onEscolher={
                    periodo === "diario"
                      ? (data) => paraData(data) <= hoje && setDia(data)
                      : undefined
                  }
                />
              )}
            </View>

            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>Detalhamento de ganhos</Text>
              {COMPONENTES.map(([visao, rotulo]) => (
                <TouchableOpacity
                  key={visao}
                  style={styles.linha}
                  onPress={() => setLista({ visao, titulo: rotulo })}
                  accessibilityRole="button"
                >
                  <Text style={styles.linhaRotulo}>{rotulo}</Text>
                  <View style={styles.linhaFim}>
                    <Text style={styles.linhaValor}>
                      {reais(resumo.totais[visao as keyof Resumo["totais"]])}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#BBB" />
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.botaoCinza}
                onPress={() =>
                  setLista({
                    visao: "solicitacoes",
                    titulo: "Histórico de solicitações",
                  })
                }
              >
                <Text style={styles.botaoCinzaTexto}>
                  Histórico de solicitações
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>Painel de ganhos</Text>
              <View style={styles.colunas}>
                {[
                  [reais(resumo.produtividade.ganho_por_km), "Ganhos por km"],
                  [
                    reais(resumo.produtividade.ganho_por_solicitacao),
                    "Ganhos por solicitação",
                  ],
                  [
                    String(resumo.totais.quantidade_solicitacoes),
                    "Solicitações",
                  ],
                ].map(([valor, rotulo], indice) => (
                  <View key={rotulo} style={styles.estatistica}>
                    {indice > 0 && <View style={styles.divisorEstatistica} />}
                    <View style={styles.colunaResumo}>
                      <Text style={styles.valorMedio}>{valor}</Text>
                      <Text style={styles.legenda}>{rotulo}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.ajuda}
                onPress={() =>
                  Alert.alert(
                    "Como os ganhos são calculados?",
                    "Somamos o que ficou para você em cada corrida finalizada e paga no período, já sem a taxa da plataforma, mais recompensas, gorjetas, compensações e outros lançamentos.\n\nGanhos pagos em dinheiro foram recebidos direto do passageiro; os pagos no app entraram por Pix, cartão ou saldo.\n\nGanhos por km e por solicitação dividem o total pelos km rodados e pelo número de corridas.",
                  )
                }
              >
                <Ionicons name="help-circle" size={18} color={APAGADO} />
                <Text style={styles.ajudaTexto}>
                  Como os ganhos são calculados?
                </Text>
                <Ionicons name="chevron-forward" size={14} color={APAGADO} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cartao, styles.demonstrativo]}
              onPress={() =>
                setLista({
                  visao: "demonstrativo",
                  titulo: "Demonstrativo de ganhos",
                })
              }
              accessibilityRole="button"
            >
              <Ionicons name="receipt-outline" size={24} color={TEXTO} />
              <Text style={styles.demonstrativoTexto}>
                Demonstrativo de ganhos
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#BBB" />
            </TouchableOpacity>
          </ScrollView>
        )}

        {lista && (
          <ListaGanhos
            key={`${lista.visao}|${chave}`}
            titulo={lista.titulo}
            visao={lista.visao}
            dia={dia}
            periodo={periodo}
            tipo={tipo}
            onClose={() => setLista(null)}
          />
        )}

        {seletorAberto && (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              style={styles.fundoEscuro}
              onPress={() => setSeletorAberto(false)}
              accessibilityLabel="Fechar"
            />
            <View style={[styles.folha, { paddingBottom: insets.bottom + 24 }]}>
              <TouchableOpacity
                onPress={() => setSeletorAberto(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={30} color="#111" />
              </TouchableOpacity>
              <Text style={styles.folhaTitulo}>
                {periodo === "mensal" ? "Selecionar data" : "Selecionar semana"}
              </Text>

              {periodo === "mensal" ? (
                <View style={styles.gradeMeses}>
                  {meses.map((mes) => {
                    const ativo =
                      mes.getMonth() === referencia.getMonth() &&
                      mes.getFullYear() === referencia.getFullYear();
                    return (
                      <TouchableOpacity
                        key={iso(mes)}
                        style={[styles.mes, ativo && styles.itemAtivo]}
                        onPress={() => {
                          setDia(iso(mes));
                          setSeletorAberto(false);
                        }}
                      >
                        <Text
                          style={[styles.mesTexto, ativo && styles.textoAtivo]}
                        >
                          {`${MESES[mes.getMonth()]} de ${mes.getFullYear()}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <>
                  <View style={styles.navegacaoMes}>
                    <TouchableOpacity
                      hitSlop={12}
                      onPress={() =>
                        setMesSemanas(
                          new Date(
                            mesSemanas.getFullYear(),
                            mesSemanas.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      accessibilityLabel="Mês anterior"
                    >
                      <Ionicons name="caret-back" size={18} color="#111" />
                    </TouchableOpacity>
                    <Text style={styles.navegacaoTexto}>
                      {`${MESES[mesSemanas.getMonth()]} ${mesSemanas.getFullYear()}`}
                    </Text>
                    {(() => {
                      const proximo = new Date(
                        mesSemanas.getFullYear(),
                        mesSemanas.getMonth() + 1,
                        1,
                      );
                      const pode = proximo <= hoje;
                      return (
                        <TouchableOpacity
                          hitSlop={12}
                          disabled={!pode}
                          onPress={() => setMesSemanas(proximo)}
                          accessibilityLabel="Próximo mês"
                        >
                          <Ionicons
                            name="caret-forward"
                            size={18}
                            color={pode ? "#111" : "#CCC"}
                          />
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                  {semanas.map((inicio) => {
                    const ativo = iso(inicio) === iso(inicioSemana);
                    const valor = valoresSemanas[iso(inicio)];
                    return (
                      <TouchableOpacity
                        key={iso(inicio)}
                        style={[styles.semana, ativo && styles.itemAtivo]}
                        onPress={() => escolherSemana(inicio)}
                      >
                        <Text
                          style={[
                            styles.semanaTexto,
                            ativo && styles.textoAtivo,
                          ]}
                        >
                          {`${diaDeMes(inicio)}-${diaDeMes(somarDias(inicio, 6))}`}
                        </Text>
                        <Text
                          style={[
                            styles.semanaTexto,
                            ativo && styles.textoAtivo,
                          ]}
                        >
                          {valor === undefined ? "" : reais(valor)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function Grafico({
  pontos,
  selecionado,
  onEscolher,
}: {
  pontos: { data: string; valor: string }[];
  selecionado?: string;
  onEscolher?: (data: string) => void;
}) {
  const maior = Math.max(0, ...pontos.map((ponto) => Number(ponto.valor) || 0));
  return (
    <View style={styles.grafico}>
      {pontos.map((ponto, indice) => {
        const valor = Number(ponto.valor) || 0;
        const destaque = !selecionado || ponto.data === selecionado;
        return (
          <TouchableOpacity
            key={ponto.data}
            style={styles.colunaGrafico}
            disabled={!onEscolher}
            onPress={() => onEscolher?.(ponto.data)}
            accessibilityLabel={`${DIAS[indice]}: ${reais(valor)}`}
          >
            <Text style={styles.valorBarra}>{decimal(ponto.valor)}</Text>
            {valor > 0 && (
              <View
                style={[
                  styles.barra,
                  {
                    height: Math.max(6, (valor / maior) * 90),
                    backgroundColor: destaque ? AZUL : "#C9CAD6",
                  },
                ]}
              />
            )}
            <Text
              style={[
                styles.diaBarra,
                selecionado === ponto.data && styles.diaBarraAtivo,
              ]}
            >
              {DIAS[indice]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// lista por trás de cada valor: solicitações, demonstrativo ou um componente
function ListaGanhos({
  titulo,
  visao,
  dia,
  periodo,
  tipo,
  onClose,
}: {
  titulo: string;
  visao: Visao;
  dia: string;
  periodo: Periodo;
  tipo: TipoServico;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({
    pagina: 0,
    itens: [] as LinhaDetalhe[],
    ultima: 1,
    erro: false,
  });
  const carregando = estado.pagina !== pagina;

  useEffect(() => {
    let ativo = true;
    api
      .get<{
        data: LinhaDetalhe[];
        meta: { last_page: number };
      }>("/motorista/me/ganhos/detalhes", {
        params: {
          data: dia,
          periodo,
          tipo_servico: tipo,
          visao,
          page: pagina,
          per_page: 20,
        },
      })
      .then(({ data }) => {
        if (!ativo) return;
        setEstado((antes) => ({
          pagina,
          itens: pagina === 1 ? data.data : [...antes.itens, ...data.data],
          ultima: data.meta.last_page,
          erro: false,
        }));
      })
      .catch(() => {
        if (ativo) setEstado((antes) => ({ ...antes, pagina, erro: true }));
      });
    return () => {
      ativo = false;
    };
  }, [pagina, dia, periodo, tipo, visao]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.lista]}>
      <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={26} color={TEXTO} />
        </TouchableOpacity>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      <FlatList
        data={estado.itens}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.corpoConteudo,
          { paddingBottom: insets.bottom + 24 },
        ]}
        onEndReached={() => {
          if (!carregando && pagina < estado.ultima)
            setPagina((atual) => atual + 1);
        }}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator size="large" color={AZUL} />
          ) : (
            <Text style={styles.vazioTexto}>
              {estado.erro
                ? "Não foi possível carregar a lista."
                : "Nada neste período."}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const quando = new Date(item.data);
          const detalhe =
            visao === "demonstrativo" && item.categoria
              ? ` · ${ROTULO_COMPONENTE[item.categoria] ?? item.categoria}`
              : "";
          return (
            <View style={styles.itemLista}>
              <View style={styles.itemListaTextos}>
                <Text style={styles.linhaRotulo}>
                  {item.produto
                    ? `${item.produto} · ${item.codigo_corrida}`
                    : (item.descricao ?? item.codigo_corrida ?? "Lançamento")}
                </Text>
                <Text style={styles.legendaEsquerda}>
                  {`${quando.toLocaleDateString("pt-BR")} ${quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${detalhe}`}
                </Text>
              </View>
              <Text style={styles.valorMedio}>
                {reais(item.valor ?? item.valor_liquido)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: FUNDO },
  topo: { backgroundColor: "#FFF", paddingBottom: 8 },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
  },
  titulo: { fontSize: 22, lineHeight: 28, fontWeight: "500", color: TEXTO },
  tipos: { flexDirection: "row", gap: 28, paddingHorizontal: 20 },
  tipo: { fontSize: 21, lineHeight: 28, color: TEXTO },
  tipoAtivo: { fontWeight: "600" },
  sublinhado: { height: 4, borderRadius: 2, marginTop: 4 },
  segmentos: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 0,
    borderRadius: 14,
    backgroundColor: FUNDO,
  },
  segmento: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentoAtivo: { backgroundColor: "#D7D8DE" },
  segmentoTexto: { fontSize: 17, color: TEXTO },
  segmentoTextoAtivo: { fontWeight: "600", color: AZUL },
  seletorData: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 56,
  },
  seletorDataTexto: { fontSize: 19, color: TEXTO },
  corpo: { flex: 1 },
  corpoConteudo: { padding: 16, gap: 16 },
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  vazioTexto: { fontSize: 16, color: APAGADO, textAlign: "center" },
  cartao: { backgroundColor: "#FFF", borderRadius: 18, padding: 20 },
  total: {
    fontSize: 42,
    lineHeight: 52,
    fontWeight: "500",
    color: TEXTO,
    textAlign: "center",
  },
  colunas: { flexDirection: "row", alignItems: "stretch", marginTop: 12 },
  colunaResumo: { flex: 1, alignItems: "center" },
  divisor: { width: 1, backgroundColor: "#E5E5EA", marginVertical: 4 },
  valorMedio: { fontSize: 19, lineHeight: 26, fontWeight: "600", color: TEXTO },
  legenda: {
    fontSize: 15,
    lineHeight: 20,
    color: APAGADO,
    textAlign: "center",
  },
  legendaEsquerda: { fontSize: 14, lineHeight: 20, color: APAGADO },
  // sem altura fixa: a barra mais alta (90) define o tamanho; sem ganhos, só os rótulos
  grafico: { flexDirection: "row", alignItems: "flex-end", marginTop: 20 },
  colunaGrafico: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  valorBarra: { fontSize: 13, color: TEXTO, marginBottom: 6 },
  barra: { width: "80%", borderRadius: 4 },
  diaBarra: { fontSize: 15, color: TEXTO, marginTop: 8 },
  diaBarraAtivo: { fontWeight: "700", color: AZUL },
  cartaoTitulo: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "500",
    color: TEXTO,
    marginBottom: 8,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
  },
  linhaRotulo: { fontSize: 17, lineHeight: 24, color: TEXTO },
  linhaFim: { flexDirection: "row", alignItems: "center", gap: 4 },
  linhaValor: { fontSize: 17, color: APAGADO },
  botaoCinza: {
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: FUNDO,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoCinzaTexto: { fontSize: 17, fontWeight: "500", color: TEXTO },
  estatistica: { flex: 1, flexDirection: "row" },
  divisorEstatistica: { width: 1, backgroundColor: "#E5E5EA" },
  ajuda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 28,
    minHeight: 32,
  },
  ajudaTexto: { fontSize: 15, color: APAGADO },
  demonstrativo: { flexDirection: "row", alignItems: "center", gap: 16 },
  demonstrativoTexto: {
    flex: 1,
    fontSize: 19,
    fontWeight: "600",
    color: TEXTO,
  },
  lista: { backgroundColor: FUNDO },
  itemLista: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFF",
  },
  itemListaTextos: { flex: 1 },
  fundoEscuro: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  folha: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFF",
  },
  folhaTitulo: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "600",
    color: "#111",
    marginTop: 8,
    marginBottom: 16,
  },
  gradeMeses: { flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  mes: {
    width: "33.33%",
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mesTexto: { fontSize: 16, color: TEXTO },
  itemAtivo: { backgroundColor: AZUL },
  textoAtivo: { color: "#FFF", fontWeight: "500" },
  navegacaoMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    minHeight: 52,
    marginHorizontal: -16,
    marginBottom: 12,
    backgroundColor: "#F5F5F7",
  },
  navegacaoTexto: { fontSize: 18, fontWeight: "500", color: TEXTO },
  semana: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  semanaTexto: { fontSize: 16, color: TEXTO },
});
