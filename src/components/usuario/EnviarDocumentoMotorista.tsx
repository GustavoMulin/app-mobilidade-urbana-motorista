import { api, mensagemDaApi } from "@/Services/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Etapa = "documentos" | "formato" | "requisitos";
type Formato = "fisico" | "digital";
type TipoDocumento = "cnh" | "nada_consta" | "seguro_obrigatorio";
type IconeCommunity = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];
interface Arquivo {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
interface Props {
  onClose: () => void;
  onEnviado: (tipo: TipoDocumento) => void;
}

const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const DOCUMENTOS: {
  tipo: TipoDocumento;
  titulo: string;
  nome: string;
  icone: IconeCommunity;
  requisitos: { fisico: string[]; digital: string[] };
}[] = [
  {
    tipo: "cnh",
    titulo: "CNH",
    nome: "a CNH",
    icone: "card-account-details-outline",
    requisitos: {
      fisico: [
        "A CNH deve estar dentro do prazo de validade.",
        "Envie duas fotos: primeiro a frente e depois o verso da CNH, com os dados legíveis.",
        "Fotografe com boa iluminação, sem reflexos e sem cortar as bordas.",
      ],
      digital: [
        "A CNH deve estar dentro do prazo de validade.",
        "Nos envie a CNH digital no formato PDF.",
      ],
    },
  },
  {
    tipo: "nada_consta",
    titulo: "Nada consta",
    nome: "o Nada consta",
    icone: "file-certificate-outline",
    requisitos: {
      fisico: [
        "A certidão deve estar dentro do prazo de validade.",
        "Nos envie uma foto inteira da certidão, com os dados legíveis.",
        "O nome e o CPF precisam ser os seus.",
      ],
      digital: [
        "A certidão deve estar dentro do prazo de validade.",
        "Nos envie a certidão de antecedentes criminais no formato PDF.",
        "O nome e o CPF precisam ser os seus.",
      ],
    },
  },
  {
    tipo: "seguro_obrigatorio",
    titulo: "Seguro",
    nome: "o Seguro",
    icone: "shield-check-outline",
    requisitos: {
      fisico: [
        "O seguro obrigatório deve estar dentro do prazo de validade.",
        "Nos envie uma foto inteira do comprovante, com os dados legíveis.",
      ],
      digital: [
        "O seguro obrigatório deve estar dentro do prazo de validade.",
        "Nos envie o comprovante no formato PDF.",
      ],
    },
  },
];

export default function EnviarDocumentoMotorista({
  onClose,
  onEnviado,
}: Props) {
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState<Etapa>("documentos");
  const [tipo, setTipo] = useState<TipoDocumento | null>(null);
  const [formato, setFormato] = useState<Formato | null>(null);
  const [frenteCnh, setFrenteCnh] = useState<Arquivo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const ocupado = useRef(false);
  const montado = useRef(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [etapa]);

  const documento = DOCUMENTOS.find((item) => item.tipo === tipo);
  const semEscolha =
    (etapa === "documentos" && !tipo) || (etapa === "formato" && !formato);

  const voltar = () => {
    if (ocupado.current) return;
    setErro("");
    setFrenteCnh(null);
    if (etapa === "documentos") onClose();
    else setEtapa(etapa === "requisitos" ? "formato" : "documentos");
  };
  const fechar = () => {
    if (ocupado.current) return;
    if (frenteCnh) {
      Alert.alert("Sair do envio?", "A foto da CNH ainda não foi enviada.", [
        { text: "Continuar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: onClose },
      ]);
    } else onClose();
  };

  const enviar = async (arquivo: Arquivo, verso?: Arquivo) => {
    if (!montado.current || ocupado.current || !tipo) return;
    for (const item of [arquivo, verso]) {
      if (item && (item.size ?? 0) > TAMANHO_MAXIMO) {
        setErro("Selecione um arquivo de até 10 MB.");
        return;
      }
    }
    ocupado.current = true;
    setEnviando(true);
    setErro("");
    try {
      const form = new FormData();
      form.append("tipo_documento", tipo);
      const anexar = (campo: string, item: Arquivo) =>
        form.append(campo, {
          uri: item.uri,
          name: item.name,
          type: item.mimeType,
        } as unknown as Blob);
      anexar("arquivo", arquivo);
      if (verso) anexar("arquivo_verso", verso);
      await api.post("/motorista/cadastro/documentos", form);
      if (!montado.current) return;
      onEnviado(tipo);
      onClose();
    } catch (falha) {
      if (montado.current)
        setErro(
          mensagemDaApi(
            falha,
            "Não foi possível enviar o documento. Tente novamente.",
          ),
        );
    } finally {
      ocupado.current = false;
      if (montado.current) setEnviando(false);
    }
  };

  const receberFoto = async (foto: ImagePicker.ImagePickerAsset) => {
    const mime = foto.mimeType || "image/jpeg";
    const arquivo: Arquivo = {
      uri: foto.uri,
      name: foto.fileName || `documento.${mime.split("/")[1] ?? "jpg"}`,
      mimeType: mime,
      size: foto.fileSize,
    };
    // a CNH em foto precisa da frente e do verso
    if (tipo !== "cnh") await enviar(arquivo);
    else if (!frenteCnh) setFrenteCnh(arquivo);
    else await enviar(frenteCnh, arquivo);
  };

  const escolherFoto = async (camera: boolean) => {
    try {
      if (camera) {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert(
            "Acesso à câmera",
            "Permita o acesso à câmera nas configurações para fotografar o documento.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Abrir configurações",
                onPress: () => void Linking.openSettings(),
              },
            ],
          );
          return;
        }
      }
      const opcoes = {
        mediaTypes: ["images" as const],
        quality: 1,
        allowsEditing: false,
      };
      const resultado = camera
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);
      const foto = resultado.canceled ? null : resultado.assets[0];
      if (foto && montado.current) await receberFoto(foto);
    } catch {
      if (montado.current)
        setErro("Não foi possível abrir as fotos. Tente novamente.");
    }
  };

  const escolherPdf = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      const pdf = resultado.canceled ? null : resultado.assets[0];
      if (pdf && montado.current)
        await enviar({
          uri: pdf.uri,
          name: pdf.name,
          mimeType: pdf.mimeType || "application/pdf",
          size: pdf.size,
        });
    } catch {
      if (montado.current)
        setErro("Não foi possível abrir o arquivo. Tente novamente.");
    }
  };

  const escolherArquivo = () => {
    if (ocupado.current) return;
    setErro("");
    if (formato === "digital") {
      void escolherPdf();
      return;
    }
    Alert.alert(frenteCnh ? "Verso da CNH" : "Escolher imagem", undefined, [
      { text: "Tirar foto", onPress: () => void escolherFoto(true) },
      { text: "Álbum de fotos", onPress: () => void escolherFoto(false) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={voltar}
    >
      <StatusBar style="dark" />
      <View
        style={[
          s.tela,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={s.header}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            hitSlop={10}
            onPress={voltar}
            disabled={enviando}
          >
            <Ionicons name="chevron-back" size={23} color="#242424" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Fechar envio de documentos"
            hitSlop={10}
            onPress={fechar}
            disabled={enviando}
          >
            <Ionicons name="close" size={22} color="#242424" />
          </TouchableOpacity>
          <Text style={s.headerTitulo}>Enviar documentos</Text>
        </View>
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={s.conteudo}
          showsVerticalScrollIndicator={false}
        >
          {etapa === "documentos" && (
            <>
              <Text style={s.subtitulo}>
                Selecione o documento que deseja enviar
              </Text>
              {DOCUMENTOS.map((item) => {
                const selecionado = tipo === item.tipo;

                return (
                  <TouchableOpacity
                    key={item.tipo}
                    style={s.documentoLinha}
                    onPress={() => {
                      setErro("");
                      setTipo(item.tipo);
                      setFormato(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selecionado }}
                  >
                    <MaterialCommunityIcons
                      name={item.icone}
                      color="#222"
                      size={34}
                      style={s.iconeDocumento}
                    />
                    <View style={s.flex}>
                      <Text style={s.opcaoTitulo}>{item.titulo}</Text>
                    </View>
                    <View style={[s.radio, selecionado && s.radioSelecionado]}>
                      {selecionado && <View style={s.radioCentro} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          {etapa === "formato" && documento && (
            <>
              <Text style={s.titulo}>Faça o envio {documento.nome}</Text>
              <Text style={[s.paragrafo, s.introducao]}>
                Aceitamos o envio do documento físico, em foto, e também
                digital, em PDF
              </Text>
              {(["fisico", "digital"] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    s.opcaoDocumento,
                    formato === item && s.opcaoDocumentoAtiva,
                  ]}
                  onPress={() => {
                    setFormato(item);
                    setErro("");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formato === item }}
                >
                  <View style={s.miniDocumento}>
                    <Ionicons
                      name={
                        item === "digital"
                          ? "phone-portrait-outline"
                          : "camera-outline"
                      }
                      size={34}
                      color="#555"
                    />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.opcaoTitulo}>
                      {item === "fisico"
                        ? "Documento físico"
                        : "Documento digital\n(somente PDF)"}
                    </Text>
                    <Text style={s.legenda}>
                      Selecione esta opção se você tiver {documento.nome}{" "}
                      {item === "fisico" ? "físico" : "digital em PDF"}
                    </Text>
                  </View>
                  {formato === item && (
                    <View style={s.canto}>
                      <Ionicons
                        name="checkmark"
                        color="#FFF"
                        size={20}
                        style={s.checkCanto}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
          {etapa === "requisitos" && documento && formato && (
            <>
              <Text style={s.titulo}>
                {formato === "fisico" ? "Foto" : "PDF"} {documento.titulo}
              </Text>
              <View style={s.destaque}>
                <MaterialCommunityIcons
                  name={documento.icone}
                  size={64}
                  color="#777"
                />
              </View>
              <Text style={s.secao}>Requisitos de envio</Text>
              {documento.requisitos[formato].map((texto, indice) => (
                <Text key={texto} style={s.paragrafo}>
                  {indice + 1}. {texto}
                </Text>
              ))}
              {frenteCnh && (
                <View style={s.retorno} accessibilityLiveRegion="polite">
                  <Text style={s.retornoTitulo}>Frente da CNH pronta</Text>
                  <Text style={s.paragrafo}>
                    Agora envie a foto do verso da CNH para concluir.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        {erro ? (
          <View style={s.avisoErro} accessibilityRole="alert">
            <Text style={s.erro}>{erro}</Text>
          </View>
        ) : null}
        <View style={s.rodape}>
          <TouchableOpacity
            disabled={semEscolha || enviando}
            style={[s.botao, (semEscolha || enviando) && s.botaoDesabilitado]}
            onPress={
              etapa === "documentos"
                ? () => setEtapa("formato")
                : etapa === "formato"
                  ? () => setEtapa("requisitos")
                  : escolherArquivo
            }
          >
            {enviando ? (
              <ActivityIndicator color="#222" />
            ) : (
              <Text
                style={[s.botaoTexto, semEscolha && s.botaoTextoDesabilitado]}
              >
                {etapa !== "requisitos"
                  ? "Próximo"
                  : frenteCnh
                    ? "Enviar verso da CNH"
                    : formato === "digital"
                      ? "Enviar PDF"
                      : tipo === "cnh"
                        ? "Enviar frente da CNH"
                        : "Enviar foto"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#FFF" },
  flex: { flex: 1 },
  muted: { color: "#909090" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 13,
  },
  headerTitulo: { fontSize: 16, fontWeight: "600", color: "#202020", flex: 1 },
  scroll: { flex: 1 },
  conteudo: { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 30 },
  titulo: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    color: "#111",
    marginBottom: 15,
  },
  paragrafo: {
    fontSize: 14,
    lineHeight: 19,
    color: "#8B8B8B",
    marginBottom: 14,
  },
  introducao: { marginBottom: 36 },
  opcaoTitulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    color: "#151515",
  },
  legenda: { fontSize: 12, lineHeight: 16, color: "#909090", marginTop: 4 },
  subtitulo: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
    color: "#111",
    marginBottom: 22,
  },
  documentoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 21,
    minHeight: 100,
    paddingVertical: 15,
  },
  iconeDocumento: { width: 55, textAlign: "center" },
  radio: {
    height: 19,
    width: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelecionado: { borderWidth: 5, borderColor: "#111" },
  radioCentro: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFF",
  },
  opcaoDocumento: {
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: "#F4F4F6",
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 17,
    marginBottom: 15,
    overflow: "hidden",
  },
  opcaoDocumentoAtiva: { backgroundColor: "#FFF3EC" },
  miniDocumento: {
    width: 45,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  canto: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 48,
    borderLeftWidth: 48,
    borderTopColor: "#FF6714",
    borderLeftColor: "transparent",
  },
  checkCanto: { position: "absolute", top: -46, right: 3 },
  destaque: {
    height: 155,
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginBottom: 22,
  },
  secao: {
    fontSize: 18,
    color: "#171717",
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 13,
  },
  rodape: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },
  botao: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#FFDC00",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  botaoTexto: { fontSize: 16, fontWeight: "700", color: "#111" },
  botaoDesabilitado: { backgroundColor: "#F3F3F5" },
  botaoTextoDesabilitado: { color: "#CFCFD3" },
  avisoErro: {
    backgroundColor: "#FFF1F1",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  erro: { color: "#B52C38", fontSize: 14 },
  retorno: {
    padding: 16,
    marginTop: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
  },
  retornoTitulo: { fontWeight: "600", fontSize: 16, marginBottom: 8 },
});
