// CODEX: 0 linhas alteradas; adapta cadastro de veículos a teclado, largura e rotação. Remover após validação ou commit.
import AdicionarVeiculo from "./AdicionarVeiculo";
import { api } from "@/Services/api";
import { Text, TextInput } from "@/components/common/Texto";
import { useToast } from "@/context/ToastContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  disponivel: boolean;
  emCorrida: boolean;
  onVeiculoSelecionado?: (veiculo: Pick<Veiculo, "placa" | "modelo">) => void;
}

interface Veiculo {
  id: number;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor: string;
  placa: string;
  renavam: string;
  categoria: "carro" | "moto";
  // aprovados pela gestão; os "_solicitado" são o pedido em análise
  eletrico?: boolean;
  taxi?: boolean;
  eletrico_solicitado?: boolean;
  taxi_solicitado?: boolean;
  status: string;
  pode_selecionar?: boolean;
  categorias_servico?: { id: number; codigo: string; nome: string }[];
  uf: string;
}

interface ContextoSelecao {
  veiculo_ativo_id: number | null;
  pode_trocar_veiculo: boolean;
}

type ResumoVeiculo = Partial<Veiculo> & Pick<Veiculo, "categoria" | "status">;

interface SolicitacaoVeiculo {
  id: number;
  veiculo_id: number | null;
  status: string;
  solicitacao_veiculo: { categoria: Veiculo["categoria"] };
  informacoes_complementares: {
    placa?: string | null;
    marca_modelo?: string | null;
    cor?: string | null;
    ano_modelo?: number | string | null;
    uf?: string | null;
  } | null;
}

const resumoDaSolicitacao = (
  solicitacao: SolicitacaoVeiculo,
): ResumoVeiculo => {
  const dados = solicitacao.informacoes_complementares;
  const [marca, ...modelo] = (dados?.marca_modelo || "").split("/");
  return {
    categoria: solicitacao.solicitacao_veiculo.categoria,
    status: "em_analise",
    placa: dados?.placa || undefined,
    marca: marca.trim() || undefined,
    modelo: modelo.join("/").trim() || undefined,
    cor: dados?.cor || undefined,
    ano_modelo: Number(dados?.ano_modelo) || undefined,
    uf: dados?.uf || undefined,
  };
};

const rotuloStatus: Record<string, string> = {
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  ativo: "Ativo",
};

interface FormularioVeiculo {
  marca: string;
  modelo: string;
  ano_fabricacao: string;
  ano_modelo: string;
  cor: string;
  placa: string;
  renavam: string;
  // dono no CRLV: obrigatório para ficar online e para compartilhar o veículo
  cpf_cnpj_proprietario: string;
  categoria: Veiculo["categoria"];
  eletrico: boolean;
  taxi: boolean;
  uf: string;
}

// 000.000.000-00 (CPF) ou 00.000.000/0000-00 (CNPJ), conforme os dígitos
const formatarCpfCnpj = (texto: string) => {
  const d = texto.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const ANO_ATUAL = new Date().getFullYear();
const FORMULARIO_INICIAL: FormularioVeiculo = {
  marca: "",
  modelo: "",
  ano_fabricacao: String(ANO_ATUAL),
  ano_modelo: String(ANO_ATUAL),
  cor: "",
  placa: "",
  renavam: "",
  cpf_cnpj_proprietario: "",
  categoria: "carro",
  eletrico: false,
  taxi: false,
  uf: "RO",
};

const rotuloCategoria: Record<Veiculo["categoria"], string> = {
  carro: "Carro",
  moto: "Moto",
};

// categorias de corrida que o veículo recebe: Elétrico (só carro) e Táxi
// valem depois que a gestão aprova o pedido
const rotuloDoVeiculo = (veiculo: ResumoVeiculo) =>
  [
    rotuloCategoria[veiculo.categoria] ?? veiculo.categoria,
    veiculo.eletrico
      ? "Elétrico"
      : veiculo.eletrico_solicitado
        ? "Elétrico em análise"
        : null,
    veiculo.taxi ? "Táxi" : veiculo.taxi_solicitado ? "Táxi em análise" : null,
  ]
    .filter(Boolean)
    .join(" · ");

const mensagemDoErro = (erro: unknown) => {
  if (!erro || typeof erro !== "object" || !("response" in erro)) {
    return "Não foi possível carregar seus veículos. Verifique sua conexão e tente novamente.";
  }

  const resposta = (
    erro as {
      response?: {
        data?: { message?: string; errors?: Record<string, string[]> };
      };
    }
  ).response?.data;
  const primeiraValidacao = resposta?.errors
    ? Object.values(resposta.errors).flat()[0]
    : undefined;

  return (
    primeiraValidacao ??
    resposta?.message ??
    "Não foi possível salvar o veículo."
  );
};

type ErrosDosCampos = Partial<Record<keyof FormularioVeiculo, string>>;

// o servidor manda todos os campos com problema de uma vez: cada mensagem
// aparece embaixo do seu campo (antes só a primeira, lá no fim do formulário)
const errosDosCampos = (erro: unknown): ErrosDosCampos => {
  const errors = (
    erro as {
      response?: { data?: { errors?: Record<string, string[]> } };
    } | null
  )?.response?.data?.errors;

  if (!errors) return {};

  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensagens]) => [campo, mensagens[0]]),
  ) as ErrosDosCampos;
};

export default function MeusVeiculos({
  visible,
  onClose,
  duration = 200,
  disponivel,
  emCorrida,
  onVeiculoSelecionado,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoVeiculo[]>([]);
  const [veiculoAtivoId, setVeiculoAtivoId] = useState<number | null>(null);
  const [podeTrocar, setPodeTrocar] = useState(false);
  const [selecionandoId, setSelecionandoId] = useState<number | null>(null);
  const trocandoVeiculo = useRef(false);
  const listaRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [detalhandoId, setDetalhandoId] = useState<number | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [formulario, setFormulario] =
    useState<FormularioVeiculo>(FORMULARIO_INICIAL);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosDosCampos>({});
  const [sucesso, setSucesso] = useState<string | null>(null);
  const { mostrarToast } = useToast();

  useEffect(() => {
    if (!sucesso) return;
    const timer = setTimeout(() => setSucesso(null), 5000);
    return () => clearTimeout(timer);
  }, [sucesso]);

  const carregarVeiculos = useCallback(async (manterLista = false) => {
    if (!manterLista) setCarregando(true);
    setErro(null);
    setSucesso(null);

    // a primeira leitura logo depois de abrir o app às vezes falha sem
    // resposta: tenta mais uma vez antes de mostrar o erro
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const [cadastrados, enviados] = await Promise.all([
          api.get<ContextoSelecao & { data: Veiculo[] }>(
            "/motorista/me/veiculos",
            {
              params: { incluir_em_analise: true },
            },
          ),
          api.get<{ data: SolicitacaoVeiculo[] }>(
            "/motorista/me/solicitacoes-veiculo",
          ),
        ]);
        setVeiculos(cadastrados.data.data ?? []);
        setVeiculoAtivoId(cadastrados.data.veiculo_ativo_id ?? null);
        setPodeTrocar(cadastrados.data.pode_trocar_veiculo === true);
        setSolicitacoes(
          (enviados.data.data ?? []).filter(
            (solicitacao) =>
              solicitacao.status === "em_analise" && !solicitacao.veiculo_id,
          ),
        );
        setCarregando(false);
        return;
      } catch (falha) {
        const semResposta =
          (falha as { response?: unknown } | null)?.response === undefined;

        if (tentativa === 0 && semResposta) {
          await new Promise((resolver) => setTimeout(resolver, 800));
          continue;
        }

        setErro(mensagemDoErro(falha));
      }
    }

    setCarregando(false);
  }, []);

  const atualizarVeiculos = useCallback(async () => {
    if (trocandoVeiculo.current) return;
    setAtualizando(true);
    try {
      await carregarVeiculos(true);
    } finally {
      setAtualizando(false);
    }
  }, [carregarVeiculos]);

  useEffect(() => {
    // A abertura do drawer é o evento que inicia a leitura remota.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) void carregarVeiculos();
  }, [carregarVeiculos, visible, disponivel, emCorrida]);

  const selecionarVeiculo = async (veiculo: Veiculo) => {
    if (
      trocandoVeiculo.current ||
      carregando ||
      atualizando ||
      !podeTrocar ||
      disponivel ||
      emCorrida ||
      veiculo.status !== "aprovado" ||
      !veiculo.pode_selecionar ||
      veiculo.id === veiculoAtivoId
    )
      return;
    trocandoVeiculo.current = true;
    setSelecionandoId(veiculo.id);
    // o loading fica no card do veículo em uso, no topo
    listaRef.current?.scrollTo({ y: 0, animated: true });
    setErro(null);
    setSucesso(null);
    try {
      const { data } = await api.put<
        ContextoSelecao & { data: Veiculo; message: string }
      >("/motorista/me/veiculo-ativo", { veiculo_id: veiculo.id });
      setVeiculoAtivoId(data.veiculo_ativo_id);
      setPodeTrocar(data.pode_trocar_veiculo);
      mostrarToast({
        tipo: "success",
        icone: "car-sport",
        translucido: true,
        titulo: data.message,
        chave: `veiculo-em-uso:${veiculo.id}`,
      });
      onVeiculoSelecionado?.(data.data);
    } catch (falha) {
      const mensagem = mensagemDoErro(falha);
      // Reconsultar evita deixar a seleção liberada se outra sessão conectou.
      await carregarVeiculos(true);
      setErro(mensagem);
    } finally {
      trocandoVeiculo.current = false;
      setSelecionandoId(null);
    }
  };

  const removerVeiculo = async (veiculo: Veiculo) => {
    if (removendo) return;
    setRemovendo(true);
    try {
      const { data } = await api.delete<ContextoSelecao & { message: string }>(
        `/motorista/me/veiculos/${veiculo.id}`,
      );
      setVeiculos((atuais) => atuais.filter((item) => item.id !== veiculo.id));
      setVeiculoAtivoId(data.veiculo_ativo_id);
      setPodeTrocar(data.pode_trocar_veiculo);
      setDetalhandoId(null);
      mostrarToast({
        tipo: "success",
        icone: "trash",
        translucido: true,
        titulo: data.message,
        chave: `veiculo-removido:${veiculo.id}`,
      });
    } catch (falha) {
      mostrarToast({
        tipo: "error",
        titulo: mensagemDoErro(falha),
        chave: `veiculo-removido-erro:${veiculo.id}`,
      });
      // a situação pode ter mudado (ficou online, entrou em corrida)
      await carregarVeiculos(true);
    } finally {
      setRemovendo(false);
    }
  };

  const confirmarRemocao = (veiculo: Veiculo) => {
    Alert.alert(
      "Remover veículo?",
      `${veiculo.placa} deixará de aparecer nos seus veículos. Para usá-lo de novo, será preciso cadastrá-lo outra vez.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => void removerVeiculo(veiculo),
        },
      ],
    );
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!visible) return false;
        if (detalhandoId !== null) {
          setDetalhandoId(null);
        } else if (mostrandoFormulario) {
          setMostrandoFormulario(false);
          setErro(null);
        } else {
          onClose();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [detalhandoId, mostrandoFormulario, onClose, visible]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (visible) {
      timer = setTimeout(() => setIsMounted(true), 0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: width,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => finished && setIsMounted(false));
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [duration, overlayOpacity, translateX, visible, width]);

  const enviar = async (dados: FormularioVeiculo) => {
    setSalvando(true);
    setErro(null);
    setErros({});
    setSucesso(null);
    try {
      const { data } = await api.post<{ data: Veiculo; message: string }>(
        "/motorista/me/veiculos",
        {
          ...dados,
          ano_fabricacao: Number(dados.ano_fabricacao),
          ano_modelo: Number(dados.ano_modelo),
        },
      );
      setVeiculos((atuais) => [data.data, ...atuais]);
      setFormulario(FORMULARIO_INICIAL);
      setMostrandoFormulario(false);
      setSucesso(data.message ?? "Veículo adicionado com sucesso.");
    } catch (falha) {
      const porCampo = errosDosCampos(falha);
      setErros(porCampo);
      setErro(
        Object.keys(porCampo).length > 0
          ? "Confira os campos em vermelho."
          : mensagemDoErro(falha),
      );
    } finally {
      setSalvando(false);
    }
  };

  if (!isMounted) return null;

  const veiculoSelecionado = veiculos.find(
    (veiculo) =>
      veiculo.id === veiculoAtivoId && veiculo.pode_selecionar === true,
  );

  const outrosVeiculos = veiculos
    .filter((veiculo) => veiculo.id !== veiculoSelecionado?.id)
    .sort(
      (a, b) =>
        Number(a.status === "em_analise") - Number(b.status === "em_analise"),
    );

  const veiculoDetalhe =
    detalhandoId === null
      ? undefined
      : veiculos.find((veiculo) => veiculo.id === detalhandoId);

  const podeSelecionarVeiculo = (veiculo: Veiculo) =>
    podeTrocar &&
    !disponivel &&
    !emCorrida &&
    !atualizando &&
    selecionandoId === null &&
    !removendo &&
    veiculo.status === "aprovado" &&
    veiculo.pode_selecionar === true;

  const atualizar = <Campo extends keyof FormularioVeiculo>(
    campo: Campo,
    valor: FormularioVeiculo[Campo],
  ) => {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
      // não existe moto elétrica
      ...(campo === "categoria" && valor === "moto" ? { eletrico: false } : {}),
    }));
    // corrigiu o campo: a mensagem dele sai
    setErros((atuais) =>
      atuais[campo] ? { ...atuais, [campo]: undefined } : atuais,
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.camada]}>
      {adicionando && (
        <AdicionarVeiculo
          onClose={() => {
            setAdicionando(false);
            void carregarVeiculos();
          }}
          onEnviado={() => {
            setAdicionando(false);
            setMostrandoFormulario(false);
            void carregarVeiculos();
            setSucesso("Documento enviado. Seu veículo está em análise.");
          }}
        />
      )}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          setDetalhandoId(null);
          onClose();
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 40) }]}
        >
          <TouchableOpacity
            onPress={() => {
              if (veiculoDetalhe) {
                setDetalhandoId(null);
              } else if (mostrandoFormulario) {
                setMostrandoFormulario(false);
                setErro(null);
              } else onClose();
            }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back-outline" size={25} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {veiculoDetalhe
              ? "Detalhes do veículo"
              : mostrandoFormulario
                ? "Adicionar veículo"
                : "Meus veículos"}
          </Text>
          <View style={styles.espacoHeader} />
        </View>

        {veiculoDetalhe ? (
          <DetalhesVeiculo
            veiculo={veiculoDetalhe}
            ativo={veiculoDetalhe.id === veiculoAtivoId}
            podeUsar={podeSelecionarVeiculo(veiculoDetalhe)}
            podeRemover={!disponivel && !emCorrida && !removendo}
            removendo={removendo}
            insetsBottom={insets.bottom}
            onUsar={() => {
              setDetalhandoId(null);
              void selecionarVeiculo(veiculoDetalhe);
            }}
            onRemover={() => confirmarRemocao(veiculoDetalhe)}
          />
        ) : mostrandoFormulario ? (
          <Formulario
            dados={formulario}
            erro={erro}
            erros={erros}
            salvando={salvando}
            insetsBottom={insets.bottom}
            onAtualizar={atualizar}
            onSalvar={() => void enviar(formulario)}
          />
        ) : (
          <View style={styles.conteudoLista}>
            {sucesso ? <Text style={styles.sucesso}>{sucesso}</Text> : null}
            {carregando ? (
              <View style={styles.estadoCentral}>
                <ActivityIndicator color="#111" size="large" />
                <Text style={styles.estadoTexto}>Carregando veículos...</Text>
              </View>
            ) : (
              <ScrollView
                ref={listaRef}
                contentContainerStyle={styles.lista}
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical
                refreshControl={
                  <RefreshControl
                    refreshing={atualizando}
                    onRefresh={() => void atualizarVeiculos()}
                    tintColor="#FF9800"
                    colors={["#FF9800"]}
                  />
                }
              >
                {veiculoSelecionado ? (
                  <DestaqueVeiculo
                    key={veiculoSelecionado.id}
                    veiculo={veiculoSelecionado}
                    carregando={selecionandoId !== null}
                    onAbrir={() => setDetalhandoId(veiculoSelecionado.id)}
                  />
                ) : veiculos.length > 0 ? (
                  <Text style={styles.orientacaoSelecao}>
                    Selecione um veículo aprovado para ver seus dados aqui.
                  </Text>
                ) : null}
                <Text style={styles.listaTitulo}>Outros veículos</Text>
                {outrosVeiculos.length > 0 || solicitacoes.length > 0 ? (
                  <Text style={styles.orientacaoSelecao}>
                    {disponivel || emCorrida || !podeTrocar
                      ? "Para trocar o veículo, fique desconectado e sem corrida em andamento."
                      : "Toque em um veículo aprovado para usá-lo nas próximas corridas."}
                  </Text>
                ) : null}
                {erro ? (
                  <View style={styles.erroAtualizacao}>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={36}
                      color="#777"
                    />
                    <Text style={styles.estadoTexto}>{erro}</Text>
                    <TouchableOpacity
                      style={styles.botaoSecundario}
                      onPress={() => void atualizarVeiculos()}
                      disabled={atualizando}
                    >
                      <Text style={styles.botaoSecundarioTexto}>
                        Tentar novamente
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {veiculos.length === 0 && solicitacoes.length === 0 && !erro ? (
                  <View style={styles.vazio}>
                    <Ionicons name="car-sport-outline" size={48} color="#999" />
                    <Text style={styles.vazioTitulo}>
                      Nenhum veículo cadastrado
                    </Text>
                    <Text style={styles.vazioTexto}>
                      Os veículos vinculados ao seu cadastro aparecerão aqui.
                    </Text>
                  </View>
                ) : (
                  <>
                    {outrosVeiculos.map((veiculo) => (
                      <CartaoVeiculo
                        key={`veiculo-${veiculo.id}`}
                        veiculo={veiculo}
                        ativo={veiculo.id === veiculoAtivoId}
                        podeSelecionar={podeSelecionarVeiculo(veiculo)}
                        selecionando={selecionandoId === veiculo.id}
                        onSelecionar={() => void selecionarVeiculo(veiculo)}
                        onAbrir={() => setDetalhandoId(veiculo.id)}
                      />
                    ))}
                    {solicitacoes.map((solicitacao) => (
                      <CartaoVeiculo
                        key={`solicitacao-${solicitacao.id}`}
                        veiculo={resumoDaSolicitacao(solicitacao)}
                        ativo={false}
                      />
                    ))}
                    {outrosVeiculos.length === 0 &&
                    solicitacoes.length === 0 &&
                    !erro ? (
                      <Text style={styles.orientacaoSelecao}>
                        Você não possui outros veículos cadastrados.
                      </Text>
                    ) : null}
                  </>
                )}
              </ScrollView>
            )}
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                style={styles.botaoPrincipal}
                onPress={() => {
                  setErro(null);
                  setAdicionando(true);
                }}
              >
                <Text style={styles.botaoPrincipalTexto}>
                  Adicionar veículo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function DestaqueVeiculo({
  veiculo,
  carregando = false,
  onAbrir,
}: {
  veiculo: Veiculo;
  carregando?: boolean;
  onAbrir: () => void;
}) {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(false);
  const categorias = veiculo.categorias_servico ?? [];
  return (
    <TouchableOpacity
      style={styles.destaque}
      onPress={onAbrir}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${veiculo.placa}, veículo em uso`}
      accessibilityHint="Abre os detalhes do veículo"
    >
      <View style={styles.destaqueCabecalho}>
        <Text style={styles.destaqueRotulo}>Veículo selecionado</Text>
        <View style={styles.selecaoStatus}>
          <Text style={styles.ativoTexto}>Em uso</Text>
          <Ionicons name="radio-button-on" size={23} color="#16815C" />
        </View>
      </View>
      <View style={styles.destaqueImagemArea}>
        <Image
          source={
            veiculo.categoria === "moto"
              ? require("../../../assets/images/cadastro-veiculo/moto.png")
              : require("../../../assets/images/cadastro-veiculo/carro.png")
          }
          style={styles.destaqueImagem}
          resizeMode="contain"
          accessible={false}
        />
        <Text style={styles.imagemIlustrativa}>Imagem ilustrativa</Text>
      </View>
      <Text style={styles.destaqueModelo}>
        {[veiculo.ano_modelo, veiculo.marca, veiculo.modelo]
          .filter(Boolean)
          .join(" ")}
      </Text>
      <Text style={styles.destaquePlaca}>{veiculo.placa}</Text>
      <Text style={styles.destaqueDetalhes}>
        {[rotuloCategoria[veiculo.categoria], veiculo.cor, veiculo.uf]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <TouchableOpacity
        style={styles.destaqueCategoriasControle}
        onPress={() => setCategoriasExpandidas((expandido) => !expandido)}
        accessibilityRole="button"
        accessibilityLabel={`Categorias de viagem, ${categorias.length} disponíveis`}
        accessibilityState={{ expanded: categoriasExpandidas }}
        activeOpacity={0.7}
      >
        <Text
          style={styles.destaqueCategoriasTitulo}
          numberOfLines={categoriasExpandidas ? undefined : 1}
        >
          {categorias.length > 0
            ? categorias.map((categoria) => categoria.nome).join("/")
            : "Nenhuma categoria liberada no momento."}
        </Text>
        <Ionicons
          name={categoriasExpandidas ? "chevron-up" : "chevron-down"}
          size={20}
          color="#111"
        />
      </TouchableOpacity>
      {carregando ? (
        <View style={styles.cardCarregando}>
          <ActivityIndicator size="large" color="#16815C" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const aparenciaStatus: Record<
  string,
  { icone: React.ComponentProps<typeof Ionicons>["name"]; cor: string }
> = {
  aprovado: { icone: "checkmark-circle", cor: "#16815C" },
  em_analise: { icone: "time", cor: "#FF9800" },
  reprovado: { icone: "close-circle", cor: "#D32F2F" },
};

function DetalhesVeiculo({
  veiculo,
  ativo,
  podeUsar,
  podeRemover,
  removendo,
  insetsBottom,
  onUsar,
  onRemover,
}: {
  veiculo: Veiculo;
  ativo: boolean;
  podeUsar: boolean;
  podeRemover: boolean;
  removendo: boolean;
  insetsBottom: number;
  onUsar: () => void;
  onRemover: () => void;
}) {
  const aparencia = aparenciaStatus[veiculo.status] ?? {
    icone: "ellipse" as const,
    cor: "#777",
  };
  const categorias = (veiculo.categorias_servico ?? [])
    .map((categoria) => categoria.nome)
    .join("/");
  const linhas: { rotulo: string; valor: string }[] = [
    { rotulo: "Tipo de veículo", valor: rotuloDoVeiculo(veiculo) },
    { rotulo: "Marca e modelo", valor: `${veiculo.marca} ${veiculo.modelo}` },
    {
      rotulo: "Ano de fabricação / modelo",
      valor: `${veiculo.ano_fabricacao} / ${veiculo.ano_modelo}`,
    },
    { rotulo: "Cor", valor: veiculo.cor },
    { rotulo: "UF", valor: veiculo.uf },
    { rotulo: "RENAVAM", valor: veiculo.renavam },
    ...(categorias
      ? [
          {
            rotulo: `Tipos de serviço disponíveis (${veiculo.categorias_servico?.length})`,
            valor: categorias,
          },
        ]
      : []),
  ].filter((linha) => Boolean(linha.valor?.trim()));

  return (
    <View style={styles.conteudoLista}>
      <ScrollView
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detalhesCartao}>
          <View style={styles.detalhesStatus}>
            <Ionicons name={aparencia.icone} size={34} color={aparencia.cor} />
            <Text
              style={[styles.detalhesStatusTexto, { color: aparencia.cor }]}
            >
              {rotuloStatus[veiculo.status] || veiculo.status}
            </Text>
          </View>
          <Text style={styles.detalhesPlaca}>{veiculo.placa}</Text>
          {linhas.map((linha) => (
            <View key={linha.rotulo} style={styles.detalhesLinha}>
              <Text style={styles.detalhesRotulo}>{linha.rotulo}</Text>
              <Text style={styles.detalhesValor}>{linha.valor}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={[styles.footer, { paddingBottom: Math.max(insetsBottom, 16) }]}
      >
        {veiculo.status === "aprovado" && !ativo ? (
          <TouchableOpacity
            style={[
              styles.botaoPrincipal,
              !podeUsar && styles.botaoDesabilitado,
            ]}
            onPress={onUsar}
            disabled={!podeUsar}
            accessibilityRole="button"
          >
            <Text style={styles.botaoPrincipalTexto}>Usar este veículo</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.botaoRemover,
            !podeRemover && styles.botaoDesabilitado,
          ]}
          onPress={onRemover}
          disabled={!podeRemover}
          accessibilityRole="button"
        >
          {removendo ? (
            <ActivityIndicator color="#B42318" />
          ) : (
            <Text style={styles.botaoRemoverTexto}>Remover este veículo</Text>
          )}
        </TouchableOpacity>
        {!podeRemover && !removendo ? (
          <Text style={styles.detalhesAviso}>
            Para remover ou trocar o veículo, fique desconectado e sem corrida
            em andamento.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CartaoVeiculo({
  veiculo,
  ativo,
  podeSelecionar = false,
  selecionando = false,
  onSelecionar,
  onAbrir,
}: {
  veiculo: ResumoVeiculo;
  ativo: boolean;
  podeSelecionar?: boolean;
  selecionando?: boolean;
  onSelecionar?: () => void;
  onAbrir?: () => void;
}) {
  const exibirSelecao = veiculo.status !== "em_analise";

  return (
    <TouchableOpacity
      style={[styles.card, ativo && styles.cardSelecionado]}
      onPress={onAbrir}
      disabled={!onAbrir}
      activeOpacity={0.8}
      accessibilityRole={onAbrir ? "button" : undefined}
      accessibilityLabel={`${veiculo.placa || "Novo veículo"}, ${rotuloStatus[veiculo.status] || veiculo.status}`}
      accessibilityHint={onAbrir ? "Abre os detalhes do veículo" : undefined}
    >
      <View style={styles.cardTopo}>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{rotuloDoVeiculo(veiculo)}</Text>
        </View>
        <View style={styles.selecaoStatus}>
          <Text
            style={[
              styles.status,
              veiculo.status === "em_analise" && styles.statusEmAnalise,
            ]}
          >
            {rotuloStatus[veiculo.status] || veiculo.status}
          </Text>
          {exibirSelecao && (
            <TouchableOpacity
              onPress={onSelecionar}
              disabled={!podeSelecionar || ativo}
              hitSlop={12}
              accessibilityRole="radio"
              accessibilityLabel="Usar este veículo"
              accessibilityState={{
                checked: ativo,
                disabled: !podeSelecionar || ativo,
                busy: selecionando,
              }}
            >
              <Ionicons
                name={ativo ? "radio-button-on" : "radio-button-off"}
                size={23}
                color={ativo ? "#16815C" : "#999"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardLinha}>
        <View style={styles.iconeVeiculo}>
          <MaterialCommunityIcons
            name={veiculo.categoria === "moto" ? "motorbike" : "car-side"}
            size={32}
            color="#222"
          />
        </View>
        <View style={styles.cardDados}>
          <Text style={styles.placa}>{veiculo.placa || "Novo veículo"}</Text>
          <Text style={styles.modelo}>
            {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" · ") ||
              "Dados do CRLV em análise"}
          </Text>
          {[veiculo.cor, veiculo.ano_modelo, veiculo.uf].some(Boolean) ? (
            <Text style={styles.detalhes}>
              {[veiculo.cor, veiculo.ano_modelo, veiculo.uf]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
      {veiculo.status === "em_analise" ? (
        <View style={styles.ativoLinha}>
          <Ionicons name="time-outline" size={16} color="#FF9800" />
          <Text style={styles.analiseTexto}>
            Aguardando aprovação para receber corridas
          </Text>
        </View>
      ) : ativo ? (
        <View style={styles.ativoLinha}>
          <View style={styles.pontoAtivo} />
          <Text style={styles.ativoTexto}>
            Veículo em uso nas próximas corridas
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Marcacao({
  titulo,
  apoio,
  marcado,
  onAlternar,
}: {
  titulo: string;
  apoio: string;
  marcado: boolean;
  onAlternar: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.marcacao}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      onPress={onAlternar}
    >
      <Ionicons
        name={marcado ? "checkbox" : "square-outline"}
        size={24}
        color={marcado ? "#111" : "#9CA3AF"}
      />
      <View style={styles.marcacaoTextos}>
        <Text style={styles.marcacaoTitulo}>{titulo}</Text>
        <Text style={styles.marcacaoApoio}>{apoio}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Formulario({
  dados,
  erro,
  erros,
  salvando,
  insetsBottom,
  onAtualizar,
  onSalvar,
}: {
  dados: FormularioVeiculo;
  erro: string | null;
  erros: ErrosDosCampos;
  salvando: boolean;
  insetsBottom: number;
  onAtualizar: <Campo extends keyof FormularioVeiculo>(
    campo: Campo,
    valor: FormularioVeiculo[Campo],
  ) => void;
  onSalvar: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.formularioContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.formulario,
          { paddingBottom: Math.max(insetsBottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.secaoTitulo}>Tipo de veículo</Text>
        <View style={styles.categorias}>
          {(["carro", "moto"] as const).map((categoria) => (
            <TouchableOpacity
              key={categoria}
              style={[
                styles.categoria,
                dados.categoria === categoria && styles.categoriaAtiva,
              ]}
              onPress={() => onAtualizar("categoria", categoria)}
            >
              <Text
                style={[
                  styles.categoriaTexto,
                  dados.categoria === categoria && styles.categoriaTextoAtivo,
                ]}
              >
                {rotuloCategoria[categoria]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Campo
          rotulo="Marca"
          erro={erros.marca}
          valor={dados.marca}
          onChange={(v) => onAtualizar("marca", v)}
          placeholder="Ex.: Chevrolet"
        />
        <Campo
          rotulo="Modelo"
          erro={erros.modelo}
          valor={dados.modelo}
          onChange={(v) => onAtualizar("modelo", v)}
          placeholder="Ex.: Onix"
        />
        <View style={styles.camposLinha}>
          <Campo
            rotulo="Ano fabricação"
            erro={erros.ano_fabricacao}
            valor={dados.ano_fabricacao}
            onChange={(v) =>
              onAtualizar("ano_fabricacao", v.replace(/\D/g, "").slice(0, 4))
            }
            teclado="number-pad"
            largura
          />
          <Campo
            rotulo="Ano modelo"
            erro={erros.ano_modelo}
            valor={dados.ano_modelo}
            onChange={(v) =>
              onAtualizar("ano_modelo", v.replace(/\D/g, "").slice(0, 4))
            }
            teclado="number-pad"
            largura
          />
        </View>
        <Campo
          rotulo="Cor"
          erro={erros.cor}
          valor={dados.cor}
          onChange={(v) => onAtualizar("cor", v)}
          placeholder="Ex.: Branco"
        />
        <View style={styles.camposLinha}>
          <Campo
            rotulo="Placa"
            erro={erros.placa}
            valor={dados.placa}
            onChange={(v) =>
              onAtualizar(
                "placa",
                v
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 7),
              )
            }
            placeholder="ABC1D23"
            autoCapitalize="characters"
            largura
          />
          <Campo
            rotulo="UF"
            erro={erros.uf}
            valor={dados.uf}
            onChange={(v) =>
              onAtualizar(
                "uf",
                v
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 2),
              )
            }
            placeholder="RO"
            autoCapitalize="characters"
            largura
          />
        </View>
        <Campo
          rotulo="RENAVAM"
          erro={erros.renavam}
          valor={dados.renavam}
          onChange={(v) =>
            onAtualizar("renavam", v.replace(/\D/g, "").slice(0, 11))
          }
          placeholder="11 números"
          teclado="number-pad"
        />
        <Campo
          rotulo="CPF ou CNPJ do proprietário"
          erro={erros.cpf_cnpj_proprietario}
          valor={dados.cpf_cnpj_proprietario}
          onChange={(v) =>
            onAtualizar("cpf_cnpj_proprietario", formatarCpfCnpj(v))
          }
          placeholder="Como está no documento do veículo"
          teclado="number-pad"
        />
        <Text style={styles.secaoTitulo}>Categorias especiais (opcional)</Text>
        {dados.categoria === "carro" ? (
          <Marcacao
            titulo="Pedir a categoria Elétrico"
            apoio="A gestão confere o carro antes de liberar as corridas Elétrico."
            marcado={dados.eletrico}
            onAlternar={() => onAtualizar("eletrico", !dados.eletrico)}
          />
        ) : null}
        <Marcacao
          titulo="Pedir a categoria Táxi"
          apoio={
            dados.categoria === "moto"
              ? "Para moto táxi licenciado. A gestão confere a licença antes de liberar as corridas Táxi."
              : "Para táxi licenciado. A gestão confere a licença antes de liberar as corridas Táxi."
          }
          marcado={dados.taxi}
          onAlternar={() => onAtualizar("taxi", !dados.taxi)}
        />
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        <TouchableOpacity
          style={[styles.botaoPrincipal, salvando && styles.botaoDesabilitado]}
          disabled={salvando}
          onPress={onSalvar}
        >
          {salvando ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.botaoPrincipalTexto}>Salvar veículo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  rotulo,
  erro,
  valor,
  onChange,
  placeholder,
  teclado,
  autoCapitalize,
  largura = false,
}: {
  rotulo: string;
  erro?: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  teclado?: "default" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  largura?: boolean;
}) {
  return (
    <View style={[styles.campo, largura && styles.campoMetade]}>
      <Text style={styles.campoRotulo}>{rotulo}</Text>
      <TextInput
        style={[styles.input, erro && styles.inputComErro]}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={teclado}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={erro ? `${rotulo}: ${erro}` : rotulo}
      />
      {erro ? <Text style={styles.campoErro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  camada: { zIndex: 30 },
  overlay: { backgroundColor: "rgba(0,0,0,0.25)" },
  drawer: { position: "absolute", inset: 0, backgroundColor: "#F6F6F6" },
  header: {
    backgroundColor: "#FFF",
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  espacoHeader: { width: 25 },
  conteudoLista: { flex: 1 },
  lista: { flexGrow: 1, padding: 16, paddingBottom: 24 },
  listaTitulo: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  destaque: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ECECEC",
    overflow: "hidden",
  },
  destaqueCabecalho: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  destaqueRotulo: { color: "#666", fontSize: 13, fontWeight: "600" },
  destaqueImagemArea: { alignItems: "center", marginVertical: 18 },
  destaqueImagem: { width: "100%", maxWidth: 260, height: 160 },
  imagemIlustrativa: { fontSize: 10, color: "#888", marginTop: 4 },
  destaqueModelo: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#111",
  },
  destaquePlaca: {
    marginTop: 8,
    fontSize: 19,
    color: "#444",
    fontWeight: "600",
  },
  destaqueDetalhes: {
    marginTop: 6,
    color: "#666",
    fontSize: 14,
    lineHeight: 21,
  },
  destaqueCategoriasControle: {
    marginTop: 14,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 8,
  },
  destaqueCategoriasTitulo: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#111",
  },
  erroAtualizacao: { alignItems: "center", padding: 16, gap: 12 },
  estadoCentral: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  estadoTexto: { color: "#666", textAlign: "center" },
  vazio: { alignItems: "center", paddingTop: 70, paddingHorizontal: 28 },
  vazioTitulo: { marginTop: 14, fontSize: 18, fontWeight: "700" },
  vazioTexto: {
    marginTop: 6,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  sucesso: {
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E8F8F1",
    color: "#137A57",
    fontWeight: "600",
    textAlign: "center",
  },
  erro: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
    color: "#B42318",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  cardSelecionado: { borderColor: "#16815C", backgroundColor: "#F0FAF5" },
  cardCarregando: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  selecaoStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  orientacaoSelecao: {
    color: "#666",
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 19,
  },
  cardTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#EEE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  badgeTexto: { fontSize: 11, fontWeight: "700", color: "#555" },
  status: {
    fontSize: 12,
    color: "#16815C",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  statusEmAnalise: { color: "#FF9800" },
  analiseTexto: { flex: 1, fontSize: 12, color: "#FF9800", fontWeight: "600" },
  cardLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconeVeiculo: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDados: { flex: 1 },
  placa: { fontSize: 18, fontWeight: "800", color: "#111" },
  modelo: { marginTop: 3, fontSize: 13, fontWeight: "600", color: "#333" },
  detalhes: { marginTop: 3, fontSize: 12, color: "#777" },
  ativoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    gap: 7,
  },
  pontoAtivo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#19A974",
  },
  ativoTexto: { fontSize: 12, color: "#16815C", fontWeight: "600" },
  footer: {
    backgroundColor: "#FFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    gap: 10,
  },
  botaoPrincipal: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#FFD51E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  botaoPrincipalTexto: { color: "#111", fontSize: 16, fontWeight: "800" },
  botaoDev: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#F1EAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  botaoDevTexto: {
    flexShrink: 1,
    color: "#5B21B6",
    fontWeight: "700",
    textAlign: "center",
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: "#CCC",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  botaoSecundarioTexto: { fontWeight: "700", color: "#333" },
  botaoRemover: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#F3F4F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  botaoRemoverTexto: { color: "#B42318", fontSize: 16, fontWeight: "700" },
  detalhesCartao: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECECEC",
    gap: 18,
  },
  detalhesStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  detalhesStatusTexto: { fontSize: 18, fontWeight: "700" },
  detalhesPlaca: { fontSize: 28, fontWeight: "800", color: "#111" },
  detalhesLinha: { gap: 3 },
  detalhesRotulo: { fontSize: 13, color: "#777" },
  detalhesValor: { fontSize: 16, lineHeight: 22, color: "#111" },
  detalhesAviso: { fontSize: 12, color: "#777", textAlign: "center" },
  botaoDesabilitado: { opacity: 0.55 },
  formularioContainer: { flex: 1 },
  formulario: {
    padding: 18,
    gap: 14,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  secaoTitulo: { fontSize: 15, fontWeight: "700", color: "#222" },
  categorias: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoria: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4D4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriaAtiva: { backgroundColor: "#FFF4B2", borderColor: "#D9B500" },
  categoriaTexto: { color: "#666", fontWeight: "600" },
  categoriaTextoAtivo: { color: "#111", fontWeight: "800" },
  marcacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  marcacaoTextos: { flex: 1 },
  marcacaoTitulo: { fontSize: 15, fontWeight: "700", color: "#222" },
  marcacaoApoio: { fontSize: 12, color: "#666", marginTop: 2 },
  camposLinha: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  campo: { gap: 6 },
  campoMetade: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  campoRotulo: { fontSize: 13, color: "#444", fontWeight: "600" },
  inputComErro: { borderColor: "#D92D20", backgroundColor: "#FFFBFA" },
  campoErro: { fontSize: 12, color: "#B42318" },
  input: {
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5D5D5",
    backgroundColor: "#FFF",
    paddingHorizontal: 13,
    color: "#111",
    fontSize: 15,
  },
});
