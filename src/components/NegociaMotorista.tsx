import AnelProgresso from "@/components/AnelProgresso";
import type { PassageiroDaCorrida } from "@/components/CorridaEmAndamento";
import { Text } from "@/components/common/Texto";
import { enderecoCurto } from "@/domain/endereco";
import { reputacaoPassageiro } from "@/domain/reputacaoPassageiro";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// prazo padrão do backend (precificacao.negocia_pagamento_limite_segundos)
const PRAZO_PAGAMENTO_PADRAO_S = 300;

const minutosESegundos = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

const emReais = (valor: number | string | null | undefined) => {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? `R$ ${numero.toFixed(2).replace(".", ",")}`
    : "";
};

function useSegundosAte(instante: string | null) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  if (!instante) return null;
  return Math.max(0, Math.round((new Date(instante).getTime() - agora) / 1000));
}

export interface PropostaNaPilha {
  corrida_id: number;
  origem: string;
  minha_proposta?: {
    valor_motorista: number | null;
    expira_em: string | null;
  } | null;
}

const MAXIMO_NA_PILHA = 3;
// quanto cada card fica escondido atrás do da frente
const SOBREPOSICAO = 12;

function CartaoDaPilha({
  proposta,
  largura,
  elevacao,
  sobrepostoPelaFrente,
  extras,
}: {
  proposta: PropostaNaPilha;
  largura: `${number}%`;
  elevacao: number;
  sobrepostoPelaFrente: boolean;
  extras: number;
}) {
  const segundos = useSegundosAte(proposta.minha_proposta?.expira_em ?? null);
  const valor = emReais(proposta.minha_proposta?.valor_motorista);

  return (
    <View
      style={[
        styles.cartaoPilha,
        {
          width: largura,
          elevation: elevacao,
          zIndex: elevacao,
          paddingBottom: sobrepostoPelaFrente ? 10 + SOBREPOSICAO : 10,
          marginBottom: sobrepostoPelaFrente ? -SOBREPOSICAO : 0,
        },
      ]}
      accessible
      accessibilityLabel={`Proposta de ${valor} esperando o passageiro${segundos !== null ? `, ${segundos} segundos` : ""}. ${enderecoCurto(proposta.origem)}`}
    >
      <ActivityIndicator size="small" color="#3D2A00" />
      <View style={styles.textos}>
        <Text style={styles.tituloPilha} numberOfLines={1}>
          {`Proposta enviada: ${valor}`}
          {segundos !== null ? ` · ${segundos}s` : ""}
        </Text>
        <Text style={styles.apoioPilha} numberOfLines={1}>
          {`Aguardando o passageiro · ${enderecoCurto(proposta.origem)}`}
        </Text>
      </View>
      {extras > 0 ? (
        <View style={styles.extras}>
          <Text style={styles.extrasTexto}>+{extras}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Negocia com "empilhar" ligado: as propostas esperando o passageiro ficam
// empilhadas, a que vence primeiro na frente. Atrás da chamada da vez, a
// chamada é o card da frente e cobre a borda de baixo da pilha.
export function PilhaPropostasNegocia({
  propostas,
  atrasDaChamada = false,
  distanciaDoRodape = 0,
  onAlturaChange,
}: {
  propostas: PropostaNaPilha[];
  atrasDaChamada?: boolean;
  distanciaDoRodape?: number;
  // solta no mapa, a home sobe os botões do mapa acima da pilha
  onAlturaChange?: (altura: number) => void;
}) {
  if (propostas.length === 0) return null;

  const visiveis = propostas.slice(0, MAXIMO_NA_PILHA);
  const escondidas = propostas.length - visiveis.length;
  // a da frente (vence primeiro) é a última desenhada, embaixo
  const deTrasParaFrente = [...visiveis].reverse();

  return (
    <View
      style={
        atrasDaChamada
          ? [styles.pilha, styles.pilhaAtrasDaChamada]
          : [styles.pilha, { bottom: distanciaDoRodape + 12 }]
      }
      accessibilityLiveRegion="polite"
      onLayout={(evento) => onAlturaChange?.(evento.nativeEvent.layout.height)}
    >
      {deTrasParaFrente.map((proposta, indice) => {
        const distanciaDaFrente = deTrasParaFrente.length - 1 - indice;
        const naFrente = distanciaDaFrente === 0;
        const largura = atrasDaChamada
          ? (`${88 - distanciaDaFrente * 6}%` as const)
          : (`${100 - distanciaDaFrente * 6}%` as const);

        return (
          <CartaoDaPilha
            key={proposta.corrida_id}
            proposta={proposta}
            largura={largura}
            elevacao={2 + indice}
            sobrepostoPelaFrente={!naFrente || atrasDaChamada}
            extras={indice === 0 ? escondidas : 0}
          />
        );
      })}
    </View>
  );
}

// Negocia no Pix/cartão: o passageiro escolheu este motorista e está pagando.
// Mesmo layout da espera no embarque (99): endereço numa pílula escura no
// topo, faixa laranja, contagem em anel, passageiro e quanto o motorista
// recebe. Não há o que tocar além de ligar: o motorista não cancela aqui.
export function AguardandoPagamentoNegocia({
  valorMotorista,
  metodoPagamento,
  origem,
  passageiro,
  aceitaEm,
  pagamentoExpiraEm,
}: {
  valorMotorista: number | string | null | undefined;
  metodoPagamento: string | null | undefined;
  origem?: string | null;
  passageiro?: PassageiroDaCorrida | null;
  aceitaEm?: string | null;
  pagamentoExpiraEm?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const meio = metodoPagamento === "cartao" ? "no cartão" : "no Pix";
  const restantes = useSegundosAte(pagamentoExpiraEm ?? null);
  const prazo =
    aceitaEm && pagamentoExpiraEm
      ? Math.max(
          1,
          (new Date(pagamentoExpiraEm).getTime() -
            new Date(aceitaEm).getTime()) /
            1000,
        )
      : PRAZO_PAGAMENTO_PADRAO_S;
  const acabou = restantes === 0;

  const ligar = () => {
    if (!passageiro?.telefone) return;
    Linking.openURL(`tel:${passageiro.telefone.replace(/\D/g, "")}`);
  };

  return (
    <>
      <View style={[styles.pilulaEmbarque, { top: insets.top + 10 }]}>
        <View style={styles.pontoEmbarque} />
        <Text numberOfLines={1} style={styles.pilulaTexto}>
          {origem ?? "Local de embarque não informado"}
        </Text>
      </View>

      <View style={styles.base} accessibilityLiveRegion="polite">
        <View style={styles.faixa}>
          <Ionicons name="card" size={22} color="#FFF" />
          <Text style={styles.faixaTexto}>
            O passageiro escolheu sua proposta. Vá até o embarque quando o
            pagamento for confirmado.
          </Text>
        </View>

        <View
          style={[
            styles.folhaEspera,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.linhaTopo}>
            <AnelProgresso
              tamanho={54}
              espessura={3}
              progresso={restantes === null ? 1 : restantes / prazo}
              cor={acabou ? "#DC2626" : "#3D7BFF"}
            >
              {restantes === null ? (
                <ActivityIndicator color="#3D7BFF" />
              ) : (
                <Text style={[styles.anelTexto, acabou && styles.anelTextoFim]}>
                  {minutosESegundos(restantes)}
                </Text>
              )}
            </AnelProgresso>

            <View style={styles.tituloBloco}>
              <Text style={styles.tituloEspera}>Por favor, aguarde</Text>
              <Text style={styles.apoioEspera}>
                {acabou
                  ? "O pagamento não chegou a tempo"
                  : `Esperando o pagamento ${meio}`}
              </Text>
            </View>

            <View style={styles.espacoDoMenu} />
          </View>

          <View style={styles.separador} />

          <View style={styles.linhaPassageiro}>
            {passageiro?.foto && !passageiro.foto_oculta ? (
              <Image source={{ uri: passageiro.foto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarVazio]}>
                <Feather name="user" size={22} color="#8B94A1" />
              </View>
            )}

            <View style={styles.passageiroBloco}>
              <Text numberOfLines={1} style={styles.passageiroNome}>
                {passageiro?.nome ?? "Passageiro"}
              </Text>
              <Text style={styles.passageiroApoio}>
                {reputacaoPassageiro(passageiro?.nota, passageiro?.corridas)}
              </Text>
            </View>

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

          <View style={styles.valorLinha}>
            <Text style={styles.valorRotulo}>Você recebe</Text>
            <Text style={styles.valor}>{emReais(valorMotorista)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  textos: { flex: 1 },
  pilha: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  pilhaAtrasDaChamada: {
    position: "relative",
    left: 0,
    right: 0,
    width: "100%",
  },
  cartaoPilha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#FFF6DB",
    borderWidth: 1,
    borderColor: "#F2DFA7",
    paddingHorizontal: 14,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tituloPilha: { fontSize: 14, fontWeight: "800", color: "#3D2A00" },
  apoioPilha: { fontSize: 12, color: "#7A5A12", marginTop: 1 },
  extras: {
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3D2A00",
  },
  extrasTexto: { color: "#FFF6DB", fontSize: 12, fontWeight: "800" },
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
    backgroundColor: "#FF7A35",
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
  folhaEspera: {
    marginTop: -16,
    gap: 14,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 16,
    elevation: 12,
  },
  linhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  anelTexto: { fontSize: 15, fontWeight: "700", color: "#3D7BFF" },
  anelTextoFim: { color: "#DC2626" },
  tituloBloco: { flex: 1, alignItems: "center" },
  tituloEspera: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  apoioEspera: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  espacoDoMenu: { width: 44 },
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
  passageiroBloco: { flex: 1, minWidth: 0 },
  passageiroNome: { fontSize: 18, fontWeight: "600", color: "#111" },
  passageiroApoio: { fontSize: 14, color: "#777", marginTop: 2 },
  botaoLigar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  valorLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  valorRotulo: { fontSize: 15, color: "#4B5563" },
  valor: { fontSize: 22, fontWeight: "800", color: "#111" },
});
