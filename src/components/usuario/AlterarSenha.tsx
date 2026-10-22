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

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const PasswordInput = ({
  label,
  value,
  onChange,
  show,
  setShow,
  placeholder,
}: any) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        secureTextEntry={!show}
        value={value}
        onChangeText={onChange}
      />
      <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeIcon}>
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={22}
          color="#999"
        />
      </TouchableOpacity>
    </View>
  </View>
);

export default function AlterarSenha({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // Estados para os inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Estados para visibilidade da senha
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

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

  const isFormValid = currentPassword.length >= 6 && newPassword.length >= 6;

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
            <Text style={styles.headerTitle}>Alterar senha</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Ilustração */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={50} color="#444" />
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
              </View>
            </View>
          </View>

          <Text style={styles.infoText}>
            Sua nova senha deve ter pelo menos{" "}
            <Text style={styles.boldText}>6 caracteres</Text> e ser diferente da
            atual.
          </Text>

          {/* Campos de Senha */}
          <PasswordInput
            label="Senha atual"
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showPass1}
            setShow={setShowPass1}
          />

          <PasswordInput
            label="Nova senha"
            placeholder="Crie uma nova senha forte"
            value={newPassword}
            onChange={setNewPassword}
            show={showPass2}
            setShow={setShowPass2}
          />

          {/* Botão de Ação */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isFormValid ? "#FFD600" : "#f0f0f0" },
            ]}
            disabled={!isFormValid}
          >
            <Text
              style={[
                styles.buttonText,
                { color: isFormValid ? "#111" : "#999" },
              ]}
            >
              Atualizar senha
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    padding: 24,
    alignItems: "center",
    flexGrow: 1,
  },
  illustrationContainer: {
    marginTop: 10,
    marginBottom: 25,
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
  shieldBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#2ECC71", // Verde para indicar segurança
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  boldText: {
    fontWeight: "700",
    color: "#333",
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
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
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
