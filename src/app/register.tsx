// CODEX: 0 linhas alteradas; adapta formulário, teclado e rodapé às áreas seguras. Remover após validação ou commit.
import AppLogo from "@/components/common/AppLogo";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Cadastro() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const { telefone: telefoneParam } = useLocalSearchParams<{
    telefone?: string;
  }>();

  const [step, setStep] = useState(1);
  const espacoDoTeclado = useEspacoDoTeclado(false);

  // voltar tem que andar um passo de cada vez; só sai da tela no primeiro
  // o passo 1 é o único sem voltar no rodapé, ao lado do Continuar

  const voltarPasso = useCallback(() => {
    if (step <= 1) {
      router.back();
      return;
    }

    setStep(step === 3 ? 1 : step - 1);
  }, [step, router]);

  useEffect(() => {
    const inscricao = BackHandler.addEventListener("hardwareBackPress", () => {
      voltarPasso();
      return true;
    });

    return () => inscricao.remove();
  }, [voltarPasso]);

  // step 1
  const [email, setEmail] = useState("");
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // step 3
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const senhaValida = senha.length >= 8;

  // step 4
  const [name, setName] = useState("");

  // step 5
  const [dataNascimento, setDataNascimento] = useState("");

  // step 6
  const [concordo, setConcordo] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState("");
  const [erroEmailServidor, setErroEmailServidor] = useState("");
  const [erroSenhaServidor, setErroSenhaServidor] = useState("");
  const [erroIdadeServidor, setErroIdadeServidor] = useState("");

  // valida se a data preenchida existe de verdade (dia/mês dentro do range e o mês tem esse dia)
  const dataNascimentoValida = (valor: string) => {
    if (valor.length !== 10) return false;

    const [dia, mes, ano] = valor.split("/").map(Number);

    if (!dia || !mes || !ano) return false;
    if (mes < 1 || mes > 12) return false;

    const diasNoMes = new Date(ano, mes, 0).getDate();

    if (dia < 1 || dia > diasNoMes) return false;

    return ano >= 1900 && ano <= new Date().getFullYear();
  };

  // calcula a idade a partir de dd/mm/aaaa
  const calcularIdade = (valor: string) => {
    const [dia, mes, ano] = valor.split("/").map(Number);

    const nascimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    let idade = hoje.getFullYear() - nascimento.getFullYear();

    const aindaNaoFezAniversario =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() &&
        hoje.getDate() < nascimento.getDate());

    if (aindaNaoFezAniversario) idade--;

    return idade;
  };

  const dataNascimentoFormatoValido = dataNascimentoValida(dataNascimento);
  const maiorDeIdade =
    dataNascimentoFormatoValido && calcularIdade(dataNascimento) >= 18;
  const menorDeIdade = dataNascimentoFormatoValido && !maiorDeIdade;

  // validação step 5
  const step5Valido = maiorDeIdade;

  // máscara data nascimento
  const formatarDataNascimento = (value: string) => {
    const numeros = value.replace(/\D/g, "");

    return numeros
      .replace(/^(\d{2})(\d)/, "$1/$2")
      .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
      .slice(0, 10);
  };

  const finalizarCadastro = async () => {
    if (!concordo || enviando) return;

    setEnviando(true);
    setErroCadastro("");
    setErroEmailServidor("");

    // converte 21/11/1992 => 1992-11-21
    const [dia, mes, ano] = dataNascimento.split("/");

    const dataNascimentoTratada = `${ano}-${mes}-${dia}`;

    const usuario = {
      email: email,
      password: senha,
      name: name,
      data_nascimento: dataNascimentoTratada,
      ...(telefoneParam ? { telefone: telefoneParam } : {}),
    };

    try {
      await register(usuario);

      // a conta nasce pendente: quem libera é a análise no painel de gestão
      router.replace("/liberacao");
    } catch (error: any) {
      const erros = error?.response?.data?.errors;

      if (erros?.telefone) {
        setErroCadastro(
          "Já existe uma conta com esse telefone. Volte e entre com ele.",
        );

        return;
      }

      if (erros?.email) {
        setErroEmailServidor(
          Array.isArray(erros.email) ? erros.email[0] : "E-mail já cadastrado.",
        );

        setStep(1);

        return;
      }

      if (erros?.password) {
        setErroSenhaServidor(
          Array.isArray(erros.password) ? erros.password[0] : "Senha inválida.",
        );

        setStep(3);

        return;
      }

      // idade reprovada no servidor -> mostra na própria etapa da data de nascimento
      if (erros?.data_nascimento) {
        setErroIdadeServidor(
          Array.isArray(erros.data_nascimento)
            ? erros.data_nascimento[0]
            : "Data de nascimento inválida.",
        );

        setStep(5);

        return;
      }

      const mensagem =
        error?.response?.data?.message ??
        "Não foi possível concluir o cadastro. Tente novamente.";

      setErroCadastro(mensagem);
    } finally {
      setEnviando(false);
    }
  };

  const PASSO_FINAL = 6;

  const podeAvancarPorPasso: Record<number, boolean> = {
    1: emailValido,
    3: senhaValida,
    4: Boolean(name.trim()),
    5: step5Valido,
    6: concordo,
  };

  const podeAvancar = (podeAvancarPorPasso[step] ?? false) && !enviando;

  const rotuloAvancar = step === PASSO_FINAL ? "Finalizar" : "Avançar";

  const avancar = () => {
    if (!podeAvancar) return;

    if (step === PASSO_FINAL) {
      finalizarCadastro();
      return;
    }

    setStep(step === 1 ? 3 : step + 1);
  };

  return (
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
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <AppLogo />
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>🚗 Área do Motorista</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* STEP 1 */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View>
                <Text style={styles.title}>Qual é o seu e-mail?</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    erroEmailServidor && styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    autoFocus
                    placeholder="Informe seu e-mail"
                    placeholderTextColor="#CCC"
                    style={styles.input}
                    value={email}
                    onChangeText={(texto) => {
                      if (erroEmailServidor) setErroEmailServidor("");

                      setEmail(texto);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={emailValido ? "go" : "done"}
                    onSubmitEditing={() => emailValido && setStep(3)}
                  />
                </View>
                <View style={styles.inputUnderline} />

                {erroEmailServidor ? (
                  <ErrorBanner message={erroEmailServidor} />
                ) : null}
              </View>

              <View>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.loginText}>Já tem conta? Faça login</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View>
                <Text style={styles.title}>Crie uma senha para sua conta</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    erroSenhaServidor && styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    autoFocus
                    placeholder="Senha"
                    placeholderTextColor="#CCC"
                    secureTextEntry={!mostrarSenha}
                    returnKeyType={senhaValida ? "go" : "done"}
                    onSubmitEditing={() => senhaValida && setStep(4)}
                    style={styles.input}
                    value={senha}
                    onChangeText={(text) => {
                      setSenha(text);

                      if (erroSenhaServidor) setErroSenhaServidor("");
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => setMostrarSenha((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={mostrarSenha ? "eye-off" : "eye"}
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputUnderline} />

                {erroSenhaServidor ? (
                  <ErrorBanner message={erroSenhaServidor} />
                ) : (
                  <Text style={styles.smallTextSpacing}>
                    Mínimo de 8 caracteres
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View>
                <Text style={styles.title}>Qual é o seu nome?</Text>

                <Text style={styles.smallTextSpacing}>
                  Informe como você quer que te chamem
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    autoFocus
                    placeholder="Informe seu nome completo"
                    placeholderTextColor="#CCC"
                    returnKeyType={name.trim() ? "go" : "done"}
                    onSubmitEditing={() => name.trim() && setStep(5)}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.inputUnderline} />
              </View>
            </View>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <View>
                <Text style={styles.title}>Qual sua data de nascimento?</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    (menorDeIdade || erroIdadeServidor) &&
                      styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    autoFocus
                    placeholder="00/00/0000"
                    placeholderTextColor="#CCC"
                    keyboardType="numeric"
                    returnKeyType={step5Valido ? "go" : "done"}
                    onSubmitEditing={() => step5Valido && setStep(6)}
                    value={dataNascimento}
                    onChangeText={(text) => {
                      setDataNascimento(formatarDataNascimento(text));

                      if (erroIdadeServidor) setErroIdadeServidor("");
                    }}
                    maxLength={10}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputUnderline} />

                {erroIdadeServidor ? (
                  <ErrorBanner message={erroIdadeServidor} />
                ) : menorDeIdade ? (
                  <ErrorBanner message="Você precisa ter pelo menos 18 anos para se cadastrar." />
                ) : null}
              </View>
            </View>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <View style={styles.stepContainer}>
              <View>
                <View style={styles.iconContainer}>
                  <Feather name="file-text" size={54} color="black" />
                </View>

                <Text style={styles.title}>Aceite os Termos e condições</Text>

                <Text style={styles.description}>
                  Ao selecionar Concordo abaixo, confirmo que revisei e concordo
                  com os <Text style={styles.link}>Termos de uso</Text> e
                  reconheço o{" "}
                  <Text style={styles.link}>Aviso de Privacidade</Text>.
                </Text>

                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setConcordo(!concordo)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioButton,
                      concordo && styles.radioButtonActive,
                    ]}
                  >
                    {concordo && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>

                  <Text style={styles.termsText}>
                    Li e aceito os{" "}
                    <Text style={styles.linkText}>
                      Termos de Uso e a Política de Privacidade
                    </Text>
                  </Text>
                </TouchableOpacity>

                {erroCadastro ? <ErrorBanner message={erroCadastro} /> : null}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + espacoDoTeclado },
        ]}
      >
        <TouchableOpacity
          style={styles.roundedButton}
          onPress={voltarPasso}
          disabled={enviando}
        >
          <Feather name="arrow-left" size={22} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!podeAvancar}
          onPress={avancar}
          style={[
            styles.nextButtonSmall,
            podeAvancar ? styles.nextButtonActive : styles.nextButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.nextButtonText,
              !podeAvancar && styles.nextButtonTextDisabled,
            ]}
          >
            {rotuloAvancar}
          </Text>

          <Feather
            name="arrow-right"
            size={18}
            color={podeAvancar ? "black" : "#CCC"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },

  badgeText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "600",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },

  header: {
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
  },

  backButton: {
    position: "absolute",
    left: 20,
    top: 56,
  },

  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    flexGrow: 1,
    paddingHorizontal: 30,
    marginTop: 20,
    paddingBottom: 24,
  },

  stepContainer: {
    flexGrow: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },

  highlightText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#FF5500",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  inputWrapperError: {
    borderBottomWidth: 2,
    borderBottomColor: "#D32F2F",
  },

  input: {
    flex: 1,
    fontSize: 18,
    color: "#000",
    fontWeight: "400",
  },

  inputUnderline: {
    height: 1,
    backgroundColor: "#FF5500",
    width: "100%",
    marginBottom: 16,
  },

  nextButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  nextButtonSmall: {
    height: 50,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 24,
  },

  nextButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },

  nextButtonActive: {
    backgroundColor: "#FFD200",
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginRight: 8,
  },

  nextButtonTextDisabled: {
    color: "#CCC",
  },

  loginButton: {
    marginTop: 20,
  },

  loginText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  smallText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 10,
  },

  smallTextSpacing: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },

  resendLink: {
    color: "#000",
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "center",
  },

  footer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },

  roundedButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  space: {
    marginBottom: 10,
  },

  iconContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginBottom: 30,
  },

  link: {
    color: "#000",
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 40,
  },

  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CCC",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  radioButtonActive: {
    backgroundColor: "#FF5500",
    borderColor: "#FF5500",
  },

  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  linkText: {
    textDecorationLine: "underline",
    fontWeight: "600",
    color: "#000",
  },
});
