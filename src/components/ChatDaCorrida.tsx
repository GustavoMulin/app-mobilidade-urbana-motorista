import { Text, TextInput } from "@/components/common/Texto";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { MENSAGENS_RAPIDAS_VISIVEIS } from "@/domain/mensagensRapidas";
import { ehMinha, type MensagemDaCorrida } from "@/hooks/useChatDaCorrida";
import type { useMensagensRapidas } from "@/hooks/useMensagensRapidas";
import MensagensDoChat from "@/components/MensagensDoChat";
import PreferenciasChat from "@/components/PreferenciasChat";
import RespostasRapidas from "@/components/RespostasRapidas";
import { sugerirRespostas } from "@/domain/respostasSugeridas";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
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
  // as frases de cada etapa (editadas em Preferências) vêm da home: o painel
  // do embarque usa a mesma lista
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
  const [editandoFrases, setEditandoFrases] = useState(false);
  const tecladoAberto = espacoDoTeclado > 0;
  const primeiroNome = nomeDoOutro.trim().split(/\s+/)[0] || "Passageiro";

  // mensagem rápida vai uma vez por corrida e some da fileira; o intervalo
  // segura toques repetidos antes de a lista atualizar
  const ultimaRapida = useRef(0);
  const jaEnviadas = new Set(
    mensagens.filter(ehMinha).map((item) => item.conteudo.trim()),
  );
  // as frases da etapa, na ordem das preferências; se sobrar pouco, entram as
  // sugestões pela conversa
  const daEtapa = mensagensRapidas.daEtapa(etapa);
  const sugeridas = sugerirRespostas(
    "motorista",
    etapa,
    mensagens.map((item) => ({
      conteudo: item.conteudo,
      minha: ehMinha(item),
    })),
  );
  const rapidas = [
    ...daEtapa,
    ...sugeridas.filter((item) => !daEtapa.includes(item)),
  ]
    .filter((resposta) => !jaEnviadas.has(resposta.trim()))
    .slice(0, Math.max(daEtapa.length, MENSAGENS_RAPIDAS_VISIVEIS));
  const enviarRapida = (resposta: string) => {
    if (passouIntervalo(ultimaRapida)) enviar(resposta);
  };

  const enviar = (conteudo: string) => {
    if (!podeEnviar || conteudo.trim() === "") return;
    onEnviar(conteudo);
    setTexto("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
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
            {
              paddingBottom: !podeEnviar
                ? insets.bottom + 10
                : tecladoAberto
                  ? espacoDoTeclado
                  : 0,
            },
          ]}
        >
          {podeEnviar ? (
            <>
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
              <RespostasRapidas
                respostas={rapidas}
                onEnviar={enviarRapida}
                onEditar={() => setEditandoFrases(true)}
                paddingInferior={tecladoAberto ? 0 : insets.bottom}
              />
            </>
          ) : (
            <Text style={styles.encerrado}>
              A conversa fica disponível só durante a corrida.
            </Text>
          )}
        </View>
      </View>
      {editandoFrases ? (
        <PreferenciasChat
          visible
          etapaInicial={etapa}
          onClose={() => setEditandoFrases(false)}
        />
      ) : null}
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
    paddingTop: 10,
  },
  composicao: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
