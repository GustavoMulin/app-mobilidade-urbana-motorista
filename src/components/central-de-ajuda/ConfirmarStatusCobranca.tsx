import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TextInput } from "@/components/common/Texto";
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
import SolicitacaoEnviada from "./SolicitacaoEnviada";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const Radio = ({ active }: { active: boolean }) => (
  <View style={[styles.radio, active && styles.radioSelected]}>
    {active && <View style={styles.radioInner} />}
  </View>
);

export default function ConfirmarStatusCobranca({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // Estados de Fluxo
  const [tipo, setTipo] = useState<"nao_pagou" | "parcial" | null>(null);
  const [motivoNaoPagamento, setMotivoNaoPagamento] = useState<string | null>(
    null,
  );
  const [detalheProblema, setDetalheProblema] = useState<string | null>(null);

  // Estados de Input/Dados
  const [valor, setValor] = useState("");
  const [obsAdicional, setObsAdicional] = useState("");

  const [showSolicitacaoEnviada, setShowSolicitacaoEnviada] = useState(false);

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
  }, [duration, overlayOpacity, translateX, visible]);

  if (!isMounted) return null;

  const canSubmit =
    (tipo === "parcial" && valor.length > 0) || detalheProblema !== null;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back-outline" size={26} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Confirmar status da cobrança
              </Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            <View style={styles.body}>
              <Text style={styles.sectionTitle}>O que aconteceu?</Text>
              <Text style={styles.tripInfo}>
                01/04/2026 18:44:10 | Brazil-Pop{" "}
                <Text style={{ fontWeight: "700" }}>R$7.40</Text>
              </Text>
              <Text style={styles.address}>• Rua Altemar Dutra, 3759</Text>
              <Text style={styles.address}>
                • Rua Alexandre Guimarães, 8906
              </Text>

              {/* CARD 1: STATUS PRINCIPAL */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Confirme o status da sua cobrança
                </Text>

                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    setTipo("nao_pagou");
                    setValor("");
                  }}
                >
                  <Text style={styles.optionText}>
                    O passageiro não pagou nada.
                  </Text>
                  <Radio active={tipo === "nao_pagou"} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    setTipo("parcial");
                    setMotivoNaoPagamento(null);
                    setDetalheProblema(null);
                  }}
                >
                  <Text style={styles.optionText}>
                    O passageiro pagou parcialmente
                  </Text>
                  <Radio active={tipo === "parcial"} />
                </TouchableOpacity>

                {tipo === "parcial" && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      Digite o valor recebido
                    </Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="R$ 0,00"
                      value={valor}
                      onChangeText={setValor}
                    />
                  </View>
                )}
              </View>

              {/* CARD 2: MOTIVO (Aparece se selecionado 'não pagou') */}
              {tipo === "nao_pagou" && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Qual foi o motivo?</Text>
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => setMotivoNaoPagamento("disposto_problema")}
                  >
                    <Text style={styles.optionText}>
                      O passageiro estava disposto a pagar, mas teve problemas
                      com o pagamento
                    </Text>
                    <Radio
                      active={motivoNaoPagamento === "disposto_problema"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      setMotivoNaoPagamento("recusou");
                      setDetalheProblema(null);
                    }}
                  >
                    <Text style={styles.optionText}>
                      O passageiro se recusou a pagar
                    </Text>
                    <Radio active={motivoNaoPagamento === "recusou"} />
                  </TouchableOpacity>
                </View>
              )}

              {/* CARD 3: DETALHE DO PROBLEMA */}
              {motivoNaoPagamento === "disposto_problema" && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Qual foi o problema?</Text>
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => setDetalheProblema("dinheiro_insuficiente")}
                  >
                    <Text style={styles.optionText}>
                      O passageiro não tinha dinheiro suficiente
                    </Text>
                    <Radio
                      active={detalheProblema === "dinheiro_insuficiente"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => setDetalheProblema("problema_app")}
                  >
                    <Text style={styles.optionText}>
                      O passageiro teve problemas com o aplicativo
                    </Text>
                    <Radio active={detalheProblema === "problema_app"} />
                  </TouchableOpacity>
                </View>
              )}

              {/* CARD 4 & 5: OBSERVAÇÕES E PROVAS (Aparece no final do fluxo específico) */}
              {detalheProblema === "dinheiro_insuficiente" && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Adicione qualquer informação adicional aqui (opcional)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { height: 80, textAlignVertical: "top" },
                      ]}
                      multiline
                      placeholder="Descreva aqui..."
                      value={obsAdicional}
                      onChangeText={setObsAdicional}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Enviar provas (opcional)
                    </Text>
                    <TouchableOpacity style={styles.attachButton}>
                      <Ionicons name="camera-outline" size={24} color="#666" />
                      <Text style={styles.attachButtonText}>
                        Tirar foto ou anexar arquivo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              disabled={!canSubmit}
              style={[styles.button, !canSubmit && { backgroundColor: "#ddd" }]}
              onPress={() => {
                console.log("Submit:", {
                  tipo,
                  motivoNaoPagamento,
                  detalheProblema,
                  valor,
                  obsAdicional,
                });
                setShowSolicitacaoEnviada(true);
              }}
            >
              <Text style={styles.buttonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <SolicitacaoEnviada
        visible={showSolicitacaoEnviada}
        onClose={() => setShowSolicitacaoEnviada(false)}
      />
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
    backgroundColor: "#f7f7f7",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e5e5",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  scrollContainer: { flex: 1 },
  body: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  tripInfo: { fontSize: 13, color: "#666", marginBottom: 6 },
  address: { fontSize: 13, color: "#444", marginBottom: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    color: "#222",
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  optionText: { fontSize: 14, color: "#333", flex: 1, paddingRight: 10 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: "#111" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111",
  },
  inputContainer: { marginTop: 15 },
  inputLabel: { fontSize: 12, color: "#666", marginBottom: 6 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 5,
  },
  attachButtonText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
  },
  button: {
    backgroundColor: "#FFD600",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#000" },
});
