import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function MetodosPagamento({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [pagamentos, setPagamentos] = useState({
    app: true,
    dinheiro: true,
    maquininha: false,
  });

  const togglePagamento = (key: keyof typeof pagamentos) => {
    if (key === "app") return; // não pode desativar o pagamento no app
    setPagamentos((prev) => ({ ...prev, [key]: !prev[key] }));
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
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      {/* Fundo escurecido */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* Drawer deslizante */}
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
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Opções de pagamento</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Selecione abaixo as opções de pagamento que você aceita. Assim,
            selecionamos os passageiros certos para você 😊
          </Text>

          {/* Cartões de pagamento */}
          <View style={styles.cardContainer}>
            {/* Pagamento no App */}
            <View style={[styles.card, { opacity: 0.7 }]}>
              <View style={styles.cardLeft}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color="#111"
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>Pagamento no app</Text>
                  <Text style={styles.cardSubtitle}>
                    Não pode ser desabilitado
                  </Text>
                </View>
              </View>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#bbb"
                style={{ marginLeft: 4 }}
              />
            </View>

            {/* Dinheiro */}
            <TouchableOpacity
              style={[styles.card, pagamentos.dinheiro && styles.cardSelected]}
              onPress={() => togglePagamento("dinheiro")}
            >
              <View style={styles.cardLeft}>
                <Ionicons name="cash-outline" size={22} color="#111" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>Dinheiro</Text>
                </View>
              </View>
              <Ionicons
                name={
                  pagamentos.dinheiro ? "checkmark-circle" : "ellipse-outline"
                }
                size={22}
                color={pagamentos.dinheiro ? "#ffb300" : "#aaa"}
              />
            </TouchableOpacity>

            {/* Maquininha de Débito */}
            <TouchableOpacity
              style={[
                styles.card,
                pagamentos.maquininha && styles.cardSelected,
              ]}
              onPress={() => togglePagamento("maquininha")}
            >
              <View style={styles.cardLeft}>
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={22}
                  color="#111"
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>Maquininha de Débito</Text>
                  <Text style={styles.cardSubtitle}>Visa/Mastercard</Text>
                </View>
              </View>
              <Ionicons
                name={
                  pagamentos.maquininha ? "checkmark-circle" : "ellipse-outline"
                }
                size={22}
                color={pagamentos.maquininha ? "#ffb300" : "#aaa"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÃO CONFIRMAR */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.botaoConfirmar} onPress={onClose}>
            <Text style={styles.textoConfirmar}>Confirmar</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: "#f6f6f6",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  body: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },
  cardContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eaeaea",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    color: "#111",
    fontWeight: "500",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  cardSelected: {
    borderColor: "#ffb300",
  },
  footer: {
    padding: 16,
    backgroundColor: "#f6f6f6",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  botaoConfirmar: {
    backgroundColor: "#ffb300",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  textoConfirmar: {
    color: "#111",
    fontWeight: "600",
    fontSize: 16,
  },
});
