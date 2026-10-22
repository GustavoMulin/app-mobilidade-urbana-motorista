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

export default function PreferenciasSomVoz({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // estados
  const [vibracao, setVibracao] = useState(false);
  const [vozApp, setVozApp] = useState(true);
  const [vozAtividade, setVozAtividade] = useState(false);
  const [vozMensagem, setVozMensagem] = useState(false);

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
            <Text style={styles.headerTitle}>Som e voz</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* VIBRAÇÃO */}
          <View style={styles.row}>
            <Text style={styles.label}>Vibração</Text>
            <Switch
              value={vibracao}
              onValueChange={setVibracao}
              trackColor={{ false: "#ccc", true: "#111" }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.subtext}>
            Quando este recurso estiver ativado, seu telefone vibrará ao receber
            uma solicitação.
          </Text>

          {/* SEPARADOR */}
          <View style={styles.separator} />

          {/* MODO DE NAVEGAÇÃO POR VOZ */}
          <Text style={styles.sectionTitle}>Modo de navegação por voz</Text>

          {/* NAVEGAÇÃO POR VOZ */}
          <View style={styles.row}>
            <Text style={styles.label}>Navegação por voz no aplicativo</Text>
            <Switch
              value={vozApp}
              onValueChange={setVozApp}
              trackColor={{ false: "#ccc", true: "#111" }}
              thumbColor="#fff"
            />
          </View>

          {/* VOLUME ALERTA */}
          <TouchableOpacity style={styles.rowTouchable}>
            <Text style={styles.label}>Vol. alerta de novo pedido</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#aaa" />
          </TouchableOpacity>
          <Text style={styles.subtext}>Usar mesmo volume do telefone</Text>

          {/* SEPARADOR */}
          <View style={styles.separator} />

          {/* COMANDOS DE VOZ */}
          <View style={styles.row}>
            <Text style={styles.label}>
              Comandos de voz de atividades da corrida
            </Text>
            <Switch
              value={vozAtividade}
              onValueChange={setVozAtividade}
              trackColor={{ false: "#ccc", true: "#111" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Comandos de voz de mensagens do passageiro
            </Text>
            <Switch
              value={vozMensagem}
              onValueChange={setVozMensagem}
              trackColor={{ false: "#ccc", true: "#111" }}
              thumbColor="#fff"
            />
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
  row: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  rowTouchable: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  label: {
    fontSize: 15,
    color: "#111",
    flexShrink: 1,
  },
  subtext: {
    fontSize: 13,
    color: "#777",
    marginBottom: 14,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 4,
    color: "#111",
  },
  separator: {
    height: 1,
    backgroundColor: "#eaeaea",
    marginVertical: 14,
  },
});
