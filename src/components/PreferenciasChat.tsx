import { Text, TextInput } from "@/components/common/Texto";
import {
  ETAPAS_DAS_MENSAGENS,
  LIMITE_MENSAGENS_POR_ETAPA,
  TAMANHO_MAXIMO_MENSAGEM_RAPIDA,
  type EtapaDaMensagem,
} from "@/domain/mensagensRapidas";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { useMensagensRapidas } from "@/hooks/useMensagensRapidas";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

interface Props {
  visible: boolean;
  onClose: () => void;
  // abre na etapa em que o motorista está; sem frases na etapa, na primeira
  etapaInicial?: string | null;
}

const ALTURA_LINHA = 64;
const ESPACO_ENTRE_LINHAS = 10;
const PASSO = ALTURA_LINHA + ESPACO_ENTRE_LINHAS;

interface LinhaProps {
  frase: string;
  indice: number;
  total: number;
  editando: boolean;
  posicoes: SharedValue<number[]>;
  ativo: SharedValue<number>;
  topoInicial: SharedValue<number>;
  arrasto: SharedValue<number>;
  aoSoltar: (posicoesFinais: number[]) => void;
  aoArrastar: (arrastando: boolean) => void;
  children: React.ReactNode;
}

// uma linha da lista: a alça no começo arrasta, as outras linhas abrem espaço
function LinhaOrdenavel({
  indice,
  total,
  editando,
  posicoes,
  ativo,
  topoInicial,
  arrasto,
  aoSoltar,
  aoArrastar,
  children,
}: LinhaProps) {
  const estilo = useAnimatedStyle(() => {
    const posicao = posicoes.value[indice] ?? indice;
    if (ativo.value === indice) {
      return {
        top: topoInicial.value + arrasto.value,
        zIndex: 10,
        transform: [{ scale: 1.02 }],
        shadowOpacity: 0.18,
        elevation: 6,
      };
    }
    return {
      top: withSpring(posicao * PASSO, { damping: 20, stiffness: 220 }),
      zIndex: 0,
      transform: [{ scale: 1 }],
      shadowOpacity: 0,
      elevation: 0,
    };
  });

  const arrastar = Gesture.Pan()
    .enabled(!editando && total > 1)
    .activateAfterLongPress(120)
    .onStart(() => {
      ativo.set(indice);
      topoInicial.set((posicoes.value[indice] ?? indice) * PASSO);
      arrasto.set(0);
      scheduleOnRN(aoArrastar, true);
    })
    .onUpdate((evento) => {
      arrasto.set(evento.translationY);
      const alvo = Math.min(
        Math.max(
          Math.round((topoInicial.value + evento.translationY) / PASSO),
          0,
        ),
        total - 1,
      );
      const atual = posicoes.value[indice] ?? indice;
      if (alvo !== atual) {
        const nova = [...posicoes.value];
        const outro = nova.indexOf(alvo);
        if (outro >= 0) nova[outro] = atual;
        nova[indice] = alvo;
        posicoes.set(nova);
      }
    })
    .onFinalize(() => {
      if (ativo.value !== indice) return;
      ativo.set(-1);
      scheduleOnRN(aoSoltar, posicoes.value);
      scheduleOnRN(aoArrastar, false);
    });

  return (
    <Animated.View style={[styles.linhaOrdenavel, estilo]}>
      <GestureDetector gesture={arrastar}>
        <View
          style={[styles.alca, (editando || total < 2) && styles.acaoOff]}
          accessibilityRole="button"
          accessibilityLabel="Segure e arraste para reordenar"
        >
          <Ionicons name="reorder-three" size={26} color="#6B7280" />
        </View>
      </GestureDetector>
      {children}
    </Animated.View>
  );
}

// Frases rápidas de cada etapa da corrida: o motorista adiciona, edita, apaga e
// reordena. As primeiras aparecem no painel do mapa (a caminho e no embarque) e
// todas no chat. Ficam salvas no aparelho.
export default function PreferenciasChat({
  visible,
  onClose,
  etapaInicial,
}: Props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const { porEtapa, adicionar, editar, remover, reordenar, restaurar } =
    useMensagensRapidas();
  const [etapa, setEtapa] = useState<EtapaDaMensagem>(() =>
    ETAPAS_DAS_MENSAGENS.find((item) => item.etapa === etapaInicial)
      ? (etapaInicial as EtapaDaMensagem)
      : "aceita",
  );
  const [nova, setNova] = useState("");
  const [indiceEditado, setIndiceEditado] = useState<number | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const lista = porEtapa[etapa];
  const posicoes = useSharedValue<number[]>(lista.map((_, indice) => indice));
  const ativo = useSharedValue(-1);
  const topoInicial = useSharedValue(0);
  const arrasto = useSharedValue(0);

  // a posição visual de cada linha volta ao zero sempre que a lista muda
  useEffect(() => {
    posicoes.set(lista.map((_, indice) => indice));
  }, [lista, posicoes]);

  const aoSoltar = useCallback(
    (posicoesFinais: number[]) => {
      const reordenada = [...lista];
      posicoesFinais.forEach((posicao, indice) => {
        reordenada[posicao] = lista[indice];
      });
      if (reordenada.some((frase, indice) => frase !== lista[indice])) {
        reordenar(etapa, reordenada);
      }
    },
    [lista, etapa, reordenar],
  );
  const dados = ETAPAS_DAS_MENSAGENS.find((item) => item.etapa === etapa);
  const cheia = lista.length >= LIMITE_MENSAGENS_POR_ETAPA;

  const trocarEtapa = (proxima: EtapaDaMensagem) => {
    setEtapa(proxima);
    setNova("");
    setIndiceEditado(null);
    setErro(null);
  };

  const salvarNova = () => {
    const motivo = adicionar(etapa, nova);
    if (motivo !== null) {
      setErro(motivo);
      return;
    }
    setNova("");
    setErro(null);
  };

  const salvarEdicao = () => {
    if (indiceEditado === null) return;
    const motivo = editar(etapa, indiceEditado, textoEditado);
    if (motivo !== null) {
      setErro(motivo);
      return;
    }
    setIndiceEditado(null);
    setErro(null);
  };

  const confirmarRemocao = (indice: number) =>
    Alert.alert("Apagar frase?", `“${lista[indice]}” sai desta etapa.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          setIndiceEditado(null);
          remover(etapa, indice);
        },
      },
    ]);

  const confirmarRestaurar = () =>
    Alert.alert(
      "Restaurar padrão?",
      "As frases desta etapa voltam para as originais.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          onPress: () => {
            setIndiceEditado(null);
            setErro(null);
            restaurar(etapa);
          },
        },
      ],
    );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.tela}>
        <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.voltar}
            onPress={onClose}
          >
            <Ionicons name="arrow-back-outline" size={26} color="#111" />
          </TouchableOpacity>
          <Text style={styles.titulo}>Mensagens do chat</Text>
        </View>

        <View style={styles.abas}>
          {ETAPAS_DAS_MENSAGENS.map((item) => {
            const ativa = item.etapa === etapa;
            return (
              <TouchableOpacity
                key={item.etapa}
                style={[styles.aba, ativa && styles.abaAtiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativa }}
                onPress={() => trocarEtapa(item.etapa)}
              >
                <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>
                  {item.rotulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.corpo}
          contentContainerStyle={styles.corpoConteudo}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!arrastando}
        >
          <Text style={styles.apoio}>{dados?.apoio}</Text>

          {lista.length === 0 ? (
            <Text style={styles.vazio}>
              Nenhuma frase nesta etapa. Adicione abaixo ou restaure o padrão.
            </Text>
          ) : null}

          <View
            style={{
              height: Math.max(lista.length * PASSO - ESPACO_ENTRE_LINHAS, 0),
            }}
          >
            {lista.map((frase, indice) => {
              const editando = indiceEditado === indice;
              return (
                <LinhaOrdenavel
                  key={frase}
                  frase={frase}
                  indice={indice}
                  total={lista.length}
                  editando={editando}
                  posicoes={posicoes}
                  ativo={ativo}
                  topoInicial={topoInicial}
                  arrasto={arrasto}
                  aoSoltar={aoSoltar}
                  aoArrastar={setArrastando}
                >
                  {editando ? (
                    <TextInput
                      style={styles.campoEdicao}
                      value={textoEditado}
                      autoFocus
                      maxLength={TAMANHO_MAXIMO_MENSAGEM_RAPIDA}
                      onChangeText={(valor) => {
                        setTextoEditado(valor);
                        setErro(null);
                      }}
                      onSubmitEditing={salvarEdicao}
                      returnKeyType="done"
                      accessibilityLabel="Texto da frase"
                    />
                  ) : (
                    <Text style={styles.frase} numberOfLines={2}>
                      {frase}
                    </Text>
                  )}
                  <View style={styles.acoes}>
                    {editando ? (
                      <>
                        <TouchableOpacity
                          style={styles.acao}
                          accessibilityRole="button"
                          accessibilityLabel="Cancelar edição"
                          onPress={() => {
                            setIndiceEditado(null);
                            setErro(null);
                          }}
                        >
                          <Ionicons name="close" size={22} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acao}
                          accessibilityRole="button"
                          accessibilityLabel="Salvar edição"
                          onPress={salvarEdicao}
                        >
                          <Ionicons
                            name="checkmark"
                            size={22}
                            color="#12A150"
                          />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.acao}
                          accessibilityRole="button"
                          accessibilityLabel="Editar frase"
                          onPress={() => {
                            setIndiceEditado(indice);
                            setTextoEditado(frase);
                            setErro(null);
                          }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={21}
                            color="#111"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acao}
                          accessibilityRole="button"
                          accessibilityLabel="Apagar frase"
                          onPress={() => confirmarRemocao(indice)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={21}
                            color="#B42318"
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </LinhaOrdenavel>
              );
            })}
          </View>

          {erro ? (
            <Text accessibilityRole="alert" style={styles.erro}>
              {erro}
            </Text>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={confirmarRestaurar}
            style={styles.restaurar}
          >
            <Text style={styles.restaurarTexto}>Restaurar padrão</Text>
          </TouchableOpacity>
        </ScrollView>

        <View
          style={[
            styles.rodape,
            { paddingBottom: Math.max(insets.bottom, espacoDoTeclado) + 10 },
          ]}
        >
          <View style={styles.composicao}>
            <TextInput
              style={styles.campo}
              placeholder={
                cheia
                  ? "Limite de frases atingido"
                  : "Ex.: Estou no carro prata"
              }
              placeholderTextColor="#8A8F98"
              editable={!cheia}
              maxLength={TAMANHO_MAXIMO_MENSAGEM_RAPIDA}
              value={nova}
              onChangeText={(valor) => {
                setNova(valor);
                setErro(null);
              }}
              onSubmitEditing={salvarNova}
              returnKeyType="done"
              accessibilityLabel="Nova frase"
            />
            <TouchableOpacity
              style={[
                styles.adicionar,
                (nova.trim() === "" || cheia) && styles.acaoOff,
              ]}
              disabled={nova.trim() === "" || cheia}
              accessibilityRole="button"
              accessibilityLabel="Adicionar frase"
              onPress={salvarNova}
            >
              <Ionicons name="add" size={26} color="#111" />
            </TouchableOpacity>
          </View>
          <Text style={styles.contador}>
            {lista.length}/{LIMITE_MENSAGENS_POR_ETAPA} frases · salvas neste
            celular
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F7F7F7" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  voltar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: "#111" },
  abas: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  aba: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F2F3F5",
    paddingHorizontal: 8,
  },
  abaAtiva: { backgroundColor: "#FFD600" },
  abaTexto: { fontSize: 14, fontWeight: "600", color: "#555" },
  abaTextoAtiva: { color: "#111", fontWeight: "800" },
  corpo: { flex: 1 },
  corpoConteudo: { padding: 16, gap: 10 },
  apoio: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  vazio: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },
  linhaOrdenavel: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ALTURA_LINHA,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  alca: {
    width: 44,
    height: ALTURA_LINHA,
    alignItems: "center",
    justifyContent: "center",
  },
  frase: { flex: 1, fontSize: 16, color: "#111", lineHeight: 22 },
  campoEdicao: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#F2F3F5",
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
  },
  acoes: { flexDirection: "row", alignItems: "center" },
  acao: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  acaoOff: { opacity: 0.3 },
  erro: { fontSize: 14, fontWeight: "600", color: "#B42318" },
  restaurar: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  restaurarTexto: { fontSize: 15, fontWeight: "700", color: "#1C6FD1" },
  rodape: {
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  composicao: { flexDirection: "row", alignItems: "center", gap: 8 },
  campo: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "#F2F3F5",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111",
  },
  adicionar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
  },
  contador: { fontSize: 12, color: "#6B7280" },
});
