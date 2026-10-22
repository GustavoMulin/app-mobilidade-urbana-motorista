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

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function HorasDirigindo({
  visible,
  onClose,
  duration = 200,
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

  // 👉 exemplo de cálculo de progresso
  const totalHoras = 12;
  const horasRestantes = 11 + 24 / 60; // 11:24
  const progresso = (horasRestantes / totalHoras) * 100;

  return (
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
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Horas dirigindo</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* CARD */}
          <View style={styles.card}>
            <Text style={styles.label}>Horas restantes dirigindo</Text>

            <Text style={styles.time}>11:24</Text>

            {/* BARRA */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View
                  style={[styles.progressFill, { width: `${progresso}%` }]}
                />
              </View>

              <Text style={styles.total}>12 h</Text>
            </View>
          </View>

          {/* SAIBA MAIS */}
          <TouchableOpacity style={styles.saibaMais}>
            <Text style={styles.saibaMaisText}>Saiba mais</Text>
            <Ionicons name="chevron-forward" size={18} color="#F57C00" />
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
    backgroundColor: "#f2f2f2",
  },

  // HEADER
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

  // CARD
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },

  label: {
    fontSize: 14,
    color: "#777",
    marginBottom: 6,
  },

  time: {
    fontSize: 34,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressBackground: {
    flex: 1,
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 10,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#3E3A5D",
    borderRadius: 6,
  },

  total: {
    fontSize: 14,
    color: "#666",
  },

  // SAIBA MAIS
  saibaMais: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  saibaMaisText: {
    color: "#F57C00",
    fontSize: 16,
    marginRight: 4,
  },
});
