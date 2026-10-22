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

export default function MetodoResgateAdicionado({
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

        {/* BODY */}
        <View style={styles.body}>
          {/* Ilustração Pix Sucesso */}
          <View style={styles.illustrationContainer}>
            <View style={styles.pixIconWrapper}>
              <Ionicons name="cash-outline" size={80} color="#000" />
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </View>
            </View>
          </View>

          <Text style={styles.successTitle}>
            Chave Pix adicionada com sucesso
          </Text>

          {/* Lista de Informações */}
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.infoText}>
                Para sacar, vá em Ganhos {">"} Saldo {">"} Resgatar. O valor vai
                para o seu método de resgate principal.
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.infoText}>
                Você escolhe entre chave Pix e conta bancária em Configurações,
                no canto superior direito da página de saldo.
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.infoText}>
                Depois de pedir um saque, acompanhe o andamento na página de
                saldo.
              </Text>
            </View>
          </View>

          {/* BOTÕES DE AÇÃO */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnResgatar} onPress={onClose}>
              <Text style={styles.btnResgatarText}>Resgatar agora</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnTalvez} onPress={onClose}>
              <Text style={styles.btnTalvezText}>Talvez mais tarde</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: "#111",
  },
  body: {
    flex: 1,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  illustrationContainer: {
    marginTop: 40,
    marginBottom: 30,
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
    backgroundColor: "#FFD700",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
    width: "100%",
    color: "#000",
    marginBottom: 30,
  },
  infoList: {
    width: "100%",
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  bullet: {
    fontSize: 18,
    marginRight: 10,
    color: "#000",
    lineHeight: 22,
  },
  infoText: {
    flex: 1,
    fontSize: 17,
    color: "#333",
    lineHeight: 20,
  },
  footer: {
    width: "100%",
    marginTop: "auto",
    paddingBottom: 40,
  },
  btnResgatar: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  btnResgatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  btnTalvez: {
    backgroundColor: "#F5F5F5",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTalvezText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
});
