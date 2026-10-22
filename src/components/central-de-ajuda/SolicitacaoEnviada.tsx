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

export default function SolicitcaoEnviada({
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
  }, [visible, duration, translateX, overlayOpacity]);

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
            {/* <Text style={styles.headerTitle}>Solicitação enviada</Text> */}
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={styles.containerIcon}>
            <View style={styles.circleCheck}>
              <Ionicons name="checkmark-sharp" size={60} color="#fff" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.successTitle}>Sua solicitação foi enviada</Text>
            <Text style={styles.successDescription}>
              Recebemos sua solicitação e nossa equipe irá analisá-la. Você
              receberá uma resposta em até 24 horas diretamente no seu
              aplicativo.
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnEntendi} onPress={onClose}>
            <Text style={styles.btnText}>Entendi</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  containerIcon: {
    marginBottom: 40,
  },
  circleCheck: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#28a745", // Verde de sucesso
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  textContainer: {
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 15,
  },
  successDescription: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  btnEntendi: {
    backgroundColor: "#FFD600",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
