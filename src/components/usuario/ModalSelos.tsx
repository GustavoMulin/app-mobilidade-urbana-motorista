import { useEffect, useState } from "react";
import { useVoltarFecha } from "@/hooks/useVoltarFecha";
import { Text } from "@/components/common/Texto";
import type { Elogio } from "@/domain/perfilMotorista";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  headerHeight: number;
  // elogio que os passageiros marcaram ao avaliar o motorista
  data: Elogio | null;
}

export default function ModalSelos({
  visible,
  onClose,
  headerHeight,
  data,
}: Props) {
  const [slideAnim] = useState(() => new Animated.Value(height));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  useVoltarFecha(visible, onClose);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0);

      // reset
      slideAnim.setValue(height);
      overlayOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [overlayOpacity, slideAnim, visible]);

  if (!isMounted || !data) return null;

  return (
    <>
      {/* Overlay abaixo do header */}
      <Pressable
        style={[StyleSheet.absoluteFill, { top: headerHeight, zIndex: 5 }]}
        onPress={onClose}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.35)",
              opacity: overlayOpacity,
            },
          ]}
        />
      </Pressable>

      {/* Modal */}
      <Animated.View
        style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.body}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, styles.icone]}>
              <Ionicons name="thumbs-up" size={44} color="#B07A00" />
            </View>
            <Text style={styles.title}>{data?.titulo}</Text>
            <Text style={styles.subtitle}>{data?.descricao}</Text>
            <Text style={styles.subtitle}>
              Marcado {data?.quantidade}{" "}
              {data?.quantidade === 1 ? "vez" : "vezes"} pelos passageiros
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 24,
    alignItems: "center",
  },
  modal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.55, // define altura do modal (IMPORTANTE)
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 20,
    justifyContent: "space-between", // 👈 chave aqui
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 25,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  icone: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4D6",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    marginTop: 15,
  },
  subtitle: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "400",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
