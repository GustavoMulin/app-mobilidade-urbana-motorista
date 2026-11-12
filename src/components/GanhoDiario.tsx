import { Text } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { formatarValorHistorico as reais } from "@/domain/historicoCorridas";
import {
  useHistoricoCorridas,
  type ItemHistorico,
} from "@/hooks/useHistoricoCorridas";
import { useModalAnimation } from "@/hooks/useModalAnimation";
import { api } from "@/Services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import CentralGanhos from "./CentralGanhos";
import EditarPainelGanhos from "./EditarPainelGanhos";
import HistoricoCorridas from "./HistoricoCorridas";
import ObjetivoSemanal from "./ObjetivoSemanal";
import SeusGanhos, { type PeriodoGanhos } from "./SeusGanhos";

interface GanhoDiarioProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  corridaAtivaId: number | null;
  ocultarAtalho?: boolean;
}

const valorNumerico = (valor: string) => {
  const normalizado = valor
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
};

const soma = (itens: ItemHistorico[], campo: (item: ItemHistorico) => string) =>
  itens.reduce((total, item) => total + valorNumerico(campo(item)), 0);

// "dd/mm/aaaa" do histórico; "—" vira data inválida e fica fora da semana
const paraData = (texto: string) => {
  const [dia, mes, ano] = texto.split("/").map(Number);
  return new Date(ano, mes - 1, dia);
};

// o que o motorista pode pôr no painel, na ordem da tela "Editar Painel"
const ROTULOS_PAINEL: Record<string, string> = {
  ultima: "Valor da última corrida",
  semana: "Ganhos desta semana",
  porCorridaSemana: "Por corrida (semana)",
  porCorridaHoje: "Por corrida (hoje)",
  corridasSemana: "Corridas (semana)",
  porKmHoje: "Por km (hoje)",
  porKmSemana: "Por km (semana)",
  taxaSemana: "Taxa da plataforma (semana)",
  dinheiroSemana: "Pagos em dinheiro (semana)",
  appSemana: "Pagos no app (semana)",
  saldo: "Saldo",
};
const FIXOS_PAINEL = ["ultima", "semana"];
const MAXIMO_PAINEL = 6;
const PADRAO_PAINEL = [
  "ultima",
  "semana",
  "porCorridaSemana",
  "taxaSemana",
  "corridasSemana",
  "porKmHoje",
];

// os fixos sempre primeiro; ids desconhecidos ou repetidos saem; no máximo 6
const normalizarPainel = (ids: unknown): string[] => {
  const escolhidos = Array.isArray(ids)
    ? ids.filter(
        (id): id is string =>
          typeof id === "string" &&
          id in ROTULOS_PAINEL &&
          !FIXOS_PAINEL.includes(id),
      )
    : [];
  return [...FIXOS_PAINEL, ...new Set(escolhidos)].slice(0, MAXIMO_PAINEL);
};

export default function GanhoDiario({
  visible,
  setVisible,
  corridaAtivaId,
  ocultarAtalho = false,
}: GanhoDiarioProps) {
  const insets = useSafeAreaInsets();
  const [mostrarValor, setMostrarValor] = useState(true);
  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [centralVisivel, setCentralVisivel] = useState(false);
  const [objetivoVisivel, setObjetivoVisivel] = useState(false);
  // aba em que "Seus ganhos" abre; null = fechado
  const [seusGanhos, setSeusGanhos] = useState<PeriodoGanhos | null>(null);
  const [meta, setMeta] = useState<number | null>(null);
  const [editarVisivel, setEditarVisivel] = useState(false);
  const [selecionados, setSelecionados] = useState(PADRAO_PAINEL);
  const [saldo, setSaldo] = useState(0);
  const { user } = useAuth();
  // ponytail: a meta e os itens do painel ficam só no aparelho; em outro
  // celular o motorista escolhe de novo. Para seguir a conta, guardar no backend
  const chaveMeta = user ? `@meta_ganhos_semanal:${user.id}` : null;
  const chavePainel = user ? `@painel_ganhos:${user.id}` : null;
  const { itens, erro, recarregar } = useHistoricoCorridas(true);
  const corridaAnterior = useRef(corridaAtivaId);
  const hoje = new Date().toLocaleDateString("pt-BR");
  // o painel fica montado fora da tela e desce do topo ao abrir
  const { slideAnim, overlayOpacity, closeAnimation } = useModalAnimation(
    visible,
    { slideFrom: "top", duration: 200, overlayDuration: 300 },
  );

  useEffect(() => {
    if (!visible) closeAnimation(() => {});
  }, [visible, closeAnimation]);

  // chamada na tela ou folha aberta escondem o atalho: o painel fecha junto
  useEffect(() => {
    if (ocultarAtalho) setVisible(false);
  }, [ocultarAtalho, setVisible]);

  useEffect(() => {
    if (!chaveMeta) return;
    AsyncStorage.getItem(chaveMeta)
      .then((salva) => setMeta(salva ? Number(salva) : null))
      .catch(() => setMeta(null));
  }, [chaveMeta]);

  useEffect(() => {
    if (!chavePainel) return;
    AsyncStorage.getItem(chavePainel)
      .then((salvo) =>
        setSelecionados(
          salvo ? normalizarPainel(JSON.parse(salvo)) : PADRAO_PAINEL,
        ),
      )
      .catch(() => setSelecionados(PADRAO_PAINEL));
  }, [chavePainel]);

  const salvarPainel = (ids: string[]) => {
    const painelNovo = normalizarPainel(ids);
    setSelecionados(painelNovo);
    if (chavePainel) {
      AsyncStorage.setItem(chavePainel, JSON.stringify(painelNovo)).catch(
        () => {},
      );
    }
  };

  const salvarMeta = (texto: string) => {
    const valor = valorNumerico(texto);
    if (!chaveMeta || valor <= 0) return;
    setMeta(valor);
    AsyncStorage.setItem(chaveMeta, String(valor)).catch(() => {});
  };

  useEffect(() => {
    if (corridaAnterior.current !== null && corridaAtivaId === null) {
      void recarregar();
    }
    corridaAnterior.current = corridaAtivaId;
  }, [corridaAtivaId, recarregar]);

  const totalHoje = useMemo(
    () =>
      itens
        .filter(
          (item) => item.date === hoje && (item.isFinalized || item.isNoShow),
        )
        .reduce((total, item) => total + valorNumerico(item.driverEarned), 0),
    [hoje, itens],
  );

  // ponytail: conta só a 1ª página do histórico (50 corridas); se a semana
  // passar disso, somar no backend em /motorista/me/ganhos
  const painel = useMemo(() => {
    const agora = new Date();
    const inicioSemana = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() - ((agora.getDay() + 6) % 7),
    );
    const comGanho = itens.filter((item) => item.isFinalized || item.isNoShow);
    const inicioSemanaPassada = new Date(
      inicioSemana.getFullYear(),
      inicioSemana.getMonth(),
      inicioSemana.getDate() - 7,
    );
    const daSemana = comGanho.filter(
      (item) => paraData(item.date) >= inicioSemana,
    );
    const daSemanaPassada = comGanho.filter((item) => {
      const data = paraData(item.date);
      return data >= inicioSemanaPassada && data < inicioSemana;
    });
    const ganhosSemana = soma(daSemana, (item) => item.driverEarned);
    const corridasSemana = daSemana.filter((item) => item.isFinalized);
    const corridasHoje = comGanho.filter(
      (item) => item.isFinalized && item.date === hoje,
    );
    const pagoSemana = soma(corridasSemana, (item) => item.passengerPaid);
    const kmHoje = soma(corridasHoje, (item) => item.distance);
    const kmSemana = soma(corridasSemana, (item) => item.distance);
    const ganhou = (item: ItemHistorico) => item.driverEarned;

    return {
      // sem corrida, cada valor mostra zero em vez de traço
      ultima: reais(
        valorNumerico(
          comGanho.find((item) => item.isFinalized)?.driverEarned ?? "",
        ),
      ),
      ganhosSemana,
      ganhosSemanaPassada: soma(daSemanaPassada, (item) => item.driverEarned),
      semana: reais(ganhosSemana),
      porCorrida: reais(
        corridasSemana.length
          ? soma(corridasSemana, (item) => item.driverEarned) /
              corridasSemana.length
          : 0,
      ),
      corridas: String(corridasSemana.length),
      taxa: `${
        pagoSemana > 0
          ? Math.round(
              (soma(corridasSemana, (item) => item.platformFee) / pagoSemana) *
                100,
            )
          : 0
      }%`,
      porKm: reais(
        kmHoje > 0
          ? soma(corridasHoje, (item) => item.driverEarned) / kmHoje
          : 0,
      ),
      porCorridaHoje: reais(
        corridasHoje.length
          ? soma(corridasHoje, ganhou) / corridasHoje.length
          : 0,
      ),
      porKmSemana: reais(
        kmSemana > 0 ? soma(corridasSemana, ganhou) / kmSemana : 0,
      ),
      dinheiroSemana: reais(
        soma(
          daSemana.filter((item) => item.paymentMethod === "cash"),
          ganhou,
        ),
      ),
      appSemana: reais(
        soma(
          daSemana.filter((item) => item.paymentMethod === "app"),
          ganhou,
        ),
      ),
    };
  }, [hoje, itens]);

  const valor = reais(totalHoje);

  const valores: Record<string, string> = {
    ultima: painel.ultima,
    semana: painel.semana,
    porCorridaSemana: painel.porCorrida,
    porCorridaHoje: painel.porCorridaHoje,
    corridasSemana: painel.corridas,
    porKmHoje: painel.porKm,
    porKmSemana: painel.porKmSemana,
    taxaSemana: painel.taxa,
    dinheiroSemana: painel.dinheiroSemana,
    appSemana: painel.appSemana,
    saldo: reais(saldo),
  };
  // cada item leva ao período dele em "Seus ganhos"
  const semanal = () => setSeusGanhos("semanal");
  const diario = () => setSeusGanhos("diario");
  const acoes: Record<string, () => void> = {
    ultima: () => setHistoricoVisivel(true),
    semana: semanal,
    porCorridaSemana: semanal,
    porCorridaHoje: diario,
    corridasSemana: semanal,
    porKmHoje: diario,
    porKmSemana: semanal,
    taxaSemana: semanal,
    dinheiroSemana: semanal,
    appSemana: semanal,
    saldo: () => setCentralVisivel(true),
  };
  const celulas = selecionados.map((id) => ({
    id,
    rotulo: ROTULOS_PAINEL[id],
    valor: valores[id],
    onPress: acoes[id],
  }));

  const alternarPainel = () => {
    if (!visible) {
      void recarregar();
      api
        .get<{ saldo: number }>("/motorista/me/ganhos")
        .then(({ data }) => setSaldo(Number(data.saldo) || 0))
        .catch(() => {});
    }
    setVisible(!visible);
  };

  return (
    <>
      <View
        style={[StyleSheet.absoluteFill, styles.camadaPainel]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.fundo,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
            accessibilityLabel="Fechar painel de ganhos"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.painel,
            {
              // abaixo do botão de ganhos, que continua por cima
              paddingTop: insets.top + 72,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.tituloLinha}>
            <Text style={styles.titulo}>Painel</Text>
            <TouchableOpacity
              style={styles.editar}
              onPress={() => setEditarVisivel(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Editar painel"
            >
              <Ionicons name="create-outline" size={18} color="#8A8A8F" />
              <Text style={styles.editarTexto}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.verMais}
              onPress={() => setSeusGanhos("semanal")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Mais: abrir Seus ganhos"
            >
              <Text style={styles.editarTexto}>Mais</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A8A8F" />
            </TouchableOpacity>
          </View>
          <View style={styles.grade}>
            {/* sempre 3 por fila, com o traço entre as colunas */}
            {celulas.map((celula, indice) => (
              <TouchableOpacity
                key={celula.id}
                style={[styles.celula, indice % 3 > 0 && styles.celulaDivisor]}
                onPress={celula.onPress}
                accessibilityRole="button"
              >
                <Text style={styles.celulaValor}>{celula.valor}</Text>
                <Text style={styles.celulaRotulo}>{`${celula.rotulo} ›`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.botaoCentral}
            onPress={() => setCentralVisivel(true)}
            accessibilityRole="button"
          >
            <Text style={styles.botaoCentralTexto}>Ver Central de ganhos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.meta}
            onPress={() => setObjetivoVisivel(true)}
            accessibilityRole="button"
          >
            <Text style={styles.metaTitulo}>Meta de ganhos escolhida</Text>
            <View style={styles.metaLinha}>
              <Ionicons name="trophy-outline" size={24} color="#F5C518" />
              <View style={styles.metaTextos}>
                <Text style={styles.metaRotulo}>Objetivo semanal</Text>
                <Text style={styles.metaSub}>
                  {meta
                    ? "Continue aumentando seus ganhos"
                    : "Toque para definir sua meta"}
                </Text>
              </View>
              {meta !== null && (
                <Text style={styles.metaValores}>
                  {`${reais(painel.ganhosSemana)} / ${reais(meta)}`}
                </Text>
              )}
            </View>
            {meta !== null && (
              <View style={styles.barra}>
                <View
                  style={[
                    styles.barraCheia,
                    {
                      width: `${Math.min(100, (painel.ganhosSemana / meta) * 100)}%`,
                    },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {!ocultarAtalho && (
        <SafeAreaView style={styles.container} pointerEvents="box-none">
          <View style={styles.valorButton}>
            <TouchableOpacity
              onPress={() => setMostrarValor((atual) => !atual)}
              accessibilityRole="button"
              accessibilityLabel={
                mostrarValor
                  ? "Ocultar ganhos de hoje"
                  : "Mostrar ganhos de hoje"
              }
            >
              <Ionicons
                name={mostrarValor ? "eye" : "eye-off"}
                size={19}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.abrirPainel}
              onPress={alternarPainel}
              accessibilityRole="button"
              accessibilityLabel={
                visible ? "Fechar painel de ganhos" : "Abrir painel de ganhos"
              }
            >
              <Text style={styles.valorText}>
                {mostrarValor ? (erro ? "Indisponível" : valor) : "••••••"}
              </Text>
              <Ionicons
                name={visible ? "chevron-up" : "chevron-down"}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      <HistoricoCorridas
        visible={historicoVisivel}
        onClose={() => setHistoricoVisivel(false)}
      />
      <CentralGanhos
        visible={centralVisivel}
        onClose={() => setCentralVisivel(false)}
      />
      <ObjetivoSemanal
        visible={objetivoVisivel}
        onClose={() => setObjetivoVisivel(false)}
        meta={meta}
        ganhosSemana={painel.ganhosSemana}
        ganhosSemanaPassada={painel.ganhosSemanaPassada}
        onSalvarMeta={salvarMeta}
      />
      <EditarPainelGanhos
        visible={editarVisivel}
        onClose={() => setEditarVisivel(false)}
        opcoes={Object.keys(ROTULOS_PAINEL).map((id) => ({
          id,
          rotulo: ROTULOS_PAINEL[id],
          valor: valores[id],
        }))}
        selecionados={selecionados}
        fixos={FIXOS_PAINEL}
        maximo={MAXIMO_PAINEL}
        onConfirmar={salvarPainel}
      />
      <SeusGanhos
        visible={seusGanhos !== null}
        periodoInicial={seusGanhos ?? "semanal"}
        onClose={() => setSeusGanhos(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  valorButton: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: "#666",
  },
  abrirPainel: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  valorText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
  },
  camadaPainel: { zIndex: 8 },
  fundo: { backgroundColor: "rgba(0,0,0,0.6)" },
  painel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#111" },
  editar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingLeft: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#CCC",
  },
  editarTexto: { fontSize: 16, color: "#8A8A8F" },
  // empurrado para a direita da linha do título
  verMais: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 32,
  },
  grade: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  celula: { width: "33.33%", alignItems: "center", paddingHorizontal: 4 },
  celulaDivisor: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#D5D5D5",
  },
  celulaValor: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  celulaRotulo: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5F6368",
    textAlign: "center",
  },
  botaoCentral: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoCentralTexto: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  meta: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.12)",
  },
  metaTitulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  metaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  metaTextos: { flex: 1 },
  metaRotulo: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#111",
  },
  metaSub: { fontSize: 13, lineHeight: 18, color: "#5F6368" },
  metaValores: { fontSize: 15, fontWeight: "600", color: "#111" },
  barra: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEE",
    overflow: "hidden",
  },
  barraCheia: { height: "100%", backgroundColor: "#F5C518" },
});
