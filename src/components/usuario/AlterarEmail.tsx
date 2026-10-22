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

export default function AlterarEmail({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [email, setEmail] = useState("");

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

  const isValidEmail = email.includes("@") && email.includes(".");

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
            <Text style={styles.headerTitle}>Alterar e-mail</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* Ilustração */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={50} color="#444" />
              <View style={styles.syncBadge}>
                <Ionicons name="sync" size={14} color="#fff" />
              </View>
            </View>
          </View>

          {/* Texto Informativo */}
          <Text style={styles.infoText}>
            Ao alterar seu e-mail, ele será usado para{" "}
            <Text style={styles.boldText}>recuperação de conta</Text> e envio de
            recibos.
          </Text>

          <Text style={styles.subText}>
            Enviaremos uma mensagem de confirmação para o novo endereço
            informado.
          </Text>

          {/* Input de Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Novo e-mail</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="at-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="exemplo@email.com"
                placeholderTextColor="#bbb"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Botão de Ação */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isValidEmail ? "#FFD600" : "#f0f0f0" },
            ]}
            disabled={!isValidEmail}
          >
            <Text
              style={[
                styles.buttonText,
                { color: isValidEmail ? "#111" : "#999" },
              ]}
            >
              Salvar alteração
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
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginLeft: 4,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
