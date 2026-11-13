import Carregando3D from "@/components/common/Carregando3D";
import { Text } from "@/components/common/Texto";
import MedidorTaxaFinalizacao from "@/components/MedidorTaxaFinalizacao";
import {
  COR_ACIMA,
  avisoDaSituacaoTaxa,
  corDaTaxa,
  rotuloDia,
  rotuloDiaCurto,
  rotuloPeriodo,
  textoDuracoes,
  type DetalheFinalizacao,
  type DiaDaTaxa,
} from "@/domain/taxaFinalizacao";
import { api } from "@/Services/api";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

type Aba = "corridas" | "entregas";
type ModoHistorico = "janela" | "diaria";

// ---- gráfico diário ----
const ALTURA_BARRA = 150;
const LARGURA_BARRA = 40;
const FOLGA_BARRA = 28;
const TOPO_BALAO = 34;
const ALTURA_ROTULO = 26;
const LARGURA_EIXO = 54;

function Abas({ aba, onChange }: { aba: Aba; onChange: (aba: Aba) => void }) {
  return (
    <View style={styles.abas}>
      {(
        [
          ["corridas", "Corridas"],
          ["entregas", "Entregas"],
        ] as const
      ).map(([valor, rotulo]) => (
        <TouchableOpacity
          key={valor}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === valor }}
          onPress={() => onChange(valor)}
          style={[styles.aba, aba === valor && styles.abaAtiva]}
        >
          <Text
            style={[styles.abaTexto, aba === valor && styles.abaTextoAtiva]}
          >
            {rotulo}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Secao({
  titulo,
  aberta,
  onAlternar,
  children,
  grande = false,
}: {
  titulo: string;
  aberta: boolean;
  onAlternar: () => void;
  children: ReactNode;
  grande?: boolean;
}) {
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        onPress={onAlternar}
        style={styles.secaoCabecalho}
      >
        <Text style={grande ? styles.tituloSecao : styles.tituloItem}>
          {titulo}
        </Text>
        <Ionicons
          name={aberta ? "chevron-up" : "chevron-down"}
          size={20}
          color="#888"
        />
      </TouchableOpacity>
      {aberta ? children : null}
    </View>
  );
}

function GraficoDiario({
  dias,
  minima,
  selecionado,
  onSelecionar,
}: {
  dias: DiaDaTaxa[];
  minima: number;
  selecionado: number;
  onSelecionar: (indice: number) => void;
}) {
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const alturaTotal = TOPO_BALAO + ALTURA_BARRA + ALTURA_ROTULO;
  const topoDaMinima = TOPO_BALAO + (1 - minima / 100) * ALTURA_BARRA;

  return (
    <View style={[styles.grafico, { height: alturaTotal }]}>
      <ScrollView
        ref={rolagem}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginRight: LARGURA_EIXO }}
        onContentSizeChange={() =>
          rolagem.current?.scrollToEnd({ animated: false })
        }
      >
        {dias.map((dia, indice) => {
          const ativo = indice === selecionado;
          const altura =
            dia.taxa === null
              ? 0
              : Math.max(4, (dia.taxa / 100) * ALTURA_BARRA);

          return (
            <Pressable
              key={dia.data}
              accessibilityRole="button"
              accessibilityLabel={`${rotuloDia(dia.data)}: ${
                dia.taxa === null ? "sem corridas" : `${dia.taxa}%`
              }`}
              onPress={() => onSelecionar(indice)}
              style={[styles.coluna, { width: LARGURA_BARRA + FOLGA_BARRA }]}
            >
              <View style={styles.areaDaBarra}>
                {ativo && dia.taxa !== null ? (
                  <View
                    style={[styles.balao, { bottom: altura + 8 }]}
                    pointerEvents="none"
                  >
                    <Text style={styles.balaoTexto}>
                      {dia.taxa}
                      <Text style={styles.balaoSimbolo}>%</Text>
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    width: LARGURA_BARRA,
                    height: altura,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                    backgroundColor: ativo
                      ? corDaTaxa(dia.taxa ?? 100, minima)
                      : "#F0F0F0",
                  }}
                />
              </View>
              <Text style={[styles.rotuloDoDia, ativo && styles.rotuloAtivo]}>
                {rotuloDiaCurto(dia.data)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        pointerEvents="none"
        style={[styles.linhaMinima, { top: topoDaMinima }]}
      />
      <View pointerEvents="none" style={styles.eixo}>
        <Text style={[styles.eixoTexto, { top: TOPO_BALAO - 8 }]}>100%</Text>
        <Text
          style={[
            styles.eixoTexto,
            { top: topoDaMinima - 8, color: COR_ACIMA },
          ]}
        >
          {minima}%
        </Text>
        <Text
          style={[styles.eixoTexto, { top: TOPO_BALAO + ALTURA_BARRA - 8 }]}
        >
          0%
        </Text>
      </View>
    </View>
  );
}

export default function TaxaFinalizacao({
  visible,
  onClose,
  duration = 200,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [tela, setTela] = useState<"resumo" | "historico">("resumo");
  const [aba, setAba] = useState<Aba>("corridas");
  const [modoHistorico, setModoHistorico] = useState<ModoHistorico>("janela");
  const [dados, setDados] = useState<DetalheFinalizacao | null>(null);
  const [erro, setErro] = useState("");
  const [diaEscolhido, setDiaEscolhido] = useState<number | null>(null);
  const [abertas, setAbertas] = useState({
    diario: true,
    afeta: true,
    oQueE: true,
    quando: true,
    recuperar: true,
  });

  const alternar = (chave: keyof typeof abertas) =>
    setAbertas((atuais) => ({ ...atuais, [chave]: !atuais[chave] }));

  // os números vêm do servidor toda vez que a tela abre
  useEffect(() => {
    if (!visible) return;

    let ativo = true;
    api
      .get<DetalheFinalizacao>("/motorista/me/taxa-finalizacao")
      .then(({ data }) => {
        if (!ativo) return;
        setDados(data);
        setErro("");
        setDiaEscolhido(null);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar a taxa de finalização.");
      });

    return () => {
      ativo = false;
    };
  }, [visible]);

  useEffect(() => {
    const aoVoltar = () => {
      if (!visible) return false;
      if (tela === "historico") {
        setTela("resumo");
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      aoVoltar,
    );
    return () => subscription.remove();
  }, [visible, tela, onClose]);

  useEffect(() => {
    if (visible) {
      const mountTimer = setTimeout(() => setIsMounted(true), 0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start();
      return () => clearTimeout(mountTimer);
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: width,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: duration * 0.8,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        setTela("resumo");
      }
    });
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  const emHistorico = tela === "historico";
  const aviso = avisoDaSituacaoTaxa(dados?.situacao_taxa);
  const indiceDoDia = dados
    ? Math.min(diaEscolhido ?? dados.diario.length - 1, dados.diario.length - 1)
    : 0;
  const dia = dados?.diario[indiceDoDia];

  const semEntregas = (
    <Text style={styles.vazio}>Ainda não há entregas para mostrar.</Text>
  );

  const carregandoOuErro = dados ? null : (
    <View style={styles.centralizado}>
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : (
        <Carregando3D tamanho={36} cor="#FFB800" />
      )}
    </View>
  );

  const resumo = dados ? (
    <>
      <Text style={styles.tituloPagina}>Últimos 30 dias</Text>
      <Text style={styles.periodo}>
        {rotuloPeriodo(dados.periodo.de, dados.periodo.ate)}
      </Text>

      {aviso ? (
        <View style={styles.aviso}>
          <Ionicons name="warning" size={18} color="#B3261E" />
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </View>
      ) : null}

      <View style={styles.cartao}>
        <MedidorTaxaFinalizacao taxa={dados.taxa} minima={dados.minima} />
        <View style={styles.mensagem}>
          <Text style={styles.mensagemTexto}>
            Mantenha esse valor acima de {dados.minima}% para ter acesso
            ininterrupto às corridas.
          </Text>
        </View>
        <View style={styles.linhaContagem}>
          <Text style={styles.contagemRotulo}>Corridas finalizadas</Text>
          <Text style={styles.contagemValor}>{dados.finalizadas}</Text>
        </View>
        <View style={styles.linhaContagem}>
          <Text style={styles.contagemRotulo}>Corridas canceladas</Text>
          <Text style={styles.contagemValor}>{dados.canceladas}</Text>
        </View>
      </View>

      <Secao
        grande
        titulo="Dados diários"
        aberta={abertas.diario}
        onAlternar={() => alternar("diario")}
      >
        <View style={styles.cartao}>
          <GraficoDiario
            dias={dados.diario}
            minima={dados.minima}
            selecionado={indiceDoDia}
            onSelecionar={setDiaEscolhido}
          />
          <View style={styles.linhaContagem}>
            <Text style={styles.contagemRotulo}>Corridas finalizadas</Text>
            <Text style={styles.contagemValor}>{dia?.finalizadas ?? 0}</Text>
          </View>
          <View style={styles.linhaContagem}>
            <Text style={styles.contagemRotulo}>Corridas canceladas</Text>
            <Text style={styles.contagemValor}>{dia?.canceladas ?? 0}</Text>
          </View>
        </View>
      </Secao>

      <Text style={[styles.tituloSecao, styles.tituloSolto]}>
        Como a TF afeta você
      </Text>
      <View style={styles.cartao}>
        <Secao
          titulo="Afeta sua capacidade de receber chamadas"
          aberta={abertas.afeta}
          onAlternar={() => alternar("afeta")}
        >
          <Text style={styles.explicacao}>
            Você pode perder a capacidade de aceitar solicitações por{" "}
            {textoDuracoes(dados.regras.duracoes_dias)} se sua Taxa de
            Finalização (TF) de corridas ficar abaixo de {dados.minima}% até o
            dia {dados.regras.prazo_dia} do mês. Antes disso você recebe um
            alerta e pode recuperar a taxa finalizando as corridas que aceitar.
            A cada mês seguinte sem recuperar, a restrição aumenta.
          </Text>
        </Secao>
      </View>

      <Text style={[styles.tituloSecao, styles.tituloSolto]}>
        Mais informações
      </Text>
      <View style={styles.cartao}>
        <Secao
          titulo="1. O que é a Taxa de Finalização (TF)?"
          aberta={abertas.oQueE}
          onAlternar={() => alternar("oQueE")}
        >
          <Text style={styles.explicacao}>
            A TF é a porcentagem de corridas finalizadas do total de corridas
            aceitas nos últimos 30 dias.{"\n"}
            Por exemplo: se sua Taxa de Finalização (TF) for 90%, significa que
            você cancelou 10% das corridas que aceitou.
          </Text>
        </Secao>
        <Secao
          titulo="2. Quando a Taxa de Finalização (TF) é afetada?"
          aberta={abertas.quando}
          onAlternar={() => alternar("quando")}
        >
          <Text style={styles.explicacao}>
            Se você cancelar uma corrida por qualquer motivo após aceitá-la, sua
            TF será afetada. Desistir de uma corrida em grupo depois de aceitar
            também afeta.{"\n"}
            Não afetam sua TF os cancelamentos feitos pelo passageiro ou pelo
            sistema, nem quando o passageiro não aparece no embarque.
          </Text>
        </Secao>
        <Secao
          titulo="3. Como recuperar minha TF?"
          aberta={abertas.recuperar}
          onAlternar={() => alternar("recuperar")}
        >
          <Text style={styles.explicacao}>
            Finalize as corridas que você aceitar: cada corrida finalizada sobe
            a taxa, e os cancelamentos deixam de contar depois de 30 dias.
            Aceite só as corridas que tem certeza de que poderá concluir.
          </Text>
        </Secao>
      </View>
    </>
  ) : (
    carregandoOuErro
  );

  const historico = dados ? (
    <>
      <View style={styles.chips}>
        {(
          [
            ["janela", "Últimos 30 dias"],
            ["diaria", "Diária"],
          ] as const
        ).map(([valor, rotulo]) => (
          <TouchableOpacity
            key={valor}
            accessibilityRole="button"
            accessibilityState={{ selected: modoHistorico === valor }}
            onPress={() => setModoHistorico(valor)}
            style={[styles.chip, modoHistorico === valor && styles.chipAtivo]}
          >
            <Text
              style={[
                styles.chipTexto,
                modoHistorico === valor && styles.chipTextoAtivo,
              ]}
            >
              {rotulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {modoHistorico === "janela"
        ? dados.historico.map((janela) => (
            <View key={janela.ate} style={styles.itemHistorico}>
              <Text style={styles.itemHistoricoRotulo}>
                {rotuloPeriodo(janela.de, janela.ate, "-")}
              </Text>
              <Text style={styles.itemHistoricoValor}>{janela.taxa}%</Text>
            </View>
          ))
        : [...dados.diario].reverse().map((item) => (
            <View key={item.data} style={styles.itemHistorico}>
              <View>
                <Text style={styles.itemHistoricoRotulo}>
                  {rotuloDia(item.data)}
                </Text>
                <Text style={styles.itemHistoricoDetalhe}>
                  {item.finalizadas} finalizadas · {item.canceladas} canceladas
                </Text>
              </View>
              <Text style={styles.itemHistoricoValor}>
                {item.taxa === null ? "—" : `${item.taxa}%`}
              </Text>
            </View>
          ))}
    </>
  ) : (
    carregandoOuErro
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => (emHistorico ? setTela("resumo") : onClose())}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>
            {emHistorico ? "Histórico" : "Taxa de Finalização"}
          </Text>
          {emHistorico ? null : (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setTela("historico")}
              hitSlop={10}
            >
              <Text style={styles.headerLink}>Histórico</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.corpo}
          contentContainerStyle={[
            styles.conteudo,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Abas aba={aba} onChange={setAba} />
          {aba === "entregas" ? semEntregas : emHistorico ? historico : resumo}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 30 },
  overlay: { backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#F4F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    elevation: 2,
  },
  headerTitulo: { flex: 1, fontSize: 20, fontWeight: "600", color: "#222" },
  headerLink: { fontSize: 15, color: "#777" },
  corpo: { flex: 1 },
  conteudo: { paddingHorizontal: 16, paddingTop: 8 },
  centralizado: { paddingVertical: 60, alignItems: "center" },
  erro: { color: "#B3261E", fontSize: 14, textAlign: "center" },
  vazio: {
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    paddingVertical: 60,
  },

  abas: { flexDirection: "row", gap: 28, marginTop: 8, marginBottom: 20 },
  aba: {
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  abaAtiva: { borderColor: "#FFB800" },
  abaTexto: { fontSize: 22, color: "#333" },
  abaTextoAtiva: { fontWeight: "600" },

  tituloPagina: { fontSize: 24, fontWeight: "bold", color: "#222" },
  periodo: { fontSize: 16, color: "#888", marginTop: 4, marginBottom: 18 },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: "#FDECEA",
  },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: "#B3261E" },

  cartao: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
  },
  mensagem: {
    backgroundColor: "#F4F4F6",
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
  },
  mensagemTexto: { fontSize: 17, lineHeight: 25, color: "#222" },
  linhaContagem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  contagemRotulo: { fontSize: 17, color: "#222" },
  contagemValor: { fontSize: 17, fontWeight: "bold", color: "#222" },

  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  tituloSecao: { flex: 1, fontSize: 24, fontWeight: "bold", color: "#222" },
  tituloSolto: { marginTop: 6, marginBottom: 12 },
  tituloItem: { flex: 1, fontSize: 18, color: "#222" },
  explicacao: {
    fontSize: 16,
    lineHeight: 24,
    color: "#777",
    paddingBottom: 10,
  },

  grafico: { marginBottom: 12 },
  coluna: { alignItems: "center" },
  areaDaBarra: {
    height: TOPO_BALAO + ALTURA_BARRA,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  balao: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  balaoTexto: { fontSize: 20, fontWeight: "bold", color: "#111" },
  balaoSimbolo: { fontSize: 13, fontWeight: "bold", color: "#111" },
  rotuloDoDia: {
    height: ALTURA_ROTULO,
    paddingTop: 6,
    fontSize: 14,
    color: "#888",
  },
  rotuloAtivo: { color: "#111", fontWeight: "600" },
  linhaMinima: {
    position: "absolute",
    left: 0,
    right: LARGURA_EIXO,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: COR_ACIMA,
  },
  eixo: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: LARGURA_EIXO,
  },
  eixoTexto: {
    position: "absolute",
    right: 0,
    fontSize: 15,
    color: "#888",
  },

  chips: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#ECECEE",
  },
  chipAtivo: { backgroundColor: "#FFE9B8" },
  chipTexto: { fontSize: 17, color: "#444" },
  chipTextoAtivo: { color: "#B07A00", fontWeight: "600" },
  itemHistorico: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 22,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDD",
  },
  itemHistoricoRotulo: { fontSize: 17, color: "#222" },
  itemHistoricoDetalhe: { fontSize: 13, color: "#888", marginTop: 2 },
  itemHistoricoValor: { fontSize: 17, fontWeight: "bold", color: "#222" },
});
