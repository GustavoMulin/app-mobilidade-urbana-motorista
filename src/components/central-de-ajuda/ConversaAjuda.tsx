import { Text, TextInput } from "@/components/common/Texto";
import {
  MensagemDeAjuda,
  ROTULO_MOTIVO,
  aceitaMensagens,
  situacaoDoPedido,
} from "@/domain/ajuda";
import AnexoDaMensagem from "@/components/central-de-ajuda/AnexoDaMensagem";
import { useConversaAjuda } from "@/hooks/useConversaAjuda";
import * as ImagePicker from "expo-image-picker";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  pedidoId: number;
  onVoltar: (ultimaMensagemEm: string | null) => void;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const dia = (iso: string) => {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  if (data.toDateString() === hoje.toDateString()) return "Hoje";
  if (data.toDateString() === ontem.toDateString()) return "Ontem";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const primeiroNome = (nome: string | null) =>
  nome?.trim().split(/\s+/)[0] || "Atendimento";

function Mensagem({
  mensagem,
  separarDia,
  onReenviar,
}: {
  mensagem: MensagemDeAjuda;
  separarDia: boolean;
  onReenviar: (mensagem: MensagemDeAjuda) => void;
}) {
  const minha = mensagem.autor_tipo === "usuario";

  return (
    <View>
      {separarDia && <Text style={styles.dia}>{dia(mensagem.created_at)}</Text>}

      {mensagem.autor_tipo === "sistema" ? (
        <Text style={styles.sistema}>{mensagem.conteudo}</Text>
      ) : (
        <View style={[styles.linha, minha && styles.linhaMinha]}>
          <View
            style={[
              styles.balao,
              minha ? styles.balaoMeu : styles.balaoSuporte,
              mensagem.enviando && styles.balaoEnviando,
            ]}
          >
            {!minha && (
              <Text style={styles.autor}>
                {`Suporte · ${primeiroNome(mensagem.autor_nome)}`}
              </Text>
            )}
            {mensagem.anexos?.map((anexo, indice) => (
              <AnexoDaMensagem key={anexo.id ?? indice} anexo={anexo} />
            ))}
            {mensagem.conteudo ? (
              <Text style={styles.conteudo}>{mensagem.conteudo}</Text>
            ) : null}
            <Text style={styles.hora}>
              {mensagem.enviando ? "Enviando..." : hora(mensagem.created_at)}
            </Text>
          </View>
          {mensagem.falhou && (
            <TouchableOpacity
              style={styles.falhou}
              accessibilityRole="button"
              accessibilityLabel="Mensagem não enviada. Tocar para tentar de novo"
              onPress={() => onReenviar(mensagem)}
            >
              <Ionicons name="alert-circle" size={14} color="#B42318" />
              <Text style={styles.falhouTexto}>
                Não enviada · tocar para tentar de novo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// conversa de um pedido da Central de Ajuda: o motorista lê e responde o
// atendimento feito pelo painel de gestão
export default function ConversaAjuda({ pedidoId, onVoltar }: Props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const { pedido, mensagens, carregando, erro, enviar, reenviar } =
    useConversaAjuda(pedidoId);
  const [texto, setTexto] = useState("");
  // print ou foto do problema, mandado junto com o texto (o painel mostra)
  const [imagem, setImagem] = useState<{
    uri: string;
    nome: string;
    tipo: string;
  } | null>(null);
  const lista = useRef<FlatList<MensagemDeAjuda>>(null);

  const situacao = pedido ? situacaoDoPedido(pedido.status) : null;
  // "open" é a fila geral (ninguém assumiu ainda); "waiting", a fila de um atendente
  const avisoDaFila =
    pedido?.status === "waiting" || pedido?.status === "open"
      ? (pedido.fila?.mensagem ?? null)
      : null;
  // com o aviso da fila no topo, a mesma frase não se repete na conversa
  const visiveis = avisoDaFila
    ? mensagens.filter((item) => item.tipo_sistema !== "fila_atendimento")
    : mensagens;
  // finalizado (ou status desconhecido) é só consulta
  const encerrado = pedido ? !aceitaMensagens(pedido.status) : false;
  const podeEnviar = (texto.trim().length > 0 || imagem !== null) && !encerrado;

  useEffect(() => {
    const espera = setTimeout(
      () => lista.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(espera);
  }, [visiveis.length, espacoDoTeclado]);

  const aoEnviar = () => {
    if (!podeEnviar) return;
    const conteudo = texto;
    const anexo = imagem;
    setTexto("");
    setImagem(null);
    void enviar(conteudo, anexo);
  };

  const escolherImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;

    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    const arquivo = escolha.canceled ? null : escolha.assets[0];
    if (!arquivo) return;

    setImagem({
      uri: arquivo.uri,
      nome: arquivo.fileName ?? "imagem.jpg",
      tipo: arquivo.mimeType ?? "image/jpeg",
    });
  };

  return (
    <View style={styles.tela}>
      <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.voltar}
          onPress={() => onVoltar(pedido?.ultima_mensagem_em ?? null)}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={styles.cabecalhoTextos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {pedido ? (ROTULO_MOTIVO[pedido.motivo] ?? "Pedido de ajuda") : ""}
          </Text>
          {pedido && situacao && (
            <View style={styles.cabecalhoLinha}>
              <Text style={styles.protocolo}>{pedido.protocolo}</Text>
              <View style={[styles.selo, { backgroundColor: situacao.fundo }]}>
                <Text
                  style={[styles.seloTexto, { color: situacao.cor }]}
                  numberOfLines={1}
                >
                  {situacao.texto}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {avisoDaFila ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Ionicons name="time-outline" size={18} color="#8A6100" />
          <Text style={styles.avisoTexto}>{avisoDaFila}</Text>
        </View>
      ) : null}

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator color="#111" />
        </View>
      ) : (
        <FlatList
          ref={lista}
          data={visiveis}
          keyExtractor={(item, indice) =>
            String(item.id ?? item.client_message_id ?? indice)
          }
          contentContainerStyle={styles.mensagens}
          renderItem={({ item, index }) => (
            <Mensagem
              mensagem={item}
              separarDia={
                index === 0 ||
                dia(visiveis[index - 1].created_at) !== dia(item.created_at)
              }
              onReenviar={(mensagem) => void reenviar(mensagem)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {erro ?? "Ainda não há mensagens neste pedido."}
            </Text>
          }
        />
      )}

      {!!erro && mensagens.length > 0 && (
        <Text style={styles.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}

      <View
        style={[
          styles.rodape,
          { paddingBottom: Math.max(insets.bottom, espacoDoTeclado) + 10 },
        ]}
      >
        {encerrado ? (
          <View style={styles.finalizado}>
            <Text style={styles.encerrado}>
              {pedido?.status === "resolved"
                ? "Este atendimento foi finalizado. Para outro assunto, abra um novo atendimento."
                : "Este atendimento não recebe mensagens agora."}
            </Text>
            {pedido?.status === "resolved" && (
              <TouchableOpacity
                style={styles.novoAtendimento}
                accessibilityRole="button"
                onPress={() => onVoltar(pedido?.ultima_mensagem_em ?? null)}
              >
                <Text style={styles.novoAtendimentoTexto}>
                  Abrir novo atendimento
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {imagem ? (
              <View style={styles.previa}>
                <Image
                  source={{ uri: imagem.uri }}
                  style={styles.previaImagem}
                />
                <Text style={styles.previaTexto} numberOfLines={1}>
                  Imagem pronta para enviar
                </Text>
                <TouchableOpacity
                  style={styles.previaRemover}
                  accessibilityRole="button"
                  accessibilityLabel="Tirar a imagem"
                  onPress={() => setImagem(null)}
                >
                  <Ionicons name="close" size={18} color="#111" />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.composicao}>
              <TouchableOpacity
                style={styles.anexar}
                accessibilityRole="button"
                accessibilityLabel="Anexar uma imagem"
                onPress={() => void escolherImagem()}
              >
                <Ionicons name="image-outline" size={22} color="#111" />
              </TouchableOpacity>
              <TextInput
                style={styles.campo}
                placeholder="Escreva sua mensagem"
                placeholderTextColor="#8A8F98"
                multiline
                maxLength={4000}
                value={texto}
                onChangeText={setTexto}
                accessibilityLabel="Mensagem para o atendimento"
              />
              <TouchableOpacity
                style={[styles.enviar, !podeEnviar && styles.enviarInativo]}
                disabled={!podeEnviar}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensagem"
                onPress={aoEnviar}
              >
                <Ionicons name="send" size={20} color="#111" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
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
  cabecalhoTextos: { flex: 1, gap: 4 },
  titulo: { fontSize: 18, fontWeight: "800", color: "#111" },
  cabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  protocolo: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  selo: {
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  seloTexto: { fontSize: 12, fontWeight: "700" },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#FFF6DB",
    padding: 12,
  },
  avisoTexto: { flex: 1, fontSize: 14, color: "#5C4300" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  mensagens: { padding: 16, gap: 8 },
  dia: {
    alignSelf: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginVertical: 8,
  },
  sistema: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 4,
    paddingHorizontal: 24,
  },
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
  balaoSuporte: { backgroundColor: "#F2F3F5", borderBottomLeftRadius: 4 },
  balaoEnviando: { opacity: 0.6 },
  autor: { fontSize: 12, fontWeight: "800", color: "#1C6FD1" },
  conteudo: { fontSize: 15, color: "#111", lineHeight: 21 },
  hora: { alignSelf: "flex-end", fontSize: 11, color: "#6B7280" },
  falhou: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
  falhouTexto: { fontSize: 12, fontWeight: "600", color: "#B42318" },
  vazio: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginTop: 24,
  },
  erro: {
    color: "#B42318",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  rodape: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
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
  anexar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F2F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  previa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#F7F8FA",
    padding: 8,
  },
  previaImagem: { width: 44, height: 44, borderRadius: 8 },
  previaTexto: { flex: 1, fontSize: 14, color: "#374151" },
  previaRemover: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  finalizado: { gap: 10, paddingTop: 4 },
  novoAtendimento: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  novoAtendimentoTexto: { color: "#111", fontSize: 15, fontWeight: "700" },
  encerrado: {
    textAlign: "center",
    fontSize: 14,
    color: "#5F6368",
    paddingVertical: 10,
  },
});
