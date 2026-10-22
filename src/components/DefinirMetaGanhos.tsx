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

export default function DefinirMetaGanhos({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [metaValue, setMetaValue] = useState("");

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
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
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
            <View style={styles.leftHeader}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="chevron-back" size={26} color="#111" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 15 }}>
                <Ionicons name="close" size={26} color="#111" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Definir meta de ganhos</Text>
            <View style={{ width: 60 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <Text style={styles.title}>Definir meta de ganhos</Text>
          <Text style={styles.description}>
            Fica mais fácil atingir sua meta se ela estiver registrada
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.input}
              placeholder="Inserir meta de ganhos"
              placeholderTextColor="#CCC"
              keyboardType="numeric"
              value={metaValue}
              onChangeText={setMetaValue}
              autoFocus
            />
          </View>
          <Text style={styles.lastWeekInfo}>
            Você ganhou R$415,33 na semana passada
          </Text>
        </View>

        {/* FOOTER BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: metaValue ? "#111" : "#F3F3F3" },
            ]}
            disabled={!metaValue}
          >
            <Text
              style={[
                styles.mainButtonText,
                { color: metaValue ? "#FFF" : "#AAA" },
              ]}
            >
              Inserir meta de ganhos
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
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEE",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  body: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 40,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#EEE",
    paddingBottom: 8,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "400",
    color: "#111",
  },
  lastWeekInfo: {
    fontSize: 13,
    color: "#111",
    marginTop: 12,
  },
  footer: {
    padding: 20,
    paddingBottom: 35,
  },
  mainButton: {
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
