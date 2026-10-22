import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text, TextInput } from "@/components/common/Texto";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MetodoResgateAdicionado from "./MetodoResgateAdicionado";
import {
  detectarTipoChavePix,
  mensagemDeErro,
  MetodoResgate,
  ROTULO_CHAVE_PIX,
  pedirCodigoDaConta,
  salvarMetodoResgate,
} from "@/domain/carteira";

const { width, height } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  existente?: MetodoResgate | null;
  onSalvo?: () => void;
}

export default function AdicionarMetodoResgate({
  visible,
  onClose,
  duration = 200,
  existente = null,
  onSalvo,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [slideConfirm] = useState(() => new Animated.Value(height));
  const [confirmOverlayOpacity] = useState(() => new Animated.Value(0));

  const [isMounted, setIsMounted] = useState(visible);
  const [chavePix, setChavePix] = useState("");
  const [cpf, setCpf] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [visibleMetodoResgateAdicionado, setMetodoResgateAdicionado] =
    useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");
  const [avisoCodigo, setAvisoCodigo] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const tipoDaChave = detectarTipoChavePix(chavePix);
  const documentoDigitos = cpf.replace(/\D/g, "");
  const podeAdicionar =
    tipoDaChave !== null &&
    (documentoDigitos.length === 11 || documentoDigitos.length === 14) &&
    /^\d{6}$/.test(codigo);

  const enviarCodigo = async () => {
    if (enviandoCodigo) return;
    setEnviandoCodigo(true);
    setErro("");
    try {
      const resposta = await pedirCodigoDaConta();
      setAvisoCodigo(
        resposta.codigo_teste
          ? `Ambiente de teste: o código é ${resposta.codigo_teste}`
          : "Enviamos um código por SMS.",
      );
    } catch (falha) {
      setErro(mensagemDeErro(falha, "Não foi possível enviar o código."));
    } finally {
      setEnviandoCodigo(false);
    }
  };

  const toggleConfirm = useCallback(
    (show: boolean) => {
      if (show) {
        Keyboard.dismiss();
        setShowConfirm(true);

        Animated.parallel([
          Animated.timing(slideConfirm, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(confirmOverlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(slideConfirm, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(confirmOverlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setShowConfirm(false));
      }
    },
    [confirmOverlayOpacity, slideConfirm],
  );

  const salvar = async () => {
    if (!podeAdicionar || tipoDaChave === null || salvando) return;
    setSalvando(true);
    setErro("");
    try {
      await salvarMetodoResgate({
        tipo: "pix",
        pix_tipo: tipoDaChave,
        pix_chave: chavePix,
        documento: cpf,
        codigo,
      });
      setCodigo("");
      setAvisoCodigo("");
      toggleConfirm(false);
      setMetodoResgateAdicionado(true);
      onSalvo?.();
    } catch (falha) {
      setErro(mensagemDeErro(falha, "Não foi possível salvar a chave agora."));
    } finally {
      setSalvando(false);
    }
  };

  const handleDrawerClose = useCallback(() => {
    setChavePix("");
    setCpf("");
    setCodigo("");
    setAvisoCodigo("");
    setErro("");
    setShowConfirm(false);
    setMetodoResgateAdicionado(false);
    onClose();
  }, [onClose]);

  // chave salva: fechar o aviso de sucesso volta para a lista de métodos
  const handleSaqueStatusClose = () => {
    setMetodoResgateAdicionado(false);
    handleDrawerClose();
  };

  useEffect(() => {
    const onBackPress = () => {
      if (showConfirm) {
        toggleConfirm(false);
        return true;
      }
      if (visibleMetodoResgateAdicionado) {
        // Se MetodoResgateAdicionado estiver aberto, fecha ele primeiro
        setMetodoResgateAdicionado(false);
        return true;
      }
      if (visible) {
        handleDrawerClose();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    visible,
    showConfirm,
    visibleMetodoResgateAdicionado,
    onClose,
    toggleConfirm,
    handleDrawerClose,
  ]);

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
  }, [visible, duration, translateX, overlayOpacity]);

  if (!isMounted) return null;

  return (
    <>
      <MetodoResgateAdicionado
        visible={visibleMetodoResgateAdicionado}
        onClose={handleSaqueStatusClose}
      />
      <View style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
        {/* Overlay geral do drawer */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => (showConfirm ? toggleConfirm(false) : onClose())}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
            onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.headerContent}>
              <View style={styles.leftHeader}>
                <TouchableOpacity onPress={handleDrawerClose}>
                  <Ionicons name="chevron-back" size={26} color="#111" />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerTitle}>Método de resgate</Text>
              <View style={{ width: 60 }} />
            </View>
          </View>

          {/* Overlay apenas entre header e modal */}
          {showConfirm && !visibleMetodoResgateAdicionado && (
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { top: headerHeight, zIndex: 5 },
              ]}
              onPress={() => toggleConfirm(false)}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,0.35)",
                    opacity: confirmOverlayOpacity,
                  },
                ]}
              />
            </Pressable>
          )}

          <View style={styles.body}>
            <View style={styles.divider} />
            <View style={styles.illustrationContainer}>
              <View style={styles.pixIconWrapper}>
                <Ionicons name="cash-outline" size={60} color="#000" />
                <View style={styles.checkCircle}>
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
              </View>
            </View>
            <View style={styles.resgateContainer}>
              <Text style={styles.resgateLabel}>
                {existente
                  ? "Trocar a chave Pix"
                  : "Adicionar chave Pix para resgate"}
              </Text>
              {existente && (
                <Text style={styles.chaveAtual}>
                  Chave atual: {existente.descricao.replace(/^Pix · /, "")}
                </Text>
              )}
              <Text style={styles.sectionTitle}>Chave Pix*</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Celular, CPF/CNPJ, e-mail, chave aleatória"
                  keyboardType="default"
                  value={chavePix}
                  onChangeText={(texto) => {
                    setChavePix(texto);
                    setErro("");
                  }}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  accessibilityLabel="Chave Pix"
                />
              </View>
              {!!chavePix.trim() && (
                <Text
                  style={[
                    styles.tipoDetectado,
                    !tipoDaChave && styles.tipoNaoReconhecido,
                  ]}
                >
                  {tipoDaChave
                    ? `Tipo: ${ROTULO_CHAVE_PIX[tipoDaChave]}`
                    : "Não reconhecemos essa chave. Confira o que foi digitado."}
                </Text>
              )}

              <Text style={styles.sectionTitle}>CPF/CNPJ*</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="CPF/CNPJ"
                  keyboardType="numeric"
                  value={cpf}
                  onChangeText={(texto) => {
                    setCpf(texto);
                    setErro("");
                  }}
                  placeholderTextColor="#999"
                  accessibilityLabel="CPF ou CNPJ do titular"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Código de verificação por SMS*
              </Text>
              <View style={[styles.inputWrapper, styles.codigoWrapper]}>
                <TextInput
                  style={[styles.input, styles.codigoInput]}
                  placeholder="Código"
                  keyboardType="numeric"
                  maxLength={6}
                  value={codigo}
                  onChangeText={(texto) => {
                    setCodigo(texto.replace(/\D/g, ""));
                    setErro("");
                  }}
                  placeholderTextColor="#999"
                  accessibilityLabel="Código de verificação"
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={enviandoCodigo}
                  onPress={() => void enviarCodigo()}
                >
                  {enviandoCodigo ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <Text style={styles.enviarCodigo}>
                      {avisoCodigo ? "Reenviar" : "Enviar"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {!!avisoCodigo && (
                <Text style={styles.avisoCodigo}>{avisoCodigo}</Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.btnAdicionar,
                !podeAdicionar && styles.btnDisabled,
              ]}
              disabled={!podeAdicionar}
              accessibilityRole="button"
              onPress={() => toggleConfirm(true)}
            >
              <Text
                style={[
                  styles.btnAdicionarText,
                  !podeAdicionar && styles.btnTextDisabled,
                ]}
              >
                Adicionar
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* MODAL CONFIRMAÇÃO */}
        {showConfirm && (
          <Animated.View
            style={[
              styles.confirmModal,
              { transform: [{ translateY: slideConfirm }] },
            ]}
          >
            <View style={styles.confirmHeader}>
              <TouchableOpacity
                onPress={() => toggleConfirm(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={28} color="#111" />
              </TouchableOpacity>
              <Text style={styles.confirmTitle}>Confirmar informações</Text>
            </View>

            <View style={styles.confirmBody}>
              <Text style={styles.confirmValueLabel}>
                Confirme se suas informações de resgate estão corretas para
                garantir que o saldo seja enviado para conta correta
              </Text>

              <View style={styles.confirmDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chave Pix saque</Text>
                  <Text style={styles.detailValue}>{chavePix}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tipo da chave</Text>
                  <Text style={styles.detailValue}>
                    {tipoDaChave ? ROTULO_CHAVE_PIX[tipoDaChave] : "—"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CPF/CNPJ</Text>
                  <Text style={styles.detailValue}>{cpf}</Text>
                </View>
              </View>
            </View>

            <View style={styles.confirmFooter}>
              {!!erro && (
                <Text style={styles.erroTexto} accessibilityRole="alert">
                  {erro}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.btnConfirmarFinal, salvando && { opacity: 0.6 }]}
                disabled={salvando}
                accessibilityRole="button"
                onPress={() => void salvar()}
              >
                {salvando ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.btnConfirmarText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  codigoWrapper: { flexDirection: "row", alignItems: "center" },
  codigoInput: { flex: 1 },
  enviarCodigo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6600",
    paddingHorizontal: 8,
  },
  avisoCodigo: {
    fontSize: 13,
    color: "#2DB089",
    marginTop: -8,
    marginBottom: 12,
  },
  chaveAtual: { fontSize: 14, color: "#666", marginBottom: 16 },
  tipoDetectado: {
    fontSize: 13,
    color: "#2DB089",
    marginTop: -8,
    marginBottom: 12,
  },
  tipoNaoReconhecido: { color: "#C62828" },
  erroTexto: { fontSize: 13, color: "#C62828", marginBottom: 10 },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEE",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  body: { flex: 1 },
  illustrationContainer: {
    marginTop: 30,
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  pixIconWrapper: {
    position: "relative",
  },
  checkCircle: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "blue",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  sectionValue: { fontSize: 16 },
  divider: { height: 1, backgroundColor: "#F0F0F" },
  resgateContainer: { padding: 20 },
  resgateLabel: { fontSize: 25, fontWeight: "500", marginBottom: 15 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
    marginTop: 20,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 17, fontWeight: "300" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center" },
  infoLabel: { fontSize: 14, color: "#999" },
  infoValue: { fontSize: 14, color: "#666" },
  footer: { padding: 20, paddingBottom: 35 },
  btnAdicionar: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#F5F5F5" },
  btnAdicionarText: { fontSize: 18, fontWeight: "700", color: "#000" },
  btnTextDisabled: { color: "#CCC" },
  confirmModal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 35,
    zIndex: 20,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  closeModalBtn: { padding: 4 },
  confirmTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 32,
  },
  confirmBody: { padding: 24, alignItems: "center" },
  confirmValueLabel: { fontSize: 17, marginBottom: 8 },
  confirmValueLarge: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 30,
  },
  confirmDetails: {
    width: "100%",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 17, fontWeight: 200, color: "#666" },
  detailValue: { fontSize: 15, fontWeight: "600" },
  confirmFooter: { paddingHorizontal: 20 },
  btnConfirmarFinal: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  btnConfirmarText: { fontSize: 18, fontWeight: "700" },
});
