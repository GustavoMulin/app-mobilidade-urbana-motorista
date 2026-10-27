import { Text, TextInput } from "@/components/common/Texto";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import {
  MENSAGENS_RAPIDAS_VISIVEIS,
  TAMANHO_MAXIMO_MENSAGEM_RAPIDA,
} from "@/domain/mensagensRapidas";
import { ehMinha, type MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import type { useMensagensRapidas } from "@/hooks/useMensagensRapidas";
import MensagensDoChat from "@/components/MensagensDoChat";
import RespostasRapidas from "@/components/RespostasRapidas";
import { sugerirRespostas } from "@/domain/respostasSugeridas";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Alert, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  nomeDoOutro: string;
  mensagens: MensagemDaCorrida[];
  podeEnviar: boolean;
  onEnviar: (texto: string) => void;
  onReenviar: (mensagem: MensagemDaCorrida) => void;
  // etapa da corrida (status_corrida): muda as sugestões de resposta
  etapa?: string | null;
  // as mensagens rápidas do motorista ficam na home: o painel do embarque usa
  // a mesma lista
  mensagensRapidas: ReturnType<typeof useMensagensRapidas>;
}

const INTERVALO_RAPIDAS_MS = 1500;

// toques seguidos numa mensagem rápida: só o primeiro passa
const passouIntervalo = (ultima: { current: number }) => {
  const agora = Date.now();
  if (agora - ultima.current < INTERVALO_RAPIDAS_MS) return false;
  ultima.current = agora;
  return true;
};

// conversa com o passageiro durante a corrida (do aceite até o fim)
export default function ChatDaCorrida({
  visible,
  onClose,
  nomeDoOutro,
  mensagens,
  podeEnviar,
  onEnviar,
  onReenviar,
  etapa,
  mensagensRapidas,
}: Props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const [texto, setTexto] = useState("");
  // respostas de um toque: as fixas e as que o motorista criou aqui
  const { personalizadas, adicionar, remover } = mensagensRapidas;
  const [criando, setCriando] = useState(false);
  const [novaRapida, setNovaRapida] = useState("");
  const [erroRapida, setErroRapida] = useState<string | null>(null);
  const primeiroNome = nomeDoOutro.trim().split(/\s+/)[0] || "Passageiro";

  // mensagem rápida vai uma vez por corrida e some da fileira; o intervalo
  // segura toques repetidos antes de a lista atualizar
  const ultimaRapida = useRef(0);
  const jaEnviadas = new Set(
    mensagens.filter(ehMinha).map((item) => item.conteudo.trim()),
  );
  // sugestões pela conversa e pela etapa, depois as criadas pelo motorista
  const sugeridas = sugerirRespostas(
    "motorista",
    etapa,
    mensagens.map((item) => ({
      conteudo: item.conteudo,
      minha: ehMinha(item),
    })),
  );
  // as do motorista vêm na frente; só duas cabem, sem rolar para o lado
  const rapidas = [
    ...personalizadas,
    ...sugeridas.filter((item) => !personalizadas.includes(item)),
  ]
    .filter((resposta) => !jaEnviadas.has(resposta.trim()))
    .slice(0, MENSAGENS_RAPIDAS_VISIVEIS);
  const enviarRapida = (resposta: string) => {
    if (passouIntervalo(ultimaRapida)) enviar(resposta);
  };

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

        <MensagensDoChat
          mensagens={mensagens}
          // com o passageiro já no carro, o embarque não é mais o assunto
          textoVazio={
            etapa === "em_andamento"
              ? `Fale com ${primeiroNome} por aqui.`
              : `Avise ${primeiroNome} sobre o embarque por aqui.`
          }
          onReenviar={onReenviar}
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
              <RespostasRapidas
                respostas={rapidas}
                destacadas={personalizadas}
                onEnviar={enviarRapida}
                onSegurar={confirmarRemocao}
                inicio={
                  <TouchableOpacity
                    style={[styles.rapida, styles.rapidaNova]}
                    accessibilityRole="button"
                    accessibilityLabel="Criar mensagem rápida"
                    onPress={() => setCriando(true)}
                  >
                    <Ionicons name="create-outline" size={18} color="#111" />
                  </TouchableOpacity>
                }
              />
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
  rodape: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
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
