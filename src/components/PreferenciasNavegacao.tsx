import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function PreferenciasNavegacao({
  visible,
  onClose,
  duration = 200,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // estados de seleção
  const [lembrarPreferencia, setLembrarPreferencia] = useState(true);
  const [mapaSelecionado, setMapaSelecionado] = useState("waze");

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
            <Text style={styles.headerTitle}>Configurações de navegação</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* Selecionar mapa padrão */}
          <Text style={styles.sectionTitle}>Selecionar mapa padrão</Text>

          {/* Switch lembrar preferência */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Lembrar minha preferência</Text>
            <Switch
              value={lembrarPreferencia}
              onValueChange={setLembrarPreferencia}
              trackColor={{ false: "#ccc", true: "#111" }}
              thumbColor="#fff"
            />
          </View>

          {/* Opções de navegação */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setMapaSelecionado("app")}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="navigate-outline" size={20} color="#111" />
              <Text style={styles.optionText}>Navegação pelo aplicativo</Text>
            </View>
            <Ionicons
              name={
                mapaSelecionado === "app"
                  ? "radio-button-on-outline"
                  : "radio-button-off-outline"
              }
              size={20}
              color={mapaSelecionado === "app" ? "#111" : "#aaa"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setMapaSelecionado("google")}
          >
            <View style={styles.optionLeft}>
              <Image
                source={{
                  uri: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Maps_icon_%282020%29.svg",
                }}
                style={styles.iconImage}
              />
              <Text style={styles.optionText}>Google Maps</Text>
            </View>
            <Ionicons
              name={
                mapaSelecionado === "google"
                  ? "radio-button-on-outline"
                  : "radio-button-off-outline"
              }
              size={20}
              color={mapaSelecionado === "google" ? "#111" : "#aaa"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setMapaSelecionado("waze")}
          >
            <View style={styles.optionLeft}>
              <Image
                source={{
                  uri: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Waze_logo.svg",
                }}
                style={styles.iconImage}
              />
              <Text style={styles.optionText}>Waze</Text>
            </View>
            <Ionicons
              name={
                mapaSelecionado === "waze"
                  ? "radio-button-on-outline"
                  : "radio-button-off-outline"
              }
              size={20}
              color={mapaSelecionado === "waze" ? "#111" : "#aaa"}
            />
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
    backgroundColor: "#f6f6f6",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#111",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: "#111",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionText: {
    fontSize: 15,
    color: "#111",
    marginLeft: 8,
  },
  iconImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
});
