import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { api, mensagemDaApi } from "@/Services/api";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { formatarTelefone } from "@/domain/perfilMotorista";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";

const { width } = Dimensions.get("window");

type Campo = "telefone" | "email";

interface props {
  visible: boolean;
  onClose: () => void;
  campo: Campo;
  duration?: number;
}

const TEXTOS = {
  telefone: {
    titulo: "Alterar número",
    icone: "phone-portrait-outline",
    antes: "Ao alterar seu número de celular, os dados da sua conta serão ",
    destaque: "vinculados ao novo número",
    depois: ".",
    envio: "Enviaremos um código de confirmação por SMS para validar a troca.",
    destino: "por SMS para",
  },
  email: {
    titulo: "Alterar e-mail",
    icone: "mail-outline",
    antes: "Ao alterar seu e-mail, ele será usado para ",
    destaque: "recuperação de conta",
    depois: " e envio de recibos.",
    envio: "Enviaremos um código de confirmação para o novo endereço informado.",
    destino: "para",
  },
} as const;

// telefone e e-mail: o novo valor, depois o código que confirma a troca
export default function AlterarContato({
  visible,
  onClose,
  campo,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const { atualizarUsuario } = useAuth();
  const [etapa, setEtapa] = useState<"valor" | "codigo">("valor");
  const [valor, setValor] = useState("");
  const [codigo, setCodigo] = useState("");
  // só em desenvolvimento o servidor devolve o código (SMS e e-mail são simulados)
  const [codigoDev, setCodigoDev] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const textos = TEXTOS[campo];

  // no código, o voltar volta para o valor; no valor, fecha
  const voltar = () => {
    if (etapa === "codigo") {
      setEtapa("valor");
      setErro("");
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (!visible) return false;
      voltar();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  });

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
  }, [visible, translateX, overlayOpacity, duration]);

  // fechou: na próxima vez começa do zero
  useEffect(() => {
    if (visible) return;
    const limpar = setTimeout(() => {
      setEtapa("valor");
      setValor("");
      setCodigo("");
      setCodigoDev("");
      setErro("");
    }, duration);
    return () => clearTimeout(limpar);
  }, [visible, duration]);

  if (!isMounted) return null;

  const valorLimpo =
    campo === "telefone" ? valor.replace(/\D/g, "") : valor.trim();
  const valorValido =
    campo === "telefone"
      ? valorLimpo.length >= 10
      : /^\S+@\S+\.\S+$/.test(valorLimpo);

  const pedirCodigo = async () => {
    if (enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const { data } = await api.post<{ codigo?: string | number }>(
        "/usuario-alterar-contato/codigo",
        { campo, valor: valorLimpo },
      );
      setCodigoDev(data.codigo ? String(data.codigo) : "");
      setCodigo("");
      setEtapa("codigo");
    } catch (error) {
      setErro(mensagemDaApi(error, "Não foi possível enviar o código."));
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async (digitado: string) => {
    if (digitado.length !== 4 || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const { data } = await api.put("/usuario-alterar-contato", {
        campo,
        valor: valorLimpo,
        codigo: digitado,
      });
      await atualizarUsuario(data.user);
      onClose();
    } catch (error) {
      setErro(mensagemDaApi(error, "Não foi possível confirmar o código."));
      setCodigo("");
    } finally {
      setEnviando(false);
    }
  };

  const digitarCodigo = (texto: string) => {
    const numeros = texto.replace(/\D/g, "").slice(0, 4);
    setCodigo(numeros);
    if (erro) setErro("");
    if (numeros.length === 4) void confirmar(numeros);
  };

  const podeAvancar =
    etapa === "valor" ? valorValido : codigo.length === 4;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.drawer,
          {
            paddingBottom: espacoDoTeclado,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={voltar}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{textos.titulo}</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView
          style={styles.rolagem}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={etapa === "valor" ? textos.icone : "keypad-outline"}
                size={50}
                color="#444"
              />
              <View style={styles.syncBadge}>
                <Ionicons name="sync" size={14} color="#fff" />
              </View>
            </View>
          </View>

          {etapa === "valor" ? (
            <>
              <Text style={styles.infoText}>
                {textos.antes}
                <Text style={styles.boldText}>{textos.destaque}</Text>
                {textos.depois}
              </Text>
              <Text style={styles.subText}>{textos.envio}</Text>

              <View style={styles.inputContainer}>
                {campo === "telefone" ? (
                  <View style={styles.countrySelector}>
                    <Text style={styles.flagText}>🇧🇷</Text>
                    <Text style={styles.countryCode}>+55</Text>
                  </View>
                ) : (
                  <Ionicons
                    name="at-outline"
                    size={20}
                    color="#999"
                    style={styles.inputIcon}
                  />
                )}
                <TextInput
                  style={styles.input}
                  placeholder={
                    campo === "telefone"
                      ? "(00) 00000-0000"
                      : "exemplo@email.com"
                  }
                  placeholderTextColor="#999"
                  keyboardType={
                    campo === "telefone" ? "phone-pad" : "email-address"
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  value={valor}
                  onChangeText={(texto) => {
                    setValor(
                      campo === "telefone" ? formatarTelefone(texto) : texto,
                    );
                    if (erro) setErro("");
                  }}
                  onSubmitEditing={() => valorValido && void pedirCodigo()}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                Digite o código de 4 dígitos enviado {textos.destino}{" "}
                <Text style={styles.boldText}>
                  {campo === "telefone" ? formatarTelefone(valorLimpo) : valorLimpo}
                </Text>
                .
              </Text>

              <TextInput
                style={styles.codigo}
                value={codigo}
                onChangeText={digitarCodigo}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                editable={!enviando}
                placeholder="0000"
                placeholderTextColor="#D9D9D9"
                accessibilityLabel="Código de confirmação"
              />

              <TouchableOpacity
                onPress={() => void pedirCodigo()}
                disabled={enviando}
                style={styles.link}
              >
                <Text style={styles.linkTexto}>Reenviar código</Text>
              </TouchableOpacity>

              {__DEV__ && codigoDev !== "" && (
                <TouchableOpacity
                  onPress={() => digitarCodigo(codigoDev)}
                  disabled={enviando}
                  style={styles.link}
                >
                  <Text style={styles.linkDev}>Preencher código</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {erro !== "" && (
            <View style={styles.erro}>
              <ErrorBanner message={erro} />
            </View>
          )}

          {/* Botão de Ação */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: podeAvancar ? "#FFD600" : "#f0f0f0" },
            ]}
            disabled={!podeAvancar || enviando}
            onPress={() =>
              etapa === "valor" ? void pedirCodigo() : void confirmar(codigo)
            }
          >
            {enviando ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: podeAvancar ? "#111" : "#999" },
                ]}
              >
                {etapa === "valor" ? "Próximo" : "Confirmar"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  rolagem: { flex: 1 },
  body: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
  },
  illustrationContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  syncBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#111",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "700",
    color: "#000",
  },
  subText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    width: "100%",
    height: 56,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    paddingRight: 12,
    marginRight: 12,
  },
  flagText: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  codigo: {
    width: 180,
    marginTop: 12,
    fontSize: 36,
    letterSpacing: 18,
    textAlign: "center",
    color: "#111",
    borderBottomWidth: 1.5,
    borderBottomColor: "#F2A199",
    paddingVertical: 8,
  },
  link: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  linkTexto: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    textDecorationLine: "underline",
  },
  linkDev: {
    fontSize: 13,
    color: "#8A8A8A",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  erro: {
    width: "100%",
    marginTop: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto", // Empurra o botão para o rodapé
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
