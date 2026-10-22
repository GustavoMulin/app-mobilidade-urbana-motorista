// CODEX: 0 linhas alteradas; adapta cadastro de veículos a teclado, largura e rotação. Remover após validação ou commit.
import { api } from "@/Services/api";
import { Text, TextInput } from "@/components/common/Texto";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  uf: string;
}

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
const rotuloDoVeiculo = (veiculo: Veiculo) =>
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

const gerarDadosDeDesenvolvimento = (): FormularioVeiculo => {
  const instante = Date.now();
  const digito = instante % 10;
  const letra = String.fromCharCode(65 + (instante % 26));
  const finalPlaca = String(instante % 100).padStart(2, "0");

  return {
    marca: "Chevrolet",
    modelo: "Onix de desenvolvimento",
    ano_fabricacao: String(ANO_ATUAL),
    ano_modelo: String(ANO_ATUAL),
    cor: "Branco",
    placa: `DEV${digito}${letra}${finalPlaca}`,
    renavam: String(instante).slice(-11).padStart(11, "0"),
    cpf_cnpj_proprietario: "123.456.789-09",
    categoria: "carro",
    eletrico: false,
    taxi: false,
    uf: "RO",
  };
};

export default function MeusVeiculos({
  visible,
  onClose,
  duration = 200,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioVeiculo>(FORMULARIO_INICIAL);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosDosCampos>({});
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarVeiculos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setSucesso(null);

    // a primeira leitura logo depois de abrir o app às vezes falha sem
    // resposta: tenta mais uma vez antes de mostrar o erro
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const { data } = await api.get<{ data: Veiculo[] }>(
          "/motorista/me/veiculos",
        );
        setVeiculos(data.data ?? []);
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

  useEffect(() => {
    // A abertura do drawer é o evento que inicia a leitura remota.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) void carregarVeiculos();
  }, [carregarVeiculos, visible]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!visible) return false;
        if (mostrandoFormulario) {
          setMostrandoFormulario(false);
          setErro(null);
        } else {
          onClose();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [mostrandoFormulario, onClose, visible]);

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
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
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
              if (mostrandoFormulario) {
                setMostrandoFormulario(false);
                setErro(null);
              } else onClose();
            }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back-outline" size={25} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mostrandoFormulario ? "Adicionar veículo" : "Meus veículos"}
          </Text>
          <View style={styles.espacoHeader} />
        </View>

        {mostrandoFormulario ? (
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
            ) : erro ? (
              <View style={styles.estadoCentral}>
                <Ionicons name="cloud-offline-outline" size={36} color="#777" />
                <Text style={styles.estadoTexto}>{erro}</Text>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={carregarVeiculos}
                >
                  <Text style={styles.botaoSecundarioTexto}>
                    Tentar novamente
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.lista}
                showsVerticalScrollIndicator={false}
              >
                {veiculos.length === 0 ? (
                  <View style={styles.vazio}>
                    <Ionicons name="car-sport-outline" size={48} color="#999" />
                    <Text style={styles.vazioTitulo}>
                      Nenhum veículo cadastrado
                    </Text>
                    <Text style={styles.vazioTexto}>
                      Adicione o veículo que você usa para receber corridas.
                    </Text>
                  </View>
                ) : (
                  veiculos.map((veiculo, indice) => (
                    <CartaoVeiculo
                      key={veiculo.id}
                      veiculo={veiculo}
                      ativo={indice === 0}
                    />
                  ))
                )}
              </ScrollView>
            )}

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {__DEV__ ? (
                <TouchableOpacity
                  style={styles.botaoDev}
                  disabled={salvando}
                  onPress={() => void enviar(gerarDadosDeDesenvolvimento())}
                >
                  <Ionicons name="flask-outline" size={18} color="#5B21B6" />
                  <Text style={styles.botaoDevTexto}>
                    {salvando
                      ? "Gerando..."
                      : "Gerar veículo de desenvolvimento"}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.botaoPrincipal}
                onPress={() => {
                  setErro(null);
                  setMostrandoFormulario(true);
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

function CartaoVeiculo({
  veiculo,
  ativo,
}: {
  veiculo: Veiculo;
  ativo: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{rotuloDoVeiculo(veiculo)}</Text>
        </View>
        <Text style={styles.status}>{veiculo.status}</Text>
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
          <Text style={styles.placa}>{veiculo.placa}</Text>
          <Text style={styles.modelo}>
            {veiculo.marca} · {veiculo.modelo}
          </Text>
          <Text style={styles.detalhes}>
            {veiculo.cor} · {veiculo.ano_modelo} · {veiculo.uf}
          </Text>
        </View>
      </View>
      {ativo ? (
        <View style={styles.ativoLinha}>
          <View style={styles.pontoAtivo} />
          <Text style={styles.ativoTexto}>
            Veículo em uso nas próximas corridas
          </Text>
        </View>
      ) : null}
    </View>
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
  lista: { padding: 16, paddingBottom: 24 },
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
