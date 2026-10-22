import { Text, TextInput } from "@/components/common/Texto";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import {
  MENSAGENS_RAPIDAS_PADRAO,
  TAMANHO_MAXIMO_MENSAGEM_RAPIDA,
} from "@/domain/mensagensRapidas";
import { ehMinha, type MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import { useMensagensRapidas } from "@/hooks/useMensagensRapidas";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
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
  nomeDoOutro: string;
  mensagens: MensagemDaCorrida[];
  podeEnviar: boolean;
  onEnviar: (texto: string) => void;
  onReenviar: (mensagem: MensagemDaCorrida) => void;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// conversa com o passageiro durante a corrida (do aceite até o fim)
export default function ChatDaCorrida({
  visible,
  onClose,
  nomeDoOutro,
  mensagens,
  podeEnviar,
  onEnviar,
  onReenviar,
}: Props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const [texto, setTexto] = useState("");
  const lista = useRef<FlatList<MensagemDaCorrida>>(null);
  // respostas de um toque: as fixas e as que o motorista criou aqui
  const { personalizadas, adicionar, remover } = useMensagensRapidas();
  const [criando, setCriando] = useState(false);
  const [novaRapida, setNovaRapida] = useState("");
  const [erroRapida, setErroRapida] = useState<string | null>(null);
  const primeiroNome = nomeDoOutro.trim().split(/\s+/)[0] || "Passageiro";

  useEffect(() => {
    if (!visible) return;
    const espera = setTimeout(
      () => lista.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(espera);
  }, [visible, mensagens.length, espacoDoTeclado]);

  const enviar = (conteudo: string) => {
    if (!podeEnviar || conteudo.trim() === "") return;
    onEnviar(conteudo);
    setTexto("");
  };

  const fecharCriacao = () => {
    setCriando(false);
    setNovaRapida("");
    setErroRapida(null);
  };

  const salvarRapida = () => {
    const motivo = adicionar(novaRapida);
    if (motivo !== null) {
      setErroRapida(motivo);
      return;
    }
    fecharCriacao();
  };

  const confirmarRemocao = (mensagem: string) =>
    Alert.alert("Remover mensagem rápida?", `“${mensagem}” sai da sua lista.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => remover(mensagem),
      },
    ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.tela}>
        <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Fechar conversa"
            style={styles.voltar}
            onPress={onClose}
          >
            <Ionicons name="chevron-down" size={28} color="#111" />
          </TouchableOpacity>
          <View style={styles.cabecalhoTextos}>
            <Text style={styles.titulo} numberOfLines={1}>
              {primeiroNome}
            </Text>
            <Text style={styles.subtitulo}>Passageiro da corrida</Text>
          </View>
        </View>

        <FlatList
          ref={lista}
          data={mensagens}
          keyExtractor={(item, indice) =>
            String(item.id ?? item.client_message_id ?? indice)
          }
          contentContainerStyle={styles.mensagens}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Ionicons name="chatbubbles-outline" size={34} color="#9CA3AF" />
              <Text style={styles.vazioTexto}>
                {`Avise ${primeiroNome} sobre o embarque por aqui.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const minha = ehMinha(item);
            return (
              <View style={[styles.linha, minha && styles.linhaMinha]}>
                <View
                  style={[
                    styles.balao,
                    minha ? styles.balaoMeu : styles.balaoDele,
                    item.enviando && styles.balaoEnviando,
                  ]}
                >
                  <Text style={styles.conteudo}>{item.conteudo}</Text>
                  <Text style={styles.hora}>
                    {item.enviando ? "Enviando..." : hora(item.created_at)}
                  </Text>
                </View>
                {item.falhou ? (
                  <TouchableOpacity
                    style={styles.falhou}
                    accessibilityRole="button"
                    accessibilityLabel="Mensagem não enviada. Tocar para tentar de novo"
                    onPress={() => onReenviar(item)}
                  >
                    <Ionicons name="alert-circle" size={14} color="#B42318" />
                    <Text style={styles.falhouTexto}>
                      Não enviada · tocar para tentar de novo
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />

        <View
          style={[
            styles.rodape,
            { paddingBottom: Math.max(insets.bottom, espacoDoTeclado) + 10 },
          ]}
        >
          {podeEnviar && criando ? (
            <>
              <Text style={styles.criarTitulo}>Nova mensagem rápida</Text>
              <View style={styles.composicao}>
                <TextInput
                  style={styles.campo}
                  placeholder="Ex.: Estou no carro prata"
                  placeholderTextColor="#8A8F98"
                  autoFocus
                  maxLength={TAMANHO_MAXIMO_MENSAGEM_RAPIDA}
                  value={novaRapida}
                  onChangeText={(valor) => {
                    setNovaRapida(valor);
                    setErroRapida(null);
                  }}
                  onSubmitEditing={salvarRapida}
                  returnKeyType="done"
                  accessibilityLabel="Texto da nova mensagem rápida"
                />
                <TouchableOpacity
                  style={styles.cancelarCriacao}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar nova mensagem rápida"
                  onPress={fecharCriacao}
                >
                  <Ionicons name="close" size={22} color="#111" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.enviar,
                    novaRapida.trim() === "" && styles.enviarInativo,
                  ]}
                  disabled={novaRapida.trim() === ""}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar mensagem rápida"
                  onPress={salvarRapida}
                >
                  <Ionicons name="checkmark" size={22} color="#111" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.criarApoio, erroRapida && styles.criarErro]}>
                {erroRapida ??
                  "Fica salva neste celular para as próximas corridas."}
              </Text>
            </>
          ) : podeEnviar ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.rapidas}
              >
                <TouchableOpacity
                  style={[styles.rapida, styles.rapidaNova]}
                  accessibilityRole="button"
                  accessibilityLabel="Criar mensagem rápida"
                  onPress={() => setCriando(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#111" />
                </TouchableOpacity>
                {[...MENSAGENS_RAPIDAS_PADRAO, ...personalizadas].map(
                  (resposta) => {
                    const minha = personalizadas.includes(resposta);
                    return (
                      <TouchableOpacity
                        key={resposta}
                        style={[styles.rapida, minha && styles.rapidaMinha]}
                        accessibilityRole="button"
                        accessibilityHint={
                          minha
                            ? "Toque para enviar. Toque e segure para remover."
                            : "Toque para enviar."
                        }
                        onPress={() => enviar(resposta)}
                        onLongPress={
                          minha ? () => confirmarRemocao(resposta) : undefined
                        }
                      >
                        <Text style={styles.rapidaTexto} numberOfLines={1}>
                          {resposta}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </ScrollView>
              <View style={styles.composicao}>
                <TextInput
                  style={styles.campo}
                  placeholder="Escreva uma mensagem"
                  placeholderTextColor="#8A8F98"
                  multiline
                  maxLength={4000}
                  value={texto}
                  onChangeText={setTexto}
                  accessibilityLabel={`Mensagem para ${primeiroNome}`}
                />
                <TouchableOpacity
                  style={[
                    styles.enviar,
                    texto.trim() === "" && styles.enviarInativo,
                  ]}
                  disabled={texto.trim() === ""}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensagem"
                  onPress={() => enviar(texto)}
                >
                  <Ionicons name="send" size={20} color="#111" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.encerrado}>
              A conversa fica disponível só durante a corrida.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#FFF" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  voltar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cabecalhoTextos: { flex: 1 },
  titulo: { fontSize: 18, fontWeight: "800", color: "#111" },
  subtitulo: { fontSize: 13, color: "#6B7280" },
  mensagens: { padding: 16, gap: 8, flexGrow: 1 },
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  vazioTexto: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  linha: { alignItems: "flex-start" },
  linhaMinha: { alignItems: "flex-end" },
  balao: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 2,
  },
  balaoMeu: { backgroundColor: "#FFF1B8", borderBottomRightRadius: 4 },
  balaoDele: { backgroundColor: "#F2F3F5", borderBottomLeftRadius: 4 },
  balaoEnviando: { opacity: 0.6 },
  conteudo: { fontSize: 15, color: "#111", lineHeight: 21 },
  hora: { alignSelf: "flex-end", fontSize: 11, color: "#6B7280" },
  falhou: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
  falhouTexto: { fontSize: 12, fontWeight: "600", color: "#B42318" },
  rodape: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  rapidas: { flexDirection: "row", gap: 8, paddingRight: 4 },
  rapida: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    maxWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rapidaMinha: { backgroundColor: "#FFF8D6", borderColor: "#F2D45C" },
  rapidaNova: {
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
    paddingHorizontal: 10,
  },
  criarTitulo: { fontSize: 14, fontWeight: "700", color: "#111" },
  criarApoio: { fontSize: 12, color: "#6B7280" },
  criarErro: { color: "#B42318", fontWeight: "600" },
  cancelarCriacao: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F2F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  rapidaTexto: { fontSize: 13, color: "#111", fontWeight: "600" },
  composicao: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  campo: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: "#F2F3F5",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: "#111",
  },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
  },
  enviarInativo: { opacity: 0.4 },
  encerrado: {
    textAlign: "center",
    fontSize: 14,
    color: "#5F6368",
    paddingVertical: 10,
  },
});
