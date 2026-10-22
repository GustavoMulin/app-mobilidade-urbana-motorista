import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  carregarMetodosResgate,
  mensagemDeErro,
  MetodoResgate,
  tornarPrincipal,
} from "@/domain/carteira";
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

export default function DefinirMetodoResgate({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [metodos, setMetodos] = useState<MetodoResgate[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(() => {
    carregarMetodosResgate()
      .then(setMetodos)
      .catch(() => setErro("Não foi possível carregar seus métodos."));
  }, []);

  useEffect(() => {
    if (visible) recarregar();
  }, [visible, recarregar]);

  const escolher = async (metodo: MetodoResgate) => {
    if (metodo.principal || salvando) return;
    setSalvando(true);
    setErro("");
    try {
      await tornarPrincipal(metodo.id);
      recarregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, "Não foi possível trocar o método."));
    } finally {
      setSalvando(false);
    }
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
  }, [visible, duration, translateX, overlayOpacity]);

  if (!isMounted) return null;

  const renderOption = (
    metodo: MetodoResgate | null,
    title: string,
    icon: React.ReactNode,
    iconColor: string,
  ) => (
    <TouchableOpacity
      style={[styles.optionContainer, !metodo && { opacity: 0.5 }]}
      onPress={() => metodo && void escolher(metodo)}
      disabled={!metodo || salvando}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!metodo?.principal, disabled: !metodo }}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
        {icon}
      </View>

      <View style={styles.optionTextContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        <Text style={styles.optionDescription}>
          {metodo
            ? metodo.descricao
            : "Cadastre em Ganhos > Método de resgate para poder escolher."}
        </Text>
      </View>

      <View style={styles.radioOuter}>
        {metodo?.principal && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 50) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.body} bounces={false}>
          <Text style={styles.mainTitle}>Definir método de resgate</Text>
          <Text style={styles.mainSubtitle}>
            Seus saques vão para o método escolhido aqui.
          </Text>

          {!!erro && (
            <Text style={styles.erroTexto} accessibilityRole="alert">
              {erro}
            </Text>
          )}

          {renderOption(
            metodos.find((metodo) => metodo.tipo === "pix") ?? null,
            "Chave Pix",
            <Ionicons name="qr-code-outline" size={20} color="#fff" />,
            "#2db089",
          )}

          {renderOption(
            metodos.find((metodo) => metodo.tipo === "conta") ?? null,
            "Transferência bancária",
            <MaterialCommunityIcons
              name="bank-outline"
              size={22}
              color="#fff"
            />,
            "#ff6600",
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  erroTexto: { fontSize: 13, color: "#C62828", marginBottom: 16 },
  drawer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    marginTop: 10,
    marginBottom: 10,
  },
  mainSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 30,
  },
  // OPÇÕES
  optionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 15,
    paddingRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  tag: {
    backgroundColor: "#e8f9f2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  tagText: {
    color: "#2db089",
    fontSize: 11,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: 13,
    color: "#999",
    lineHeight: 18,
  },
  // RADIO BUTTON
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000",
  },
});
