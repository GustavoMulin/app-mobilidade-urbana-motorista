// CODEX: 0 linhas alteradas; adapta formulário, teclado e rodapé às áreas seguras. Remover após validação ou commit.
import CodigoVerificacao from "@/components/auth/CodigoVerificacao";
import AppLogo from "@/components/common/AppLogo";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ehErroDeRede, mensagemDaApi } from "../Services/api";
import { useAuth } from "../context/AuthProvider";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const espacoDoTeclado = useEspacoDoTeclado(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCodigoVerificacao, setShowCodigoVerificacao] = useState(false);

  const [loadingVerificarConta, setLoadingVerificarConta] = useState(false);
  const [erroLogin, setErroLogin] = useState("");

  const { user, loading } = useAuth();
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();

  const avisoSessao =
    motivo === "sessao-expirada"
      ? "Sua sessão expirou. Entre novamente para continuar."
      : "";

  useEffect(() => {
    if (user && !loading) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    }
    if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 11)}`;
    }

    setPhone(formatted);
  };

  const verificarSeContaExiste = async () => {
    setErroLogin("");

    try {
      setLoadingVerificarConta(true);

      const telefone = phone.replace(/\D/g, "");

      const response = await api.get("/auth/verifica-se-conta-existe", {
        params: { telefone },
      });

      if (response.data.contaExiste) {
        await api.post("/auth/enviar-codigo", {
          telefone,
          perfil: "motorista",
        });
        setShowCodigoVerificacao(true);

        return;
      }

      router.push({ pathname: "/register", params: { telefone } });
    } catch (error: unknown) {
      setErroLogin(
        ehErroDeRede(error)
          ? "Não foi possível conectar. Verifique sua internet."
          : mensagemDaApi(
              error,
              "Não foi possível enviar o código. Tente novamente.",
            ),
      );
    } finally {
      setLoadingVerificarConta(false);
    }
  };

  const isButtonEnabled =
    phone.replace(/\D/g, "").length === 11 && acceptedTerms;

  if (loading) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color="#FF5500" />
        <Text style={styles.carregandoTexto}>Verificando autenticação...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />

      <CodigoVerificacao
        visible={showCodigoVerificacao}
        onClose={() => setShowCodigoVerificacao(false)}
        telefone={phone.replace(/\D/g, "")}
      />

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

            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>🚗 Área do motorista</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Insira o número de telefone</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.countryPicker}>
                <Text style={styles.flag}>🇧🇷</Text>
                <Text style={styles.countryCode}>+55</Text>
                <Ionicons name="caret-down" size={12} color="#666" />
              </View>

              <TextInput
                style={styles.input}
                placeholder="(69) 91234-5678"
                placeholderTextColor="#CCC"
                keyboardType="phone-pad"
                maxLength={13}
                value={phone}
                onChangeText={formatPhone}
                returnKeyType={isButtonEnabled ? "go" : "done"}
                onSubmitEditing={() =>
                  isButtonEnabled && verificarSeContaExiste()
                }
              />

              {phone.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPhone("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#CCC" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputUnderline} />

            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioButton,
                  acceptedTerms && styles.radioButtonActive,
                ]}
              >
                {acceptedTerms && (
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

            {erroLogin ? <ErrorBanner message={erroLogin} /> : null}
            {!erroLogin && avisoSessao ? (
              <ErrorBanner message={avisoSessao} />
            ) : null}

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => router.push("/loginEmail")}
            >
              <FontAwesome5
                name="envelope"
                size={20}
                color="grey"
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Entrar com email</Text>
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
            onPress={() => verificarSeContaExiste()}
            style={[
              styles.nextButton,
              isButtonEnabled
                ? styles.nextButtonActive
                : styles.nextButtonDisabled,
            ]}
            disabled={!isButtonEnabled || loadingVerificarConta}
          >
            {loadingVerificarConta ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text
                style={[
                  styles.nextButtonText,
                  !isButtonEnabled && styles.nextButtonTextDisabled,
                ]}
              >
                Próximo
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  carregando: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  carregandoTexto: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  header: {
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    flexGrow: 1,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  countryPicker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 15,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
    marginRight: 5,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 5,
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
    marginBottom: 25,
  },
  clearButton: {
    padding: 5,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
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
  },
  footer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },
  nextButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },
  nextButtonActive: {
    backgroundColor: "#FFD200",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  nextButtonTextDisabled: {
    color: "#CCC",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EEE",
  },
  dividerText: {
    paddingHorizontal: 15,
    color: "#AAA",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    height: 55,
    borderRadius: 10,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
