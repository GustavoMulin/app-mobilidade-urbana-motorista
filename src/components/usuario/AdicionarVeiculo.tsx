import { api, mensagemDaApi } from "@/Services/api";
import type { CadastroMotorista } from "@/hooks/useCadastroMotorista";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IlustracaoDocumento,
  IlustracaoErro,
} from "./IlustracoesCadastroVeiculo";

type Etapa = "veiculo" | "servico" | "documentos" | "formato" | "requisitos";
type Categoria = "carro" | "moto";
type Formato = "fisico" | "digital";
interface Arquivo {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
interface Solicitacao {
  id: number;
  status: string;
  name: string;
  motivo_reprovacao_texto?: string | null;
  solicitacao_veiculo: {
    categoria: Categoria;
    formato: Formato;
    id_envio: string;
  };
}
interface Props {
  onClose: () => void;
  onEnviado: () => void;
}

const ERROS_FISICO = [
  "Documento desfocado",
  "Documento cortado",
  "Documento errado",
  "Documento do carro vencido",
];
const ERROS_DIGITAL = [
  "O documento não é um PDF",
  "Print da CRLV digital no celular",
  "Foto da CRLV digital impressa",
  "CRLV digital cortada",
];
const STATUS: Record<string, string> = {
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};
const novoId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export default function AdicionarVeiculo({ onClose, onEnviado }: Props) {
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState<Etapa>("veiculo");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [servico, setServico] = useState(false);
  const [formato, setFormato] = useState<Formato | null>(null);
  const [cadastro, setCadastro] = useState<CadastroMotorista | null>(null);
  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregandoCadastro, setCarregandoCadastro] = useState(false);
  const [privacidade, setPrivacidade] = useState(false);
  const [arquivoPendente, setArquivoPendente] = useState<Arquivo | null>(null);
  const ocupado = useRef(false);
  const montado = useRef(true);
  const envioId = useRef(novoId());
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

  const atualizarCadastro = useCallback(async () => {
    setCarregandoCadastro(true);
    try {
      const { data } = await api.get<CadastroMotorista>("/motorista/cadastro");
      if (montado.current) {
        setCadastro(data);
        setErro("");
      }
    } catch (falha) {
      if (montado.current)
        setErro(
          mensagemDaApi(
            falha,
            "Não foi possível consultar seus documentos. Tente novamente.",
          ),
        );
    } finally {
      if (montado.current) setCarregandoCadastro(false);
    }
  }, []);

  const solicitacaoId = solicitacao?.id;
  useEffect(() => {
    if (etapa !== "documentos") return;
    const inicio = setTimeout(() => void atualizarCadastro(), 0);
    if (!solicitacaoId) return () => clearTimeout(inicio);
    let ativo = true;
    const timer = setInterval(() => {
      void api
        .get<{ data: Solicitacao[] }>("/motorista/me/solicitacoes-veiculo")
        .then(({ data }) => {
          const atual = data.data.find((item) => item.id === solicitacaoId);
          if (ativo && atual) setSolicitacao(atual);
        })
        .catch(() => undefined);
    }, 15000);
    return () => {
      ativo = false;
      clearInterval(timer);
      clearTimeout(inicio);
    };
  }, [etapa, solicitacaoId, atualizarCadastro]);

  const voltar = () => {
    if (ocupado.current) return;
    if (privacidade) {
      setPrivacidade(false);
      return;
    }
    setErro("");
    if (etapa === "veiculo") onClose();
    else
      setEtapa(
        (
          {
            servico: "veiculo",
            documentos: "servico",
            formato: "documentos",
            requisitos: "formato",
          } as const
        )[etapa],
      );
  };
  const fechar = () => {
    if (ocupado.current) return;
    if (arquivoPendente) {
      Alert.alert(
        "Sair do cadastro?",
        "O arquivo ainda não foi enviado. Deseja sair?",
        [
          { text: "Continuar", style: "cancel" },
          { text: "Sair", style: "destructive", onPress: onClose },
        ],
      );
    } else onClose();
  };

  const enviarArquivo = async (arquivo: Arquivo) => {
    if (!montado.current || ocupado.current || !categoria || !formato) return;
    if ((arquivo.size ?? 0) > 10 * 1024 * 1024) {
      setErro("Selecione um arquivo de até 10 MB.");
      return;
    }
    const pdf =
      arquivo.mimeType === "application/pdf" || /\.pdf$/i.test(arquivo.name);
    if (formato === "digital" && !pdf) {
      setErro("O documento digital deve estar no formato PDF.");
      return;
    }
    if (formato === "fisico" && !/^image\//.test(arquivo.mimeType)) {
      setErro("Selecione uma foto do documento físico.");
      return;
    }
    ocupado.current = true;
    setArquivoPendente(arquivo);
    setEnviando(true);
    setErro("");
    try {
      const form = new FormData();
      form.append("categoria", categoria);
      form.append("tipo_solicitacao", "passageiros");
      form.append("formato", formato);
      form.append("id_envio", envioId.current);
      form.append("arquivo", {
        uri: arquivo.uri,
        name: arquivo.name,
        type: arquivo.mimeType,
      } as unknown as Blob);
      const { data } = await api.post<{ data: Solicitacao }>(
        "/motorista/me/solicitacoes-veiculo",
        form,
      );
      if (!montado.current) return;
      setSolicitacao(data.data);
      setArquivoPendente(null);
      setEtapa("documentos");
      envioId.current = novoId();
      onEnviado();
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

  const escolherFoto = async (camera: boolean) => {
    if (ocupado.current) return;
    try {
      if (camera) {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert(
            "Acesso à câmera",
            "Permita o acesso à câmera nas configurações para fotografar o CRLV.",
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
      const resultado = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
            allowsEditing: false,
          });
      if (resultado.canceled) return;
      const foto = resultado.assets[0];
      if (!foto || !montado.current) return;
      const mime = foto.mimeType || "image/jpeg";
      envioId.current = novoId();
      await enviarArquivo({
        uri: foto.uri,
        name: foto.fileName || `crlv.${mime.split("/")[1]}`,
        mimeType: mime,
        size: foto.fileSize,
      });
    } catch {
      if (montado.current)
        setErro("Não foi possível abrir as fotos. Tente novamente.");
    }
  };
  const abrirAlbum = async () => {
    const permissao = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissao.granted) setPrivacidade(true);
    else await escolherFoto(false);
  };
  const permitirAlbum = async () => {
    setPrivacidade(false);
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissao.granted) await escolherFoto(false);
      else
        Alert.alert(
          "Acesso às fotos",
          "Você pode permitir o acesso nas configurações do aparelho.",
          [
            { text: "Agora não", style: "cancel" },
            {
              text: "Abrir configurações",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
    } catch {
      setErro("Não foi possível solicitar acesso às fotos.");
    }
  };
  const escolherArquivo = async () => {
    if (ocupado.current) return;
    setErro("");
    if (formato === "fisico") {
      Alert.alert("Escolher imagem", undefined, [
        { text: "Tirar foto", onPress: () => void escolherFoto(true) },
        { text: "Álbum de fotos", onPress: () => void abrirAlbum() },
        { text: "Cancelar", style: "cancel" },
      ]);
      return;
    }
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (resultado.canceled) return;
      const file = resultado.assets[0];
      if (!file || !montado.current) return;
      envioId.current = novoId();
      await enviarArquivo({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || "application/pdf",
        size: file.size,
      });
    } catch {
      if (montado.current)
        setErro("Não foi possível abrir o arquivo. Tente novamente.");
    }
  };

  const cnh = cadastro?.documentos.find((doc) => doc.tipo_documento === "cnh");
  const cnhAprovada = cnh?.status === "aprovado" && cadastro?.cnh?.ear === true;
  const proximo = () => {
    setErro("");
    if (etapa === "veiculo" && categoria) setEtapa("servico");
    else if (etapa === "servico" && servico) setEtapa("documentos");
    else if (etapa === "formato" && formato) setEtapa("requisitos");
  };
  const habilitado =
    etapa === "veiculo"
      ? !!categoria
      : etapa === "servico"
        ? servico
        : etapa === "formato"
          ? !!formato
          : true;
  const titulo =
    etapa === "veiculo" || etapa === "servico"
      ? "Adicionar veículo"
      : "Enviar documentos";

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
            accessibilityLabel="Fechar cadastro de veículo"
            hitSlop={10}
            onPress={fechar}
            disabled={enviando}
          >
            <Ionicons name="close" size={22} color="#242424" />
          </TouchableOpacity>
          <Text style={s.headerTitulo}>{titulo}</Text>
        </View>
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={s.conteudo}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {etapa === "veiculo" && (
            <>
              <Text style={s.subtitulo}>Adicione seu veículo</Text>
              {(["moto", "carro"] as const).map((tipo) => (
                <OpcaoVeiculo
                  key={tipo}
                  tipo={tipo}
                  selecionado={categoria === tipo}
                  onPress={() => {
                    setCategoria(tipo);
                    setServico(false);
                  }}
                />
              ))}
            </>
          )}
          {etapa === "servico" && (
            <>
              <Text style={s.subtitulo}>
                Selecione o tipo de solicitação que deseja aceitar
              </Text>
              <OpcaoVeiculo
                tipo={categoria || "carro"}
                selecionado={servico}
                titulo="Corridas com passageiros"
                descricao={`Eu tenho ${categoria === "moto" ? "uma moto" : "um carro"} e quero fazer corridas`}
                onPress={() => setServico(true)}
              />
            </>
          )}
          {etapa === "documentos" && (
            <>
              <TouchableOpacity
                style={s.documentoLinha}
                onPress={() => {
                  setErro("");
                  setEtapa("formato");
                }}
              >
                <MaterialCommunityIcons
                  name={
                    solicitacao?.status === "aprovado"
                      ? "check-circle-outline"
                      : "file-document-plus-outline"
                  }
                  color={
                    solicitacao?.status === "aprovado" ? "#27AF93" : "#222"
                  }
                  size={25}
                />
                <View style={s.flex}>
                  <Text style={s.documentoTitulo}>
                    CRLV (documento do veículo)
                  </Text>
                  {solicitacao && (
                    <Text
                      style={[
                        s.legenda,
                        solicitacao.status === "reprovado" && s.textoErro,
                      ]}
                    >
                      {STATUS[solicitacao.status] || solicitacao.status}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={17} color="#222" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.documentoLinha}
                onPress={() =>
                  Alert.alert(
                    "CNH com EAR",
                    carregandoCadastro
                      ? "Consultando seu cadastro…"
                      : cnhAprovada
                        ? "Sua CNH com EAR está aprovada."
                        : `${cnh ? STATUS[cnh.status] || cnh.status : "Documento não enviado"}. Confira sua CNH e a observação EAR na área de cadastro do motorista.`,
                  )
                }
              >
                <Ionicons
                  name={
                    cnhAprovada
                      ? "checkmark-circle-outline"
                      : "document-text-outline"
                  }
                  size={25}
                  color={cnhAprovada ? "#27AF93" : "#555"}
                />
                <View style={s.flex}>
                  <Text style={[s.documentoTitulo, cnhAprovada && s.muted]}>
                    CNH com EAR
                  </Text>
                  <Text style={s.legenda}>
                    {carregandoCadastro
                      ? "Consultando…"
                      : cnhAprovada
                        ? "Aprovado"
                        : cnh
                          ? STATUS[cnh.status] || cnh.status
                          : "Não enviado"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#222" />
              </TouchableOpacity>
              {solicitacao && (
                <View style={s.retorno} accessibilityLiveRegion="polite">
                  <Text style={s.retornoTitulo}>
                    {solicitacao.status === "em_analise"
                      ? "Documento enviado"
                      : `CRLV ${STATUS[solicitacao.status]?.toLowerCase() || solicitacao.status}`}
                  </Text>
                  <Text style={s.paragrafo}>
                    {solicitacao.status === "em_analise"
                      ? "A gestão recebeu seu CRLV. O novo veículo ficará disponível após a conferência e aprovação."
                      : solicitacao.status === "reprovado"
                        ? solicitacao.motivo_reprovacao_texto ||
                          "Confira o documento e envie uma nova foto ou PDF."
                        : "Seu veículo foi aprovado pela gestão."}
                  </Text>
                </View>
              )}
            </>
          )}
          {etapa === "formato" && (
            <>
              <Text style={s.titulo}>Faça o envio do seu CRLV</Text>
              <Text style={[s.paragrafo, s.introducao]}>
                Agora aceitamos o envio do documento físico e também digital, em
                PDF
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
                    setArquivoPendente(null);
                    setErro("");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formato === item }}
                >
                  <View style={s.miniDocumento}>
                    <IlustracaoDocumento digital={item === "digital"} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.opcaoTitulo}>
                      {item === "fisico"
                        ? "Documento físico"
                        : "Documento digital\n(somente PDF)"}
                    </Text>
                    <Text style={s.legenda}>
                      Selecione esta opção se você tiver o CRLV{" "}
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
          {etapa === "requisitos" && (
            <>
              <Text style={s.titulo}>
                {formato === "fisico" ? "Foto CRLV" : "CRLV"}
                {"\n"}(documento {categoria === "moto" ? "da moto" : "do carro"}
                )
              </Text>
              <View style={s.documentoDestaque}>
                <IlustracaoDocumento digital={formato === "digital"} />
              </View>
              <Text style={s.secao}>Requisitos de envio</Text>
              <Text style={s.paragrafo}>
                1. O documento {categoria === "moto" ? "da moto" : "do carro"}{" "}
                deve estar dentro do prazo de validade.
              </Text>
              <Text style={s.paragrafo}>
                {formato === "digital"
                  ? "2. Nos envie o documento no formato PDF."
                  : "2. Nos envie somente a primeira página do documento. Mas lembre-se de que os dados precisam estar legíveis."}
              </Text>
              <Text style={s.secao}>Como obter os documentos</Text>
              <Text style={s.paragrafo}>
                {formato === "digital"
                  ? "Para obter o documento digital, siga estas instruções:\nSe o veículo estiver em seu nome, obtenha o arquivo PDF do CRLV digital pelo Detran ou pelo aplicativo oficial de documentos de trânsito."
                  : "Se você já possui o CRLV físico, fotografe a primeira página inteira, de frente, com boa iluminação e sem reflexos. Para obter o CRLV digital, selecione essa opção no nosso app."}
              </Text>
              {formato === "digital" && (
                <Text style={s.paragrafo}>
                  Se o veículo não estiver em seu nome, solicite ao proprietário
                  que envie o documento digital a você, no formato PDF.
                </Text>
              )}
              <TouchableOpacity
                onPress={() =>
                  void Linking.openURL(
                    "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-senatran",
                  ).catch(() => setErro("Não foi possível abrir o site."))
                }
              >
                <Text style={s.link}>Clique aqui para acessar o site</Text>
              </TouchableOpacity>
              <Text style={s.secao}>Erros comuns a serem evitados</Text>
              <View style={s.grade}>
                {(formato === "digital" ? ERROS_DIGITAL : ERROS_FISICO).map(
                  (label, index) => (
                    <View key={label} style={s.exemplo}>
                      <View style={s.exemploImagem}>
                        <IlustracaoErro
                          digital={formato === "digital"}
                          indice={index}
                        />
                      </View>
                      <View style={s.erroLinha}>
                        <Ionicons
                          name="close-circle"
                          color="#D65170"
                          size={13}
                        />
                        <Text style={s.exemploLegenda}>{label}</Text>
                      </View>
                    </View>
                  ),
                )}
              </View>
            </>
          )}
        </ScrollView>
        {erro ? (
          <View style={s.avisoErro} accessibilityRole="alert">
            <Text style={s.textoErro}>{erro}</Text>
            {etapa === "documentos" && (
              <TouchableOpacity onPress={() => void atualizarCadastro()}>
                <Text style={s.link}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        {etapa !== "documentos" && (
          <View style={s.rodape}>
            <TouchableOpacity
              disabled={!habilitado || enviando}
              style={[
                s.botao,
                (!habilitado || enviando) && s.botaoDesabilitado,
              ]}
              onPress={
                etapa === "requisitos"
                  ? () => {
                      if (ocupado.current) return;
                      if (arquivoPendente) {
                        setArquivoPendente(null);
                        setErro("");
                        return;
                      }
                      void escolherArquivo();
                    }
                  : proximo
              }
            >
              {enviando ? (
                <ActivityIndicator color="#222" />
              ) : (
                <Text
                  style={[
                    s.botaoTexto,
                    !habilitado && s.botaoTextoDesabilitado,
                  ]}
                >
                  {etapa === "servico"
                    ? "Confirmar"
                    : etapa === "requisitos"
                      ? arquivoPendente
                        ? "Tentar enviar novamente"
                        : formato === "digital"
                          ? "Enviar PDF"
                          : "Enviar foto"
                      : "Próximo"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        {privacidade && (
          <View style={s.privacidadeOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPrivacidade(false)}
              accessibilityLabel="Fechar aviso de privacidade"
            />
            <View
              style={[
                s.privacidade,
                { paddingBottom: Math.max(insets.bottom, 18) },
              ]}
            >
              <Text style={s.privacidadeTitulo}>Política de Privacidade</Text>
              <View style={s.privacidadeTexto}>
                <Ionicons name="images" size={25} color="#777" />
                <View style={s.flex}>
                  <Text style={s.permissaoTitulo}>
                    Permissão para acessar o álbum de fotos
                  </Text>
                  <Text style={s.legenda}>
                    O aplicativo precisa de acesso à foto que você selecionar
                    para enviar o documento à gestão.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.botao}
                onPress={() => void permitirAlbum()}
              >
                <Text style={s.botaoTexto}>Permitir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.botao, s.agoraNao]}
                onPress={() => setPrivacidade(false)}
              >
                <Text style={s.agoraNaoTexto}>Agora não</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function OpcaoVeiculo({
  tipo,
  selecionado,
  onPress,
  titulo,
  descricao,
}: {
  tipo: Categoria;
  selecionado: boolean;
  onPress: () => void;
  titulo?: string;
  descricao?: string;
}) {
  return (
    <TouchableOpacity
      style={s.opcaoVeiculo}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
    >
      <Image
        source={
          tipo === "carro"
            ? require("../../../assets/images/cadastro-veiculo/carro.png")
            : require("../../../assets/images/cadastro-veiculo/moto.png")
        }
        style={{ width: 55, height: 53 }}
        resizeMode="contain"
        accessible={false}
      />
      <View style={s.flex}>
        <Text style={s.opcaoTitulo}>
          {titulo || (tipo === "carro" ? "Carro" : "Moto")}
        </Text>
        {descricao && <Text style={s.legenda}>{descricao}</Text>}
      </View>
      <View style={[s.radio, selecionado && s.radioSelecionado]}>
        {selecionado && <View style={s.radioCentro} />}
      </View>
    </TouchableOpacity>
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
  subtitulo: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
    color: "#111",
    marginBottom: 22,
  },
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
  opcaoVeiculo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 21,
    minHeight: 100,
    paddingVertical: 15,
  },
  opcaoTitulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    color: "#151515",
  },
  legenda: { fontSize: 12, lineHeight: 16, color: "#909090", marginTop: 4 },
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
  documentoLinha: {
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  documentoTitulo: { fontSize: 15, fontWeight: "600", color: "#222" },
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
  miniDocumento: { width: 45, height: 64 },
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
  documentoDestaque: {
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
  link: { fontSize: 14, color: "#202020", textDecorationLine: "underline" },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  exemplo: { width: "47%" },
  exemploImagem: {
    height: 122,
    borderRadius: 12,
    backgroundColor: "#A2ABB9",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  erroLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
    marginTop: 6,
  },
  exemploLegenda: { color: "#CA5A74", fontSize: 12, lineHeight: 15, flex: 1 },
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
    gap: 8,
  },
  textoErro: { color: "#B52C38", fontSize: 14 },
  retorno: {
    padding: 16,
    marginTop: 24,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
  },
  retornoTitulo: { fontWeight: "600", fontSize: 16, marginBottom: 8 },
  privacidadeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0009",
    justifyContent: "flex-end",
  },
  privacidade: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    gap: 12,
  },
  privacidadeTitulo: { fontWeight: "700", fontSize: 18, marginBottom: 8 },
  privacidadeTexto: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
    marginBottom: 30,
  },
  permissaoTitulo: { fontSize: 12, fontWeight: "700" },
  agoraNao: { backgroundColor: "#F3F3F5" },
  agoraNaoTexto: { color: "#666", fontSize: 14, fontWeight: "600" },
});
