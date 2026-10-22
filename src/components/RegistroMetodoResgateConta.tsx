import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TextInput } from "@/components/common/Texto";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BANCOS,
  mensagemDeErro,
  MetodoResgate,
  pedirCodigoDaConta,
  salvarMetodoResgate,
  somenteDigitos,
} from "@/domain/carteira";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  existente?: MetodoResgate | null;
  onSalvo?: () => void;
}

const separarNome = (completo: string | null | undefined) => {
  const partes = (completo ?? "").trim().split(/\s+/).filter(Boolean);
  return partes.length > 1
    ? {
        nome: partes.slice(0, -1).join(" "),
        sobrenome: partes[partes.length - 1],
      }
    : { nome: partes[0] ?? "", sobrenome: "" };
};

export default function AdicionarMetodoResgateConta({
  visible,
  onClose,
  duration = 200,
  existente = null,
  onSalvo,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // começa com a conta já salva, quando é edição
  const [nome, setNome] = useState(
    () => separarNome(existente?.titular_nome).nome,
  );
  const [sobrenome, setSobrenome] = useState(
    () => separarNome(existente?.titular_nome).sobrenome,
  );
  const [cpf, setCpf] = useState(existente?.documento ?? "");
  const [banco, setBanco] = useState<{ codigo: string; nome: string } | null>(
    existente?.banco_codigo && existente.banco_nome
      ? { codigo: existente.banco_codigo, nome: existente.banco_nome }
      : null,
  );
  const [escolhendoBanco, setEscolhendoBanco] = useState(false);
  const [agencia, setAgencia] = useState(existente?.agencia ?? "");
  const [agenciaDigito, setAgenciaDigito] = useState(
    existente?.agencia_digito ?? "",
  );
  const [conta, setConta] = useState(existente?.conta ?? "");
  const [contaDigito, setContaDigito] = useState(existente?.conta_digito ?? "");
  const [tipoConta, setTipoConta] = useState<"corrente" | "poupanca">(
    existente?.conta_tipo ?? "corrente",
  );
  const [smsCode, setSmsCode] = useState("");
  const [avisoCodigo, setAvisoCodigo] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const documento = somenteDigitos(cpf);
  const isFormValid =
    nome.trim().length > 0 &&
    sobrenome.trim().length > 0 &&
    (documento.length === 11 || documento.length === 14) &&
    banco !== null &&
    agencia.trim().length > 0 &&
    conta.trim().length > 0 &&
    contaDigito.trim().length > 0 &&
    /^\d{6}$/.test(smsCode);

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

  const salvar = async () => {
    if (!isFormValid || banco === null || salvando) return;
    setSalvando(true);
    setErro("");
    try {
      await salvarMetodoResgate({
        tipo: "conta",
        titular_nome: `${nome.trim()} ${sobrenome.trim()}`,
        documento,
        banco_codigo: banco.codigo,
        banco_nome: banco.nome,
        agencia,
        agencia_digito: agenciaDigito || null,
        conta,
        conta_digito: contaDigito,
        conta_tipo: tipoConta,
        codigo: smsCode,
      });
      setSmsCode("");
      setAvisoCodigo("");
      onSalvo?.();
    } catch (falha) {
      setErro(mensagemDeErro(falha, "Não foi possível salvar a conta agora."));
    } finally {
      setSalvando(false);
    }
  };

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
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Método de resgate</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* FORMULÁRIO */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <Text style={styles.mainDescription}>
            Registre sua conta bancária para transferir seus ganhos
          </Text>

          <Text style={styles.warningText}>
            O nome e CPF/CNPJ informados devem obrigatoriamente corresponder ao
            beneficiário da conta
          </Text>

          {/* INPUTS DE IDENTIFICAÇÃO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primeiro nome & nome do meio</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome"
              autoCapitalize="words"
            />
            <View style={styles.line} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Último Nome</Text>
            <TextInput
              style={styles.input}
              value={sobrenome}
              onChangeText={setSobrenome}
              placeholder="Sobrenome"
              autoCapitalize="words"
            />
            <View style={styles.line} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CPF/CNPJ</Text>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={setCpf}
              keyboardType="numeric"
              placeholder="000.000.000-00"
            />
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.inputGroup}
            accessibilityRole="button"
            accessibilityLabel="Escolher banco"
            onPress={() => setEscolhendoBanco((atual) => !atual)}
          >
            <Text style={styles.label}>Banco</Text>
            <View style={styles.rowBetween}>
              <Text style={[styles.bankValue, !banco && styles.placeholder]}>
                {banco ? `${banco.codigo} - ${banco.nome}` : "Escolha o banco"}
              </Text>
              <Ionicons
                name={escolhendoBanco ? "caret-down" : "caret-forward"}
                size={14}
                color="#111"
              />
            </View>
            <View style={styles.line} />
          </TouchableOpacity>

          {escolhendoBanco && (
            <View style={styles.listaBancos}>
              {BANCOS.map((item) => (
                <TouchableOpacity
                  key={item.codigo}
                  style={styles.bancoItem}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: banco?.codigo === item.codigo,
                  }}
                  onPress={() => {
                    setBanco(item);
                    setEscolhendoBanco(false);
                  }}
                >
                  <Text style={styles.bancoTexto}>
                    {item.codigo} - {item.nome}
                  </Text>
                  {banco?.codigo === item.codigo && (
                    <Ionicons name="checkmark" size={18} color="#111" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.subNote}>
            Não esqueça de preencher o dígito, se tiver.
          </Text>

          {/* AGÊNCIA E CONTA */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 3, marginRight: 20 }]}>
              <Text style={styles.label}>Agência</Text>
              <TextInput
                style={styles.inputBold}
                value={agencia}
                onChangeText={setAgencia}
                keyboardType="numeric"
                maxLength={5}
              />
              <View style={styles.line} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Dígito</Text>
              <TextInput
                style={styles.inputBold}
                value={agenciaDigito}
                onChangeText={setAgenciaDigito}
                maxLength={1}
                autoCapitalize="characters"
              />
              <View style={styles.line} />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 3, marginRight: 20 }]}>
              <Text style={styles.label}>Conta</Text>
              <TextInput
                style={styles.inputBold}
                value={conta}
                onChangeText={setConta}
                keyboardType="numeric"
                maxLength={13}
              />
              <View style={styles.line} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Dígito</Text>
              <TextInput
                style={styles.inputBold}
                value={contaDigito}
                onChangeText={setContaDigito}
                maxLength={1}
                autoCapitalize="characters"
              />
              <View style={styles.line} />
            </View>
          </View>

          {/* TIPO DE CONTA */}
          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => setTipoConta("corrente")}
          >
            <Ionicons
              name={
                tipoConta === "corrente"
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={24}
              color={tipoConta === "corrente" ? "#111" : "#ccc"}
            />
            <View style={styles.radioLabelContainer}>
              <Text style={styles.radioTitle}>Conta corrente</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => setTipoConta("poupanca")}
          >
            <Ionicons
              name={
                tipoConta === "poupanca"
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={24}
              color={tipoConta === "poupanca" ? "#111" : "#ccc"}
            />
            <View style={styles.radioLabelContainer}>
              <Text style={styles.radioTitle}>Conta poupança</Text>
            </View>
          </TouchableOpacity>

          {/* VERIFICAÇÃO SMS */}
          <View style={styles.smsContainer}>
            <Text style={styles.smsLabel}>Código de verificação por SMS</Text>
            <View style={styles.rowBetween}>
              <TextInput
                placeholder="Código"
                style={styles.smsInput}
                keyboardType="numeric"
                value={smsCode}
                onChangeText={setSmsCode}
                maxLength={6}
              />
              <TouchableOpacity
                accessibilityRole="button"
                disabled={enviandoCodigo}
                onPress={() => void enviarCodigo()}
              >
                {enviandoCodigo ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.sendText}>
                    {avisoCodigo ? "Reenviar" : "Enviar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.line} />
            {!!avisoCodigo && (
              <Text style={styles.avisoCodigo}>{avisoCodigo}</Text>
            )}
          </View>

          {!!erro && (
            <Text style={styles.erroTexto} accessibilityRole="alert">
              {erro}
            </Text>
          )}

          {/* BOTÃO ADICIONAR (Habilitado apenas se isFormValid for true) */}
          <TouchableOpacity
            style={[styles.btnAdd, isFormValid && styles.btnAddActive]}
            disabled={!isFormValid || salvando}
            accessibilityRole="button"
            onPress={() => void salvar()}
          >
            {salvando ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text
                style={[
                  styles.btnAddText,
                  isFormValid && styles.btnAddTextActive,
                ]}
              >
                {existente ? "Salvar conta" : "Adicionar conta"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { color: "#999" },
  listaBancos: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  bancoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
  },
  bancoTexto: { fontSize: 15, color: "#111" },
  avisoCodigo: { fontSize: 13, color: "#2DB089", marginTop: 8 },
  erroTexto: { fontSize: 13, color: "#C62828", marginBottom: 12 },
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
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 17, fontWeight: "500", color: "#111" },
  body: { flex: 1, paddingHorizontal: 20 },
  mainDescription: {
    fontSize: 20,
    fontWeight: "500",
    color: "#333",
    marginTop: 20,
    lineHeight: 26,
  },
  warningText: {
    fontSize: 14,
    color: "#999",
    marginTop: 15,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: { marginTop: 20 },
  label: { fontSize: 14, color: "#999", marginBottom: 5 },
  input: { fontSize: 18, fontWeight: "700", color: "#111", paddingVertical: 2 },
  inputBold: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    paddingVertical: 2,
  },
  bankValue: { fontSize: 18, fontWeight: "700", color: "#000" },
  line: { height: 1, backgroundColor: "#eee", marginTop: 5 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subNote: { fontSize: 13, color: "#333", marginTop: 20 },
  rowInputs: { flexDirection: "row" },
  radioRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 30 },
  radioLabelContainer: { marginLeft: 15 },
  radioTitle: { fontSize: 15, color: "#999", marginBottom: 4 },
  radioSub: { fontSize: 14, color: "#666", fontWeight: "500" },
  smsContainer: { marginTop: 40, marginBottom: 30 },
  smsLabel: { fontSize: 18, color: "#999", marginBottom: 10 },
  smsInput: { flex: 1, fontSize: 18, paddingVertical: 5 },
  sendText: { color: "#FF6600", fontSize: 16, fontWeight: "600" },
  btnAdd: {
    backgroundColor: "#F0F0F0",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  btnAddActive: { backgroundColor: "#FFD700" },
  btnAddText: { color: "#CCC", fontSize: 18, fontWeight: "700" },
  btnAddTextActive: { color: "#111" },
});
