// CODEX: 0 linhas alteradas; adapta formulário, teclado e rodapé às áreas seguras. Remover após validação ou commit.
import AppLogo from "@/components/common/AppLogo";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastContext";
import {
  SituacaoCadastro,
  useCadastroMotorista,
} from "@/hooks/useCadastroMotorista";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const CATEGORIAS_CNH = ["A", "B", "AB", "C", "D", "E"];
const DOCUMENTOS_EXIGIDOS = [
  { tipo: "cnh", titulo: "Foto ou PDF da CNH" },
  { tipo: "crlv", titulo: "Documento do veículo (CRLV)" },
  { tipo: "nada_consta", titulo: "Certidão de nada consta" },
  { tipo: "seguro_obrigatorio", titulo: "Seguro obrigatório" },
] as const;
const EXTENSOES_PERMITIDAS = /\.(pdf|jpe?g|png|webp|heic|heif|gif)$/i;
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const AVISO: Record<
  SituacaoCadastro,
  { titulo: string; texto: string; cor: string }
> = {
  sem_cadastro: {
    titulo: "Falta pouco para você dirigir",
    texto: "Envie seus dados para começarmos a análise.",
    cor: "#E65100",
  },
  pendente: {
    titulo: "Seu cadastro está incompleto",
    texto: "Complete os itens abaixo para entrar na análise.",
    cor: "#E65100",
  },
  em_analise: {
    titulo: "Cadastro em análise",
    texto:
      "Confira os documentos abaixo e envie os que faltam. Avisaremos assim que forem aprovados.",
    cor: "#1565C0",
  },
  reprovado: {
    titulo: "Cadastro reprovado",
    texto: "Confira as observações e reenvie o que for necessário.",
    cor: "#D32F2F",
  },
  aprovado: {
    titulo: "Cadastro aprovado",
    texto: "Tudo certo. Você já pode receber corridas.",
    cor: "#17A673",
  },
  // o servidor chama de "ativo" o motorista com todos os documentos aprovados
  ativo: {
    titulo: "Cadastro aprovado",
    texto: "Tudo certo. Você já pode receber corridas.",
    cor: "#17A673",
  },
};

const ROTULO_PENDENCIA: Record<string, string> = {
  cnh: "Dados da CNH",
  documentos: "Envio de documentos",
  veiculo: "Cadastro do veículo",
};

const formatarData = (texto: string) =>
  texto
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");

const paraIso = (texto: string) => {
  const digitos = texto.replace(/\D/g, "");

  if (digitos.length !== 8) return null;

  return `${digitos.slice(4)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`;
};

export default function Liberacao() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { mostrarToast } = useToast();
  const espacoDoTeclado = useEspacoDoTeclado(false);
  const {
    cadastro,
    carregando,
    enviando,
    erro,
    enviarCnh,
    enviarDocumento,
    aprovarDev,
    recarregar,
  } = useCadastroMotorista();

  const [numero, setNumero] = useState("");
  const [categoria, setCategoria] = useState("");
  const [validade, setValidade] = useState("");
  const [ear, setEar] = useState(false);
  const [erroArquivo, setErroArquivo] = useState("");
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (cadastro?.situacao === "aprovado" || cadastro?.situacao === "ativo") {
      router.replace("/home");
    }
  }, [cadastro?.situacao, router]);

  const validadeIso = paraIso(validade);
  const naoVencida =
    validadeIso !== null && new Date(`${validadeIso}T00:00:00`) > new Date();

  const cnhCompleta =
    numero.replace(/\D/g, "").length >= 9 && categoria !== "" && naoVencida;

  const faltaCnh = cadastro?.pendencias.includes("cnh") ?? true;

  const enviar = async () => {
    if (!cnhCompleta || validadeIso === null) return;

    await enviarCnh({
      numero_registro: numero.replace(/\D/g, ""),
      cnh_categoria: categoria,
      cnh_expiracao: validadeIso,
      ear,
    });
  };

  const processarArquivo = async (
    tipo: string,
    arquivo: { uri: string; name: string; mimeType?: string; size?: number },
  ) => {
    setErroArquivo("");
    if (!EXTENSOES_PERMITIDAS.test(arquivo.name)) {
      setErroArquivo(
        "Selecione um PDF ou uma imagem JPG, PNG, WEBP, HEIC ou GIF.",
      );
      return;
    }
    if (arquivo.size !== undefined && arquivo.size > TAMANHO_MAXIMO) {
      setErroArquivo("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    const sucesso = await enviarDocumento(tipo, arquivo);
    if (sucesso) {
      mostrarToast({
        tipo: "success",
        titulo: "Documento enviado para análise",
      });
    }
  };

  const selecionarDocumento = async (tipo: string) => {
    try {
      const escolha = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!escolha.canceled && escolha.assets[0]) {
        await processarArquivo(tipo, escolha.assets[0]);
      }
    } catch {
      setErroArquivo("Não foi possível abrir o arquivo. Tente novamente.");
    }
  };

  const selecionarFoto = async (tipo: string) => {
    try {
      const escolha = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (escolha.canceled || !escolha.assets[0]) return;
      const foto = escolha.assets[0];
      const extensao = foto.mimeType?.split("/")[1] ?? "jpg";
      await processarArquivo(tipo, {
        uri: foto.uri,
        name:
          foto.fileName && EXTENSOES_PERMITIDAS.test(foto.fileName)
            ? foto.fileName
            : `documento.${extensao}`,
        mimeType: foto.mimeType,
        size: foto.fileSize,
      });
    } catch {
      setErroArquivo("Não foi possível abrir a galeria. Tente novamente.");
    }
  };

  const sairDaConta = async () => {
    if (saindo) return;
    setSaindo(true);
    await logout();
  };

  // atalho de desenvolvimento: pula CNH e documentos e aprova direto
  const aprovarSemDocumentos = async () => {
    if (enviando) return;
    const sucesso = await aprovarDev();

    if (sucesso) {
      mostrarToast({
        tipo: "success",
        titulo: "Cadastro aprovado (atalho de desenvolvimento)",
      });
    }
  };

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color="#FF5500" />
        <Text style={styles.carregandoTexto}>Carregando seu cadastro...</Text>
      </View>
    );
  }

  const aviso = AVISO[cadastro?.situacao ?? "sem_cadastro"];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <AppLogo />
          </View>

          <View style={styles.content}>
            <View style={[styles.aviso, { borderLeftColor: aviso.cor }]}>
              <Text style={[styles.avisoTitulo, { color: aviso.cor }]}>
                {aviso.titulo}
              </Text>
              <Text style={styles.avisoTexto}>{aviso.texto}</Text>
            </View>

            <Text style={styles.secao}>O que falta</Text>

            {(cadastro?.pendencias.length ?? 0) === 0 ? (
              <View style={styles.itemLinha}>
                <Feather name="check-circle" size={18} color="#17A673" />
                <Text style={styles.itemTexto}>Nada pendente</Text>
              </View>
            ) : (
              cadastro?.pendencias.map((item) => (
                <View key={item} style={styles.itemLinha}>
                  <Feather name="circle" size={18} color="#BBB" />
                  <Text style={styles.itemTexto}>
                    {ROTULO_PENDENCIA[item] ?? item}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.secao}>Documentos para análise</Text>
            <Text style={styles.ajudaDocumento}>
              Envie PDF ou imagem (JPG, PNG, WEBP, HEIC ou GIF), até 10 MB por
              arquivo.
            </Text>
            {DOCUMENTOS_EXIGIDOS.map(({ tipo, titulo }) => {
              const documento = cadastro?.documentos.find(
                (item) => item.tipo_documento === tipo,
              );
              const status = documento?.status ?? "não enviado";
              return (
                <View key={tipo} style={styles.documentoCard}>
                  <View style={styles.itemLinha}>
                    <Feather
                      name={
                        status === "aprovado" ? "check-circle" : "file-text"
                      }
                      size={18}
                      color={status === "aprovado" ? "#17A673" : "#E65100"}
                    />
                    <Text style={styles.itemTexto}>
                      {titulo} · {status.replaceAll("_", " ")}
                    </Text>
                  </View>
                  {documento?.observacao ? (
                    <Text style={styles.alerta}>{documento.observacao}</Text>
                  ) : null}
                  {status !== "aprovado" ? (
                    <View style={styles.acoesDocumento}>
                      <TouchableOpacity
                        style={styles.botaoDocumento}
                        onPress={() => void selecionarFoto(tipo)}
                        disabled={enviando || saindo}
                        accessibilityRole="button"
                      >
                        <Text style={styles.botaoDocumentoTexto}>
                          Escolher foto
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.botaoDocumento}
                        onPress={() => void selecionarDocumento(tipo)}
                        disabled={enviando || saindo}
                        accessibilityRole="button"
                      >
                        <Text style={styles.botaoDocumentoTexto}>
                          {enviando ? "Enviando..." : "Escolher arquivo"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {faltaCnh ? (
              <>
                <Text style={styles.secao}>Dados da CNH</Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Número de registro"
                    placeholderTextColor="#CCC"
                    style={styles.input}
                    value={numero}
                    onChangeText={(texto) =>
                      setNumero(texto.replace(/\D/g, "").slice(0, 11))
                    }
                    keyboardType="number-pad"
                    editable={!enviando}
                  />
                </View>
                <View style={styles.inputUnderline} />

                <Text style={styles.rotulo}>Categoria</Text>

                <View style={styles.categoriaLinha}>
                  {CATEGORIAS_CNH.map((item) => {
                    const escolhida = categoria === item;

                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.categoria,
                          escolhida ? styles.categoriaEscolhida : null,
                        ]}
                        onPress={() => setCategoria(item)}
                        disabled={enviando}
                      >
                        <Text
                          style={[
                            styles.categoriaTexto,
                            escolhida ? styles.categoriaTextoEscolhido : null,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Validade (DD/MM/AAAA)"
                    placeholderTextColor="#CCC"
                    style={styles.input}
                    value={validade}
                    onChangeText={(texto) => setValidade(formatarData(texto))}
                    keyboardType="number-pad"
                    editable={!enviando}
                  />
                </View>
                <View style={styles.inputUnderline} />

                {validade.length === 10 && !naoVencida ? (
                  <Text style={styles.alerta}>
                    Essa data já passou. Informe uma CNH dentro da validade.
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.opcao}
                  onPress={() => setEar((atual) => !atual)}
                  disabled={enviando}
                >
                  <Text style={styles.opcaoTexto}>
                    Minha CNH tem observação EAR
                  </Text>
                  {ear && <Feather name="check" size={20} color="#000" />}
                </TouchableOpacity>
              </>
            ) : null}

            {erroArquivo ? <ErrorBanner message={erroArquivo} /> : null}
            {erro.length > 0 ? <ErrorBanner message={erro} /> : null}

            {__DEV__ &&
              cadastro?.situacao !== "aprovado" &&
              cadastro?.situacao !== "ativo" && (
                <TouchableOpacity
                  onPress={() => void aprovarSemDocumentos()}
                  disabled={enviando || saindo}
                  style={styles.testClickableContainer}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.testClickableText,
                      (enviando || saindo) && styles.testClickableTextDisabled,
                    ]}
                  >
                    Pular e aprovar (dev)
                  </Text>
                </TouchableOpacity>
              )}

            <TouchableOpacity
              style={styles.sair}
              onPress={() => void sairDaConta()}
              disabled={saindo}
            >
              <Text style={styles.sairTexto}>Sair da conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + espacoDoTeclado,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.botao,
              (faltaCnh ? cnhCompleta : true) && !enviando
                ? styles.botaoAtivo
                : styles.botaoInativo,
            ]}
            onPress={faltaCnh ? enviar : recarregar}
            disabled={(faltaCnh && !cnhCompleta) || enviando}
          >
            {enviando ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text
                style={[
                  styles.botaoTexto,
                  faltaCnh && !cnhCompleta && styles.botaoTextoInativo,
                ]}
              >
                {faltaCnh ? "Enviar para análise" : "Atualizar situação"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  carregando: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  carregandoTexto: { marginTop: 16, fontSize: 14, color: "#666" },
  header: { alignItems: "center", paddingTop: 56, paddingHorizontal: 20 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 30,
    marginTop: 20,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  aviso: {
    borderLeftWidth: 4,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
  },
  avisoTitulo: { fontSize: 17, fontWeight: "700" },
  avisoTexto: { fontSize: 14, color: "#555", marginTop: 4, lineHeight: 20 },
  secao: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 12,
  },
  itemLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  itemTexto: { flex: 1, fontSize: 15, color: "#333" },
  ajudaDocumento: { fontSize: 13, color: "#666", marginBottom: 12 },
  documentoCard: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  acoesDocumento: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  botaoDocumento: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    alignSelf: "flex-start",
  },
  botaoDocumentoTexto: { fontSize: 14, fontWeight: "600", color: "#B34300" },
  rotulo: { fontSize: 13, color: "#666", marginBottom: 10 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 18, color: "#000", fontWeight: "400" },
  inputUnderline: {
    height: 1,
    backgroundColor: "#FF5500",
    width: "100%",
    marginBottom: 16,
  },
  categoriaLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  categoria: {
    minWidth: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
  },
  categoriaEscolhida: { borderColor: "#FF5500", backgroundColor: "#FFF3E0" },
  categoriaTexto: { fontSize: 15, fontWeight: "600", color: "#666" },
  categoriaTextoEscolhido: { color: "#E65100" },
  alerta: { fontSize: 13, color: "#D32F2F", marginBottom: 16 },
  opcao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  opcaoTexto: { fontSize: 16, color: "#333" },
  testClickableContainer: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  testClickableText: {
    fontSize: 13,
    color: "#8A8A8A",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  testClickableTextDisabled: { color: "#A0A0A0" },
  sair: { marginTop: 8, paddingVertical: 12, alignItems: "center" },
  sairTexto: { fontSize: 15, color: "#888", textDecorationLine: "underline" },
  footer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },
  botao: {
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoAtivo: { backgroundColor: "#FFD200" },
  botaoInativo: { backgroundColor: "#F5F5F5" },
  botaoTexto: { fontSize: 16, fontWeight: "700", color: "#000" },
  botaoTextoInativo: { color: "#CCC" },
});
