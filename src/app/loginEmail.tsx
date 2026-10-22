// CODEX: 0 linhas alteradas; adapta formulário, teclado e rodapé às áreas seguras. Remover após validação ou commit.
import AppLogo from "@/components/common/AppLogo";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { ehErroDeRede, mensagemDaApi } from "@/Services/api";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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

export default function LoginEmail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, loading, login } = useAuth();

  const [step, setStep] = useState(1);
  const espacoDoTeclado = useEspacoDoTeclado(false);

  // voltar tem que andar um passo de cada vez; só sai da tela no primeiro

  const voltarPasso = useCallback(() => {
    if (step <= 1) {
      router.back();
      return;
    }

    setStep(step - 1);
  }, [step, router]);

  useEffect(() => {
    const inscricao = BackHandler.addEventListener("hardwareBackPress", () => {
      voltarPasso();
      return true;
    });

    return () => inscricao.remove();
  }, [voltarPasso]);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [erroLogin, setErroLogin] = useState("");
  const [erroEmail, setErroEmail] = useState("");

  useEffect(() => {
    if (user && !loading) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email.trim());
  };

  const handleAvancar = () => {
    if (!validarEmail(email)) {
      setErroEmail("Digite um e-mail válido");
      return;
    }

    setErroEmail("");
    setStep(2);
  };

  const handleLogin = async () => {
    try {
      setErroLogin("");

      await login(email.trim(), senha);

      router.replace("/home");
    } catch (error: unknown) {
      setErroLogin(
        ehErroDeRede(error)
          ? "Não foi possível conectar. Verifique sua internet."
          : mensagemDaApi(error, "E-mail ou senha inválidos."),
      );
    }
  };

  const podeAvancar =
    step === 1 ? Boolean(email.trim()) : Boolean(senha) && !loading;

  const rotuloAvancar = step === 1 ? "Avançar" : "Entrar";

  const avancar = () => {
    if (!podeAvancar) return;

    if (step === 1) {
      handleAvancar();
      return;
    }

    handleLogin();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView style={styles.container} edges={[]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboard}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* HEADER */}
            <View
              style={[
                styles.header,
                { paddingTop: Math.max(insets.top + 12, 36) },
              ]}
            >
              <AppLogo />

              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>🚗 Área do motorista</Text>
              </View>
            </View>

            <View style={styles.content}>
              {/* STEP 1 */}
              {step === 1 && (
                <View style={styles.stepContainer}>
                  <View>
                    <Text style={styles.title}>
                      Qual é o seu endereço de e-mail?
                    </Text>

                    <View style={styles.inputWrapper}>
                      <TextInput
                        autoFocus
                        placeholder="nome@exemplo.com"
                        placeholderTextColor="#CCC"
                        style={styles.input}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);

                          if (erroEmail) {
                            setErroEmail("");
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                        returnKeyType={email.trim() ? "go" : "done"}
                        onSubmitEditing={() => email.trim() && handleAvancar()}
                      />
                    </View>

                    <View
                      style={[
                        styles.inputUnderline,
                        erroEmail && styles.inputUnderlineError,
                      ]}
                    />

                    {!!erroEmail && <ErrorBanner message={erroEmail} />}
                  </View>
                </View>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <View>
                    <Text style={styles.title}>Informe sua senha</Text>

                    <Text style={styles.highlightText}>{email}</Text>

                    <View style={styles.inputWrapper}>
                      <TextInput
                        autoFocus
                        placeholder="Digite sua senha"
                        placeholderTextColor="#CCC"
                        secureTextEntry={!mostrarSenha}
                        style={styles.input}
                        value={senha}
                        onChangeText={(text) => {
                          setSenha(text);

                          if (erroLogin) {
                            setErroLogin("");
                          }
                        }}
                        autoCapitalize="none"
                        editable={!loading}
                        returnKeyType={senha ? "go" : "done"}
                        onSubmitEditing={() => senha && handleLogin()}
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

                    <View
                      style={[
                        styles.inputUnderline,
                        erroLogin && styles.inputUnderlineError,
                      ]}
                    />

                    {!!erroLogin && <ErrorBanner message={erroLogin} />}
                  </View>
                </View>
              )}
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
              style={styles.roundedButton}
              onPress={voltarPasso}
              disabled={loading}
            >
              <Feather name="arrow-left" size={22} color="black" />
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!podeAvancar}
              onPress={avancar}
              style={[
                styles.nextButton,
                podeAvancar
                  ? styles.nextButtonActive
                  : styles.nextButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="black" />
              ) : (
                <>
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
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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

  keyboard: {
    flex: 1,
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
    paddingTop: 36,
    paddingHorizontal: 20,
  },

  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    flexGrow: 1,
    paddingHorizontal: 30,
    marginTop: 20,
    paddingBottom: 30,
  },

  stepContainer: {
    flexGrow: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 24,
  },

  highlightText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
    color: "#FF5500",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
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
    marginBottom: 12,
  },

  inputUnderlineError: {
    backgroundColor: "#ef4444",
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

  nextButton: {
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
});
