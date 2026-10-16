// Espera no embarque (motorista_chegou) no layout do 99: endereço do embarque
// numa pílula escura no topo, faixa laranja da taxa de espera, relógio em
// anel, passageiro e "Iniciar corrida". O ≡ abre a tela Mais (cancelar com
// motivo, ausência do passageiro, recusar novas corridas).
import BotaoChatPassageiro from "@/components/BotaoChatPassageiro";
import AnelProgresso from "@/components/AnelProgresso";
import BotaoDeslizar from "@/components/BotaoDeslizar";
import MaisCorridaAtiva from "@/components/MaisCorridaAtiva";
import { Text } from "@/components/common/Texto";
import { ResumoEspera, calcularContadorEspera } from "@/domain/contadorEspera";
import { reputacaoPassageiro } from "@/domain/reputacaoPassageiro";
import type { ResultadoCancelamento } from "@/hooks/useDespachoMotorista";
import { Feather, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AcaoCorrida =
  | "cheguei"
  | "iniciar"
  | "confirmar-parada"
  | "finalizar";

export interface PassageiroDaCorrida {
  nome: string;
  solicitante?: string | null;
  foto?: string | null;
  foto_oculta?: boolean;
  telefone?: string | null;
  nota?: number | null;
  corridas?: number;
}

interface props {
  origem?: string | null;
  destino?: string | null;
  categoria?: string | null;
  passageiro?: PassageiroDaCorrida | null;
  ocupado?: boolean;
  espera?: ResumoEspera | null;
  recusarNovas?: boolean;
  onAvancar: (acao: AcaoCorrida) => void;
  onCancelar: (motivo: string) => Promise<ResultadoCancelamento>;
  onCancelarNaoComparecimento: () => Promise<ResultadoCancelamento>;
  onAlternarRecusarNovas?: () => void;
  // conversa com o passageiro (ChatDaCorrida, aberto pela home)
  chatNaoLidas?: number;
  onAbrirChat?: () => void;
}

// o backend só aceita encerrar por ausência depois de 3 min no embarque
// (DespachoCorridaService::cancelar, tipo nao_comparecimento)
const ESPERA_MINIMA_AUSENCIA_S = 180;

const CORES_FASE = {
  tolerancia: "#3D7BFF",
  cobrando: "#F97316",
  limite: "#DC2626",
} as const;

// espaço inquebrável: "R$" não fica sozinho no fim da linha
const formatarValor = (valor: number) =>
  `R$\u00A0${valor.toFixed(2).replace(".", ",")}`;

const formatarMinutos = (segundos: number) => {
  const minutos = Math.round(segundos / 60);
  return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
};

export default function CorridaEmAndamento({
  origem,
  destino,
  categoria,
  passageiro,
  ocupado = false,
  espera,
  recusarNovas = false,
  onAvancar,
  onCancelar,
  onCancelarNaoComparecimento,
  onAlternarRecusarNovas,
  chatNaoLidas = 0,
  onAbrirChat,
}: props) {
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const [maisVisivel, setMaisVisivel] = useState(false);
  const [taxaVisivel, setTaxaVisivel] = useState(false);

  const [relogio, setRelogio] = useState({
    calculadoEm: espera?.calculado_em,
    segundos: 0,
  });

  useEffect(() => {
    if (!espera) return;

    const inicio = performance.now();
    const segundosAteLimite = Math.max(
      espera.tolerancia_segundos +
        espera.limite_cobranca_segundos -
        espera.segundos_decorridos,
      0,
    );

    if (segundosAteLimite === 0) return;

    const intervalo = setInterval(() => {
      const segundos = Math.min(
        (performance.now() - inicio) / 1000,
        segundosAteLimite,
      );
      setRelogio({ calculadoEm: espera.calculado_em, segundos });

      if (segundos >= segundosAteLimite) clearInterval(intervalo);
    }, 1000);

    return () => clearInterval(intervalo);
    // observa só os campos escalares: `espera` troca de referência a cada
    // poll e reiniciar o relógio nesse intervalo faria o contador "pular"
    // visivelmente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    espera?.calculado_em,
    espera?.limite_cobranca_segundos,
    espera?.segundos_decorridos,
    espera?.tolerancia_segundos,
  ]);

  const segundosDesdeResumo =
    espera && relogio.calculadoEm === espera.calculado_em
      ? relogio.segundos
      : 0;
  const contador = espera
    ? calcularContadorEspera(espera, segundosDesdeResumo, "motorista")
    : null;
  const cor = contador ? CORES_FASE[contador.fase] : CORES_FASE.tolerancia;
  const podeRegistrarAusencia =
    (contador?.segundosDecorridos ?? 0) >= ESPERA_MINIMA_AUSENCIA_S;

  const faixa = !contador
    ? null
    : contador.fase === "tolerancia"
      ? {
          icone: "notifications" as const,
          cor: "#FF7A35",
          texto:
            "Passaremos a cobrar uma taxa de espera do passageiro ao final da contagem regressiva",
        }
      : contador.fase === "cobrando"
        ? {
            icone: "cash-outline" as const,
            cor: "#FF7A35",
            texto: `Cobrando taxa de espera do passageiro: ${formatarValor(contador.valor)} para você`,
          }
        : {
            icone: "alert-circle" as const,
            cor: "#DC2626",
            texto: `Tempo máximo de espera atingido. Taxa de espera: ${formatarValor(contador.valor)}`,
          };

  const apoio =
    contador?.fase === "cobrando"
      ? "Passageiro ainda não embarcou"
      : contador?.fase === "limite"
        ? "Você pode cancelar por ausência no ≡"
        : "Se precisar, contate o passageiro";

  const ligar = () => {
    if (!passageiro?.telefone) return;

    Linking.openURL(`tel:${passageiro.telefone.replace(/\D/g, "")}`);
  };

  const reputacao = reputacaoPassageiro(passageiro?.nota, passageiro?.corridas);

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.pilulaEmbarque, { top: insets.top + 10 }]}>
        <View style={styles.pontoEmbarque} />
        <Text numberOfLines={1} style={styles.pilulaTexto}>
          {origem ?? "Local de embarque não informado"}
        </Text>
      </View>

      <View style={[styles.base, { maxHeight: alturaTela - insets.top - 80 }]}>
        {faixa && (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${faixa.texto}. Ver como funciona a taxa de espera`}
            style={[styles.faixa, { backgroundColor: faixa.cor }]}
            onPress={() => setTaxaVisivel(true)}
          >
            <Ionicons name={faixa.icone} size={22} color="#FFF" />
            <Text style={styles.faixaTexto}>{faixa.texto}</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.folha,
            faixa && styles.folhaSobreFaixa,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <ScrollView bounces={false} contentContainerStyle={styles.conteudo}>
            <View style={styles.linhaTopo}>
              <AnelProgresso
                tamanho={54}
                espessura={3}
                progresso={contador?.progresso ?? 0}
                cor={cor}
              >
                <Text style={[styles.anelTexto, { color: cor }]}>
                  {contador?.tempo ?? "--"}
                </Text>
              </AnelProgresso>

              <View style={styles.tituloBloco}>
                <Text style={styles.titulo}>Por favor, aguarde</Text>
                <Text style={styles.apoio}>{apoio}</Text>
              </View>

              <TouchableOpacity
                style={styles.botaoMais}
                accessibilityRole="button"
                accessibilityLabel="Mais opções da corrida"
                onPress={() => setMaisVisivel(true)}
              >
                <Ionicons name="menu" size={24} color="#222" />
              </TouchableOpacity>
            </View>

            <View style={styles.separador} />

            <View style={styles.linhaPassageiro}>
              {passageiro?.foto && !passageiro.foto_oculta ? (
                <Image
                  source={{ uri: passageiro.foto }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarVazio]}>
                  <Feather name="user" size={22} color="#8B94A1" />
                </View>
              )}

              <TouchableOpacity
                style={styles.passageiroBloco}
                accessibilityRole="button"
                accessibilityLabel={`Detalhes da corrida de ${passageiro?.nome ?? "passageiro"}`}
                onPress={() => setMaisVisivel(true)}
              >
                <View style={styles.nomeLinha}>
                  <Text numberOfLines={1} style={styles.passageiroNome}>
                    {passageiro?.nome ?? "Passageiro"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </View>
                <Text style={styles.passageiroApoio}>{reputacao}</Text>
                {passageiro?.solicitante ? (
                  <Text numberOfLines={1} style={styles.passageiroApoio}>
                    Pedido por {passageiro.solicitante}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {onAbrirChat ? (
                <BotaoChatPassageiro
                  naoLidas={chatNaoLidas}
                  onPress={onAbrirChat}
                  estilo={styles.botaoLigar}
                />
              ) : null}
              {passageiro?.telefone ? (
                <TouchableOpacity
                  style={styles.botaoLigar}
                  onPress={ligar}
                  accessibilityRole="button"
                  accessibilityLabel="Ligar para o passageiro"
                >
                  <Ionicons name="call" size={20} color="#111" />
                </TouchableOpacity>
              ) : null}
            </View>

            <BotaoDeslizar
              rotulo="Iniciar corrida"
              cor="#4A7DF7"
              desabilitado={ocupado}
              onConfirmar={() => onAvancar("iniciar")}
            />
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={taxaVisivel}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTaxaVisivel(false)}
      >
        <Pressable
          style={styles.taxaFundo}
          onPress={() => setTaxaVisivel(false)}
        />
        <View
          style={[
            styles.taxaFolha,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <Text style={styles.taxaTitulo}>Taxa de espera</Text>
          {espera ? (
            <>
              <Text style={styles.taxaItem}>
                Os primeiros {formatarMinutos(espera.tolerancia_segundos)} de
                espera no embarque são gratuitos para o passageiro.
              </Text>
              <Text style={styles.taxaItem}>
                Depois disso, a espera é cobrada dele e você recebe{" "}
                {formatarValor(espera.valor_por_minuto)} por minuto, por até{" "}
                {formatarMinutos(espera.limite_cobranca_segundos)}. O valor
                entra no fim da corrida.
              </Text>
            </>
          ) : null}
          <Text style={styles.taxaItem}>
            Se o passageiro não aparecer, depois de 3 minutos no embarque você
            pode encerrar a corrida por ausência em ≡ › Cancelar Corrida ›
            “Passageiro não apareceu”. Nas categorias com tarifa base, ela fica
            para você como taxa de ausência.
          </Text>
          <TouchableOpacity
            style={styles.taxaBotao}
            accessibilityRole="button"
            onPress={() => setTaxaVisivel(false)}
          >
            <Text style={styles.taxaBotaoTexto}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <MaisCorridaAtiva
        visible={maisVisivel}
        passageiro={passageiro}
        origem={origem}
        destino={destino}
        categoria={categoria}
        ocupado={ocupado}
        recusarNovas={recusarNovas}
        onAlternarRecusarNovas={onAlternarRecusarNovas}
        podeRegistrarAusencia={podeRegistrarAusencia}
        onRegistrarAusencia={onCancelarNaoComparecimento}
        onClose={() => setMaisVisivel(false)}
        onCancelar={onCancelar}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pilulaEmbarque: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#1C1C1E",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  pontoEmbarque: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#18C9A0",
  },
  pilulaTexto: { flex: 1, color: "#FFF", fontSize: 16, fontWeight: "500" },

  base: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  faixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    // a folha branca sobe por cima da parte de baixo da faixa
    paddingBottom: 12 + 16,
  },
  faixaTexto: {
    flex: 1,
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  folha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  folhaSobreFaixa: { marginTop: -16 },
  conteudo: { gap: 14, paddingHorizontal: 16 },

  linhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  anelTexto: { fontSize: 15, fontWeight: "700" },
  tituloBloco: { flex: 1, alignItems: "center" },
  titulo: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  apoio: { fontSize: 14, color: "#666", marginTop: 2, textAlign: "center" },
  botaoMais: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E4E8",
    marginHorizontal: -16,
  },

  linhaPassageiro: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarVazio: {
    backgroundColor: "#E6EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  passageiroBloco: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    justifyContent: "center",
  },
  nomeLinha: { flexDirection: "row", alignItems: "center", gap: 2 },
  passageiroNome: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  passageiroApoio: { fontSize: 14, color: "#777", marginTop: 2 },
  botaoLigar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  taxaFundo: { flex: 1, backgroundColor: "rgba(16,24,32,0.55)" },
  taxaFolha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 12,
  },
  taxaTitulo: { fontSize: 20, fontWeight: "700", color: "#111" },
  taxaItem: { fontSize: 14, lineHeight: 20, color: "#374151" },
  taxaBotao: {
    minHeight: 52,
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
  },
  taxaBotaoTexto: { fontSize: 16, fontWeight: "700", color: "#111" },
});
