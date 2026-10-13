import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

// nenhuma destas preferências é salva ainda: aparecem como "Em breve" (as
// telas antigas mostravam endereços e opções de exemplo que não valiam nada)
const ITENS_EM_BREVE: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  apoio: string;
}[] = [
  {
    icone: "navigate-circle-outline",
    titulo: "Definir meu destino",
    apoio: "Receber corridas no caminho para onde você vai",
  },
  {
    icone: "cash-outline",
    titulo: "Métodos de pagamento",
    apoio: "Escolher as formas de pagamento que você aceita",
  },
  {
    icone: "navigate-outline",
    titulo: "Navegação",
    apoio: "Abrir a rota no Waze ou no Google Maps",
  },
  {
    icone: "notifications-circle-outline",
    titulo: "Som e voz",
    apoio: "Avisos falados e vibração",
  },
];

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  onDisconnect: () => void;
  buscandoCorrida: boolean;
}

export default function Preferencias({
  visible,
  onClose,
  duration = 200,
  onDisconnect,
  buscandoCorrida,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

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
          // 👉 abre da direita para a esquerda
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
          // 👉 fecha voltando para a direita
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

  const handleDesconectar = () => {
    onDisconnect(); // chama handleConnect() do BottomMenu
    onClose(); // fecha o drawer logo em seguida
  };

  return (
    <>
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
                Preferências de solicitações
              </Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <View style={styles.cardGroup}>
              {ITENS_EM_BREVE.map((item) => (
                <View
                  key={item.titulo}
                  style={styles.cardButton}
                  accessibilityLabel={`${item.titulo}, em breve`}
                  accessibilityState={{ disabled: true }}
                >
                  <Ionicons
                    name={item.icone}
                    size={26}
                    color="#9CA3AF"
                    style={styles.icon}
                  />
                  <View style={styles.cardTextos}>
                    <Text style={styles.cardText}>{item.titulo}</Text>
                    <Text style={styles.cardApoio}>{item.apoio}</Text>
                  </View>
                  <View style={styles.emBreve}>
                    <Text style={styles.emBreveTexto}>Em breve</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* FOOTER */}
          {buscandoCorrida && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.botaoDesconectar}
                onPress={handleDesconectar}
              >
                <Text style={styles.textoDesconectar}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: "#f7f7f7", // corpo do drawer
  },

  // HEADER
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

  // BODY
  body: {
    flex: 1,
    padding: 16,
  },

  cardGroup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // CARD BUTTON
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 10,
    marginLeft: 16,
    marginRight: 16,
  },
  icon: {
    marginRight: 12,
  },
  cardTextos: {
    flex: 1,
    marginRight: 10,
  },
  cardText: {
    fontSize: 17,
    color: "#6B7280",
  },
  cardApoio: {
    marginTop: 2,
    fontSize: 13,
    color: "#9CA3AF",
  },
  emBreve: {
    borderRadius: 999,
    backgroundColor: "#ECEDEF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emBreveTexto: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  // FOOTER - BOTÃO DESCONECTAR
  footer: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.4,
    borderTopColor: "#ddd",
    paddingBottom: 30,
  },
  botaoDesconectar: {
    borderWidth: 1.5,
    borderColor: "#111",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
    backgroundColor: "#fff",
  },
  textoDesconectar: {
    color: "#111",
    fontSize: 30,
    fontWeight: "600",
    textAlign: "center",
  },
});
