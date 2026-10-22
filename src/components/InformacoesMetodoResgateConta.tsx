import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import RegistroMetodoResgateConta from "./RegistroMetodoResgateConta";
import { MetodoResgate } from "@/domain/carteira";

// mostra só o começo e o fim do CPF/CNPJ do titular
const mascararDocumento = (documento: string) =>
  documento.length === 14
    ? `${documento.slice(0, 2)}.•••.•••/••••-${documento.slice(-2)}`
    : `•••.${documento.slice(3, 6)}.•••-${documento.slice(-2)}`;

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  conta: MetodoResgate | null;
  onSalvo?: () => void;
}

export default function InformacoesMetodoResgateConta({
  visible,
  onClose,
  duration = 200,
  conta,
  onSalvo,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [
    visibleRegistroMetodoResgateConta,
    setVisibleRegistroMetodoResgateConta,
  ] = useState(false);

  const mostrarRegistroMetodoResgateConta = () => {
    setVisibleRegistroMetodoResgateConta(true);
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
    <>
      <RegistroMetodoResgateConta
        visible={visibleRegistroMetodoResgateConta}
        existente={conta}
        onSalvo={() => {
          setVisibleRegistroMetodoResgateConta(false);
          onSalvo?.();
        }}
        onClose={() => setVisibleRegistroMetodoResgateConta(false)}
      />

      <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* HEADER RETO */}
          <View
            style={[
              styles.orangeHeader,
              { paddingTop: Math.max(insets.top + 12, 50) },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTextMain}>Método de resgate</Text>

            <View style={styles.headerInfoContainer}>
              <Text style={styles.headerTitleLarge}>Conta bancária</Text>
              <Text style={styles.headerSubText}>
                {conta?.principal
                  ? "Seus saques vão para esta conta."
                  : "Para sacar para esta conta, escolha-a em Saldo > Configurações."}
              </Text>
            </View>
          </View>

          {/* BODY SOBREPONDO HEADER */}
          <View style={styles.bodyContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>Dados da conta bancária</Text>
                  <TouchableOpacity onPress={mostrarRegistroMetodoResgateConta}>
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.label}>Nome</Text>
                  <Text style={styles.value}>{conta?.titular_nome ?? "—"}</Text>
                  <View style={styles.line} />
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.label}>CPF/CNPJ</Text>
                  <Text style={styles.value}>
                    {conta ? mascararDocumento(conta.documento) : "—"}
                  </Text>
                  <View style={styles.line} />
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.label}>Banco</Text>
                  <Text style={styles.value}>
                    {conta
                      ? `${conta.banco_codigo} - ${conta.banco_nome}`
                      : "—"}
                  </Text>
                  <View style={styles.line} />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.infoGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Agência</Text>
                    <Text style={styles.value}>{conta?.agencia ?? "—"}</Text>
                    <View style={styles.line} />
                  </View>
                  <View style={{ width: 20 }} />
                  <View style={[styles.infoGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Dígito</Text>
                    <Text style={styles.value}>
                      {conta?.agencia_digito || "—"}
                    </Text>
                    <View style={styles.line} />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.infoGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Conta</Text>
                    <Text style={styles.value}>
                      {conta?.conta ? `•••${conta.conta.slice(-3)}` : "—"}
                    </Text>
                    <View style={styles.line} />
                  </View>
                  <View style={{ width: 20 }} />
                  <View style={[styles.infoGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Dígito</Text>
                    <Text style={styles.value}>
                      {conta?.conta_digito || "—"}
                    </Text>
                    <View style={styles.line} />
                  </View>
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.label}>Tipo</Text>
                  <Text style={styles.value}>
                    {conta?.conta_tipo === "corrente"
                      ? "Conta corrente"
                      : conta?.conta_tipo === "poupanca"
                        ? "Conta poupança"
                        : "—"}
                  </Text>
                  <View style={styles.line} />
                </View>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#FF6600",
  },

  /* HEADER AGORA RETO */
  orangeHeader: {
    backgroundColor: "#FF6600",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  backButton: { marginBottom: 15 },

  headerTextMain: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    position: "absolute",
    top: 55,
    alignSelf: "center",
  },

  headerInfoContainer: { marginTop: 20 },

  headerTitleLarge: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },

  headerSubText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },

  /* CONTAINER QUE SOBE */
  bodyContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },

  card: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111" },

  editText: { color: "#FF6600", fontSize: 16, fontWeight: "600" },

  infoGroup: { marginBottom: 20 },

  label: { fontSize: 13, color: "#999", marginBottom: 4 },

  value: { fontSize: 17, color: "#111", fontWeight: "500" },

  line: { height: 1, backgroundColor: "#f0f0f0", marginTop: 8 },

  rowInputs: { flexDirection: "row" },
});
