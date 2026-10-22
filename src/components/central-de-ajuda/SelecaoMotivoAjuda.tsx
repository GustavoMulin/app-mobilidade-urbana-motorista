import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import ConfirmarStatusCobranca from "./ConfirmarStatusCobranca";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function SelecaoMotivoAjuda({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [selected, setSelected] = useState<number | null>(null);
  const [showConfirmarStatusCobranca, setShowConfirmarStatusCobranca] =
    useState(false);

  const motivos = [
    "Eu cobrei o cliente em dinheiro, mas ele não pagou ou pagou parcialmente",
    "Eu fiz o pagamento de uma viagem com cartão, mas o depósito ainda não foi creditado em meu saldo",
    "Recebi o pagamento na minha conta, mas não concordo com o valor",
    "Tenho dúvidas sobre o valor do depósito na minha conta e preciso de esclarecimentos",
  ];

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
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        {/* Overlay */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
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
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back-outline" size={26} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Central de ajuda</Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <Text style={styles.title}>
              Viagem em dinheiro não paga pelo passageiro
            </Text>

            <Text style={styles.description}>
              Estamos aqui para ajudar você! Aqui está o que você precisa
              confirmar.
            </Text>

            <Text style={styles.question}>
              <Text style={{ color: "red" }}>*</Text> Com o que você precisa de
              ajuda?
            </Text>

            {/* LISTA */}
            {motivos.map((motivo, index) => {
              const isSelected = selected === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.option}
                  activeOpacity={0.8}
                  onPress={() => setSelected(index)}
                >
                  <Text style={styles.optionText}>{motivo}</Text>

                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, selected === null && { opacity: 0.5 }]}
              disabled={selected === null}
              onPress={() => {
                setShowConfirmarStatusCobranca(true);
                console.log("Selecionado:", motivos[selected!]);
              }}
            >
              <Text style={styles.buttonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <ConfirmarStatusCobranca
        visible={showConfirmarStatusCobranca}
        onClose={() => setShowConfirmarStatusCobranca(false)}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },

  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },

  question: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111",
  },

  option: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  optionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginRight: 10,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#111",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111",
  },

  footer: {
    padding: 16,
    backgroundColor: "#f7f7f7",
  },

  button: {
    backgroundColor: "#FFD600",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
