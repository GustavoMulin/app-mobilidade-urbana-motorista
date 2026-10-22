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
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function ConfigurarSolicitacoes({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [switches, setSwitches] = useState({
    pop: false,
    entregaCarro: false,
    negocia: false,
    entregaCarroEmpresas: false,
    popExpresso: false,
  });

  const toggleSwitch = (key: keyof typeof switches) => {
    setSwitches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
            <Text style={styles.headerTitle}>Configurar solicitações</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* Título de seção */}
          <Text style={styles.sectionTitle}>Preferências de solicitações</Text>
          <Text style={styles.sectionSubtitle}>
            Selecione quais tipos de solicitação você quer receber
          </Text>

          {/* Opções */}
          <View style={styles.optionList}>
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Pop</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch("pop")}
                value={switches.pop}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Entrega Carro</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch("entregaCarro")}
                value={switches.entregaCarro}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Negocia</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch("negocia")}
                value={switches.negocia}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Entrega Carro Empresas</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch("entregaCarroEmpresas")}
                value={switches.entregaCarroEmpresas}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.optionText}>Pop Expresso</Text>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#bbb"
                  style={{ marginLeft: 4 }}
                />
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch("popExpresso")}
                value={switches.popExpresso}
              />
            </View>
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
    backgroundColor: "#1e1e1e", // fundo escuro como na imagem
  },
  header: {
    backgroundColor: "#2a2a2a",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#444",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  body: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 20,
  },
  optionList: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#444",
  },
  optionText: {
    color: "#fff",
    fontSize: 15,
  },
});
