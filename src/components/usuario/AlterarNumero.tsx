import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TextInput } from "@/components/common/Texto";
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

export default function AlterarNumero({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [phoneNumber, setPhoneNumber] = useState("");

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
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

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
            <Text style={styles.headerTitle}>Alterar número</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* Ilustração/Ícone central */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait-outline" size={50} color="#444" />
              <View style={styles.syncBadge}>
                <Ionicons name="sync" size={14} color="#fff" />
              </View>
            </View>
          </View>

          {/* Texto Informativo */}
          <Text style={styles.infoText}>
            Ao alterar seu número de celular, os dados da sua conta serão{" "}
            <Text style={styles.boldText}>vinculados ao novo número</Text>.
          </Text>

          <Text style={styles.subText}>
            Enviaremos um código de confirmação por SMS para validar a troca.
          </Text>

          {/* Input de Telefone */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.flagText}>🇧🇷</Text>
              <Text style={styles.countryCode}>+55</Text>
              <Ionicons name="chevron-down" size={14} color="#666" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          {/* Botão de Ação */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  phoneNumber.length > 10 ? "#FFD600" : "#f0f0f0",
              },
            ]}
            disabled={phoneNumber.length <= 10}
          >
            <Text
              style={[
                styles.buttonText,
                { color: phoneNumber.length > 10 ? "#111" : "#999" },
              ]}
            >
              Próximo
            </Text>
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
    padding: 24,
    alignItems: "center",
  },
  illustrationContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  syncBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#111",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "700",
    color: "#000",
  },
  subText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    width: "100%",
    height: 56,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    paddingRight: 12,
    marginRight: 12,
  },
  flagText: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto", // Empurra o botão para o rodapé
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
