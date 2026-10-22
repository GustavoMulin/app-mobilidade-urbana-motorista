// CODEX: 0 linhas alteradas; remove espaço excessivo no rodapé da verificação. Remover após validação ou commit.
import { api } from "@/Services/api";
import AppLogo from "@/components/common/AppLogo";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface props {
  visible: boolean;
  onClose: () => void;
  telefone: string;
  duration?: number;
}

export default function CodigoVerificacao({
  visible,
  onClose,
  telefone,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(width));
  const espacoDoTeclado = useEspacoDoTeclado();
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const { loginComToken } = useAuth();

  // Estados para os 4 dígitos do código
  const [code, setCode] = useState(["", "", "", ""]);

  // Estado do contador
  const [countdown, setCountdown] = useState(57);

  // Estados de requisição e validação de erro
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  // INPUT INVISÍVEL
  const hiddenInputRef = useRef<TextInput>(null);
  const verificandoRef = useRef(false);

  useEffect(() => {
    if (user && !loading) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  // Confere o código digitado contra o backend e autentica o usuário
  const verificarCodigo = async (codigo: string) => {
    if (verificandoRef.current) return;

    verificandoRef.current = true;
    setIsLoading(true);

    try {
      const response = await api.post("auth/verificar-codigo", {
        telefone,
        codigo,
      });

      const { user, token } = response.data;

      await loginComToken(user, token);
    } catch {
      setHasError(true);
      setCode(["", "", "", ""]);

      hiddenInputRef.current?.focus();
    } finally {
      verificandoRef.current = false;
      setIsLoading(false);
    }
  };

  const [recebendoCodigo, setRecebendoCodigo] = useState(false);

  // Botão de apoio (dev): busca o código gerado pelo backend e preenche sozinho
  const receberCodigo = async () => {
    if (recebendoCodigo || isLoading) return;

    setRecebendoCodigo(true);

    try {
      const response = await api.post("auth/enviar-codigo", { telefone });

      const codigo = String(response.data.codigo || "")
        .replace(/\D/g, "")
        .slice(0, 4);

      if (codigo.length !== 4) {
        setRecebendoCodigo(false);
        return;
      }

      setHasError(false);

      const newCode = ["", "", "", ""];

      codigo.split("").forEach((digit, index) => {
        newCode[index] = digit;
      });

      // anima preenchendo os inputs
      newCode.forEach((digit, index) => {
        setTimeout(() => {
          setCode((prev) => {
            const updated = [...prev];
            updated[index] = digit;
            return updated;
          });
        }, index * 180);
      });

      // aguarda animação terminar antes de confirmar — só libera o botão
      // de novo depois que essa verificação realmente terminar, pra não
      // deixar um segundo toque gerar outro código no meio do caminho
      setTimeout(() => {
        verificarCodigo(codigo).finally(() => setRecebendoCodigo(false));
      }, 1000);
    } catch {
      setRecebendoCodigo(false);
    }
  };

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (visible && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [visible, countdown]);

  // Voltar Android
  useEffect(() => {
    const onBackPress = () => {
      if (visible) {
        onClose();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [visible, onClose]);

  // Animação
  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0);

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
      ]).start(() => {
        setTimeout(() => {
          hiddenInputRef.current?.focus();
        }, 100);
      });
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
  }, [visible, translateX, overlayOpacity, duration, width]);

  // Limpa estados
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setCode(["", "", "", ""]);
        setHasError(false);
        setIsLoading(false);
        setRecebendoCodigo(false);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Handler digitação
  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);

    if (hasError) {
      setHasError(false);
    }

    const newCode = ["", "", "", ""];

    cleaned.split("").forEach((digit, index) => {
      newCode[index] = digit;
    });

    setCode(newCode);

    if (cleaned.length === 4) {
      hiddenInputRef.current?.blur();

      verificarCodigo(cleaned);
    }
  };

  const isInputActive = (index: number) => {
    if (index === 0) return true;

    return code[index - 1] !== "";
  };

  if (!isMounted) return null;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        {/* Fundo */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(0,0,0,0.25)",
                opacity: overlayOpacity,
              },
            ]}
          />
        </Pressable>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {/* HEADER */}
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 50) },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* INPUT INVISÍVEL */}
            <TextInput
              ref={hiddenInputRef}
              value={code.join("")}
              onChangeText={handleChangeText}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              caretHidden
              blurOnSubmit={false}
              contextMenuHidden
              editable={!isLoading}
              style={styles.hiddenInput}
            />

            {/* Logo */}
            <View style={styles.logoWrapper}>
              <AppLogo />
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>🚗 Área do motorista</Text>
              </View>
            </View>

            {/* Títulos */}
            <Text style={styles.title}>Insira o código</Text>

            <Text style={styles.subtitle}>
              Código de verificação enviado para SMS
            </Text>

            {/* Inputs */}
            <Pressable
              style={styles.codeContainer}
              disabled={isLoading}
              onPress={() => {
                hiddenInputRef.current?.blur();

                setTimeout(() => {
                  hiddenInputRef.current?.focus();
                }, 50);
              }}
            >
              {code.map((digit, index) => {
                const active = isInputActive(index);

                return (
                  <View key={index} style={styles.inputWrapper}>
                    <View style={styles.codeInput}>
                      <Text
                        style={[
                          styles.codeText,
                          {
                            color: active ? "#000" : "#D9D9D9",
                          },
                        ]}
                      >
                        {digit || "0"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.inputLine,
                        {
                          backgroundColor: hasError
                            ? "#D32F2F"
                            : active
                              ? "#F2A199"
                              : "#E5E5E5",
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </Pressable>

            {/* erro */}
            {hasError && (
              <View style={styles.errorContainer}>
                <ErrorBanner message="Código incorreto. Verifique o SMS e tente novamente." />
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 16) + espacoDoTeclado,
              },
            ]}
          >
            {/* botão */}
            <TouchableOpacity
              style={[
                styles.resendButton,
                isLoading
                  ? styles.resendButtonLoading
                  : countdown > 0
                    ? styles.resendButtonDisabled
                    : styles.resendButtonActive,
              ]}
              disabled={countdown > 0 || isLoading}
              onPress={() => {
                setCountdown(60);
                setHasError(false);
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text
                  style={[
                    styles.resendButtonText,
                    countdown > 0 && styles.resendButtonTextDisabled,
                  ]}
                >
                  {countdown > 0
                    ? `Reenviar em ${countdown} s`
                    : "Reenviar código"}
                </Text>
              )}
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                onPress={receberCodigo}
                disabled={recebendoCodigo || isLoading}
                style={styles.testClickableContainer}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.testClickableText,
                    (recebendoCodigo || isLoading) &&
                      styles.testClickableTextDisabled,
                  ]}
                >
                  Receber código
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
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

  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    padding: 4,
  },

  bodyScroll: {
    flex: 1,
  },

  footer: {
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },

  body: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 32,
  },

  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 20,
    height: 20,
  },

  logoWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 3,
  },

  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 28,
  },

  inputWrapper: {
    alignItems: "center",
    width: "20%",
  },

  codeInput: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    width: "100%",
  },

  codeText: {
    fontSize: 32,
    fontWeight: "400",
    textAlign: "center",
  },

  inputLine: {
    height: 1.5,
    width: "100%",
  },

  errorContainer: {
    width: "100%",
    paddingHorizontal: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  resendButton: {
    width: "100%",
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  resendButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },

  resendButtonActive: {
    backgroundColor: "#FFD200",
  },

  resendButtonLoading: {
    backgroundColor: "#FFD200",
  },

  resendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },

  resendButtonTextDisabled: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A0A0A0",
  },

  testClickableContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },

  testClickableText: {
    fontSize: 13,
    color: "#8A8A8A",
    fontWeight: "500",
    textDecorationLine: "underline",
  },

  testClickableTextDisabled: {
    color: "#A0A0A0",
  },
});
