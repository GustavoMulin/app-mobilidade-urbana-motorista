import {
  extrasDaCorrida,
  useEstilos,
  useTema,
  type CoresDoTema,
} from "@/theme/tema";
import SelosEmGrade from "@/components/avaliacao/SelosEmGrade";
import { Text } from "@/components/common/Texto";
import {
  alternarSelo,
  podeEscolherSelos,
  type SeloDeAvaliacao,
} from "@/domain/avaliacao";
import { CorridaParaAvaliar } from "@/hooks/useAvaliacaoPendente";
import { useSelosAvaliacao } from "@/hooks/useSelosAvaliacao";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  corrida: CorridaParaAvaliar;
  enviando: boolean;
  // o motorista avalia com nota e selos; só o passageiro escreve comentário
  onAvaliar: (nota: number, elogios: string[]) => void;
  // bloqueia o passageiro; devolve se deu certo
  onBloquear: () => Promise<boolean>;
  onDispensar: () => void;
  // selos prontos (simulador e testes); sem isto a lista vem do servidor
  selosProntos?: SeloDeAvaliacao[];
}

const ESTRELAS = [1, 2, 3, 4, 5];
const TEMPO_MAXIMO_ABERTA_MS = 20_000;
const ALTURA_DA_LINHA_DO_CABECALHO = 44;

export default function AvaliarPassageiro({
  corrida,
  enviando,
  onAvaliar,
  onBloquear,
  onDispensar,
  selosProntos,
}: Props) {
  const { cores } = useTema();
  const tema = useEstilos(estilosBase, extrasDaTela);
  const styles = { ...tema, textoBotao: estilosBase.textoBotao };
  const insets = useSafeAreaInsets();
  // rolando o conteúdo, o fundo do cabeçalho vai aparecendo
  const [rolagem] = useState(() => new Animated.Value(0));
  const topoDoCabecalho = Math.max(insets.top + 12, 50);
  const fundoDoCabecalho = rolagem.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const selosDoServidor = useSelosAvaliacao(!selosProntos);
  const selos = selosProntos ?? selosDoServidor;

  const [nota, setNota] = useState(0);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [bloqueando, setBloqueando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  // sem nenhuma interação (toque, rolagem, digitação) por 20 segundos, a avaliação
  // se fecha sozinha, como em "Agora não"; ela segue pendente para depois.
  // Qualquer atividade reinicia a contagem, e enviar nunca é interrompido.
  const fecharAoExpirar = useRef(onDispensar);
  const emEnvio = useRef(enviando);
  useEffect(() => {
    fecharAoExpirar.current = onDispensar;
    emEnvio.current = enviando;
  });
  const timerDeInatividade = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reiniciarInatividade = useCallback(() => {
    const armar = () => {
      timerDeInatividade.current = setTimeout(() => {
        if (emEnvio.current) armar();
        else fecharAoExpirar.current();
      }, TEMPO_MAXIMO_ABERTA_MS);
    };

    if (timerDeInatividade.current) clearTimeout(timerDeInatividade.current);
    armar();
  }, []);
  useEffect(() => {
    reiniciarInatividade();
    return () => {
      if (timerDeInatividade.current) clearTimeout(timerDeInatividade.current);
    };
  }, [corrida.id, reiniciarInatividade]);

  const bloquear = async () => {
    setBloqueando(true);
    const ok = await onBloquear();
    setBloqueando(false);
    if (ok) setBloqueado(true);
  };

  // bloquear pede confirmação (mesma caixa do resto do app)
  const confirmarBloqueio = () =>
    Alert.alert(
      "Bloquear usuário?",
      `Você não receberá mais chamadas de ${passageiro ?? "este passageiro"}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: () => void bloquear(),
        },
      ],
    );

  const passageiro = corrida.convidado_nome || corrida.passageiro?.name;

  // com 4 ou 5 estrelas os selos ficam liberados; a avaliação já pode ser enviada
  // assim que há uma nota, com ou sem selo
  const selosLiberados = podeEscolherSelos(nota);

  return (
    <Modal
      visible
      transparent={false}
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onDispensar}
    >
      <View style={styles.fundo} onTouchStart={reiniciarInatividade}>
        <View style={styles.painel}>
          {/* cabeçalho fixo: transparente no topo, branco conforme o conteúdo sobe */}
          <View
            style={[styles.cabecalho, { paddingTop: topoDoCabecalho }]}
            pointerEvents="box-none"
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.cabecalhoFundo, { opacity: fundoDoCabecalho }]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar avaliação"
              style={styles.botaoVoltar}
              disabled={enviando}
              onPress={onDispensar}
            >
              <Ionicons name="chevron-back" size={28} color={cores.icone} />
            </TouchableOpacity>
            <Text style={styles.tituloDoCabecalho}>Como foi a viagem?</Text>
            <View style={styles.botaoVoltar} />
          </View>

          <Animated.ScrollView
            style={styles.corpo}
            contentContainerStyle={[
              styles.corpoConteudo,
              {
                paddingTop: topoDoCabecalho + ALTURA_DA_LINHA_DO_CABECALHO + 8,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: rolagem } } }],
              { useNativeDriver: true },
            )}
          >
            <Text style={styles.nomePassageiro} numberOfLines={1}>
              {passageiro ?? "Passageiro"}
            </Text>

            <View style={styles.estrelas}>
              {ESTRELAS.map((valorEstrela) => (
                <TouchableOpacity
                  key={valorEstrela}
                  accessibilityRole="button"
                  accessibilityLabel={`${valorEstrela} ${valorEstrela === 1 ? "estrela" : "estrelas"}`}
                  onPress={() => setNota(valorEstrela)}
                  disabled={enviando}
                  hitSlop={6}
                  style={styles.estrela}
                >
                  <Ionicons
                    name={valorEstrela <= nota ? "star" : "star-outline"}
                    size={52}
                    color={valorEstrela <= nota ? "#fbc02d" : "#C9CDD2"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* selos: liberados com 4 ou 5 estrelas; o motorista não dá
                gorjeta nem escreve comentário */}
            {selos.length > 0 && (
              <View style={styles.selos}>
                <Text style={styles.selosTitulo}>Deixe um selo</Text>
                <Text style={styles.selosApoio}>
                  {selosLiberados
                    ? "Opcional: toque nos selos que combinam com o passageiro"
                    : "Disponível com 4 ou 5 estrelas"}
                </Text>
                <View style={!selosLiberados && styles.selosBloqueados}>
                  <SelosEmGrade
                    selos={selos}
                    escolhidos={selosLiberados ? escolhidos : []}
                    onAlternar={(chave) =>
                      setEscolhidos((atuais) => alternarSelo(atuais, chave))
                    }
                    desabilitado={enviando || !selosLiberados}
                  />
                </View>
              </View>
            )}
          </Animated.ScrollView>

          {/* rodapé fixo: enviar fica à mão assim que há nota */}
          <View
            style={[
              styles.rodape,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            {nota === 1 && bloqueado && (
              <View style={styles.bloqueado}>
                <Ionicons name="ban" size={16} color="#B3261E" />
                <Text style={styles.bloqueadoTexto}>
                  Passageiro bloqueado: você não receberá mais chamadas dele
                </Text>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.botao, nota === 0 && styles.botaoDesativado]}
              disabled={nota === 0 || enviando}
              onPress={() => onAvaliar(nota, selosLiberados ? escolhidos : [])}
            >
              <Text
                style={[
                  styles.textoBotao,
                  nota === 0 && styles.textoBotaoDesativado,
                ]}
              >
                {enviando ? "Enviando..." : "Enviar avaliação"}
              </Text>
            </TouchableOpacity>

            <View style={styles.acoes}>
              {nota === 1 && !bloqueado && (
                <TouchableOpacity
                  style={styles.acao}
                  disabled={enviando || bloqueando}
                  onPress={confirmarBloqueio}
                >
                  <Ionicons name="ban-outline" size={18} color="#B3261E" />
                  <Text style={styles.textoBloquear}>Bloquear usuário</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.acao}
                disabled={enviando}
                onPress={onDispensar}
              >
                <Text style={styles.textoPular}>Agora não</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const extrasDaTela = (cores: CoresDoTema) => extrasDaCorrida(cores);

const estilosBase = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "#FFF" },
  painel: { flex: 1, backgroundColor: "#FFF" },
  cabecalho: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  cabecalhoFundo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  botaoVoltar: { width: 36, height: 36, justifyContent: "center" },
  tituloDoCabecalho: { fontSize: 18.9, fontWeight: "800", color: "#111" },
  corpo: { flex: 1 },
  corpoConteudo: { paddingHorizontal: 24, paddingBottom: 24 },
  nomePassageiro: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginTop: 10,
  },
  estrelas: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  estrela: { paddingHorizontal: 4 },
  selos: { marginTop: 28 },
  selosTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  selosApoio: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  selosBloqueados: { opacity: 0.35 },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },
  botao: {
    backgroundColor: "#fbc02d",
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
  },
  botaoDesativado: { backgroundColor: "#EEE" },
  textoBotao: { fontSize: 22, fontWeight: "800", color: "#111" },
  textoBotaoDesativado: { color: "#9AA0A6" },
  acoes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginTop: 6,
  },
  acao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  textoBloquear: { fontSize: 16, color: "#B3261E", fontWeight: "600" },
  textoPular: { fontSize: 16, color: "#888" },
  bloqueado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FDECEA",
  },
  bloqueadoTexto: { flex: 1, fontSize: 14, color: "#B3261E" },
});
