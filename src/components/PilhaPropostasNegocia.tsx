import { Text } from "@/components/common/Texto";
import { enderecoCurto } from "@/domain/endereco";
import { emDistancia } from "@/domain/negocia";
import type { OfertaCorrida } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// validade da proposta no backend (precificacao.negocia_proposta_validade_segundos)
const VALIDADE_PADRAO_MS = 20_000;
const DURACAO_ENTRADA_MS = 280;
const DURACAO_SAIDA_MS = 240;
// a pilha começa logo abaixo do menu e do saldo do topo
const DISTANCIA_DO_TOPO = 68;

interface Item {
  oferta: OfertaCorrida;
  saindo: boolean;
}

const emReais = (valor: number | string | null | undefined) => {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? `R$ ${numero.toFixed(2).replace(".", ",")}`
    : "";
};

// quem já está na tela não muda de lugar (quem sumiu sai com fade ali mesmo)
// e as propostas novas entram embaixo, na ordem em que foram mandadas
const mesclar = (atuais: Item[], propostas: OfertaCorrida[]): Item[] => {
  const porCorrida = new Map(propostas.map((p) => [p.corrida_id, p]));
  const naTela = new Set(atuais.map((item) => item.oferta.corrida_id));

  return [
    ...atuais.map((item) => {
      const oferta = porCorrida.get(item.oferta.corrida_id);
      return oferta ? { oferta, saindo: false } : { ...item, saindo: true };
    }),
    ...propostas
      .filter((oferta) => !naTela.has(oferta.corrida_id))
      .map((oferta) => ({ oferta, saindo: false })),
  ];
};

function CartaoAguardando({
  item,
  compacto,
  onSaiu,
}: {
  item: Item;
  // com a chamada da vez na tela, só o essencial para caber mais de um
  compacto: boolean;
  onSaiu: (corridaId: number) => void;
}) {
  const { oferta, saindo } = item;
  const expiraEm = oferta.minha_proposta?.expira_em ?? null;
  const validadeMs =
    (oferta.minha_proposta?.validade_segundos ?? 0) * 1000 ||
    VALIDADE_PADRAO_MS;
  const [opacidade] = useState(() => new Animated.Value(0));
  const [deslocamento] = useState(() => new Animated.Value(-10));
  const [progresso] = useState(() => new Animated.Value(0));
  const [largura, setLargura] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    const animacao = Animated.parallel([
      Animated.timing(opacidade, {
        toValue: saindo ? 0 : 1,
        duration: saindo ? DURACAO_SAIDA_MS : DURACAO_ENTRADA_MS,
        easing: saindo ? Easing.in(Easing.quad) : Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(deslocamento, {
        toValue: saindo ? -6 : 0,
        duration: saindo ? DURACAO_SAIDA_MS : DURACAO_ENTRADA_MS,
        easing: saindo ? Easing.in(Easing.quad) : Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animacao.start(({ finished }) => {
      if (finished && saindo) onSaiu(oferta.corrida_id);
    });

    return () => animacao.stop();
  }, [saindo, oferta.corrida_id, opacidade, deslocamento, onSaiu]);

  // a faixa amarela esvazia até o fim do prazo, como o Aceitar do passageiro
  useEffect(() => {
    if (saindo || largura === 0 || expiraEm === null) return;

    const restante = Math.max(0, new Date(expiraEm).getTime() - Date.now());
    progresso.setValue(Math.min(1, Math.max(0, 1 - restante / validadeMs)));
    const contagem = Animated.timing(progresso, {
      toValue: 1,
      duration: restante,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    contagem.start();

    return () => contagem.stop();
  }, [saindo, largura, expiraEm, validadeMs, progresso]);

  const segundos =
    expiraEm === null
      ? null
      : Math.max(0, Math.round((new Date(expiraEm).getTime() - agora) / 1000));
  const valor = emReais(
    oferta.minha_proposta?.valor_motorista ?? oferta.valor_motorista,
  );
  const reputacao =
    typeof oferta.passageiro_nota === "number"
      ? `★${oferta.passageiro_nota.toFixed(1).replace(".", ",")} · `
      : "";
  const corridas =
    oferta.passageiro_corridas === 0
      ? "Passageiro novo"
      : `${oferta.passageiro_corridas} ${oferta.passageiro_corridas === 1 ? "corrida" : "corridas"}`;

  return (
    <Animated.View
      style={[
        styles.cartao,
        { opacity: opacidade, transform: [{ translateY: deslocamento }] },
      ]}
      accessible
      accessibilityLabel={`Proposta de ${valor} esperando o passageiro${segundos !== null ? `, ${segundos} segundos` : ""}. Embarque em ${enderecoCurto(oferta.origem)}`}
    >
      <View style={styles.topo}>
        <Text style={styles.categoria} numberOfLines={1}>
          {oferta.categoria ?? "Negocia"}
        </Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>

      {!compacto && (
        <View style={styles.passageiroLinha}>
          <View style={styles.foto}>
            <Ionicons name="person" size={20} color="#9AA1AB" />
          </View>
          <View style={styles.dados}>
            <Text style={styles.reputacao} numberOfLines={1}>
              {reputacao}
              {corridas}
            </Text>
            <Text style={styles.endereco} numberOfLines={1}>
              {enderecoCurto(oferta.origem)}
            </Text>
          </View>
          <View style={styles.distancias}>
            <Text style={styles.distancia}>
              {emDistancia(oferta.distancia_ate_origem_km)}
            </Text>
            <Text style={styles.viagem}>
              {emDistancia(oferta.distancia_corrida_km)} de viagem
            </Text>
          </View>
        </View>
      )}

      <View
        style={styles.aguardando}
        onLayout={({ nativeEvent }) => setLargura(nativeEvent.layout.width)}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.preenchimento,
            {
              transform: [
                {
                  translateX: progresso.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -largura],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.aguardandoTexto}>
          Aguardando o passageiro
          {segundos !== null ? ` · ${segundos}s` : ""}
        </Text>
      </View>
    </Animated.View>
  );
}

// Negocia: propostas mandadas esperando o passageiro escolher, empilhadas no
// topo como os cartões do passageiro (a mais antiga em cima)
export default function PilhaPropostasNegocia({
  propostas,
  chamadaNaTela,
}: {
  propostas: OfertaCorrida[];
  // com a chamada da vez embaixo, a pilha para antes dela
  chamadaNaTela: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const [anteriores, setAnteriores] = useState(propostas);
  const [itens, setItens] = useState<Item[]>(() => mesclar([], propostas));

  if (anteriores !== propostas) {
    setAnteriores(propostas);
    setItens(mesclar(itens, propostas));
  }

  const [remover] = useState(
    () => (corridaId: number) =>
      setItens((atuais) =>
        atuais.filter((item) => item.oferta.corrida_id !== corridaId),
      ),
  );

  if (itens.length === 0) return null;

  const topo = insets.top + DISTANCIA_DO_TOPO;
  const alturaMaxima = alturaTela * (chamadaNaTela ? 0.4 : 0.62) - topo;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: topo }]}
      accessibilityLiveRegion="polite"
    >
      <ScrollView
        style={{ maxHeight: Math.max(160, alturaMaxima) }}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      >
        {itens.map((item) => (
          <CartaoAguardando
            key={item.oferta.corrida_id}
            item={item}
            compacto={chamadaNaTela}
            onSaiu={remover}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 8,
    elevation: 8,
  },
  lista: { gap: 10, paddingBottom: 4 },
  cartao: {
    borderRadius: 20,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoria: {
    flexShrink: 1,
    color: "#5F6368",
    fontSize: 15,
    fontWeight: "600",
  },
  valor: { fontSize: 25, fontWeight: "900", color: "#111" },
  passageiroLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  foto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECEEF1",
    alignItems: "center",
    justifyContent: "center",
  },
  dados: { flex: 1, minWidth: 0, gap: 1 },
  reputacao: { fontSize: 14, color: "#3C4043" },
  endereco: { fontSize: 14, color: "#3C4043" },
  distancias: {
    alignItems: "flex-end",
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  distancia: { color: "#111", fontSize: 14, fontWeight: "800" },
  viagem: { color: "#5F6368", fontSize: 12 },
  aguardando: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#FFE57A",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  preenchimento: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFD000",
  },
  aguardandoTexto: { fontSize: 15, fontWeight: "800", color: "#111" },
});
