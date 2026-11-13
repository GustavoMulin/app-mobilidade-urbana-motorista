import { Text } from "@/components/common/Texto";
import { Abas, type Aba } from "@/components/taxa/ComponentesTaxa";
import { estilosTaxa } from "@/components/taxa/estilosTaxa";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, type ReactNode } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  titulo: string;
  emHistorico: boolean;
  onAbrirHistorico: () => void;
  onVoltarDoHistorico: () => void;
  aba: Aba;
  onMudarAba: (aba: Aba) => void;
  // depois de a tela sair de cena: a tela volta ao resumo
  onFechado?: () => void;
  children: ReactNode;
  duration?: number;
}

/**
 * Moldura das telas de taxa: painel que desliza da direita, cabeçalho com o
 * link Histórico, abas Corridas/Entregas e o botão voltar do aparelho (do
 * Histórico volta ao resumo; do resumo fecha).
 */
export default function PainelDeTaxa({
  visible,
  onClose,
  titulo,
  emHistorico,
  onAbrirHistorico,
  onVoltarDoHistorico,
  aba,
  onMudarAba,
  onFechado,
  children,
  duration = 200,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    const aoVoltar = () => {
      if (!visible) return false;
      if (emHistorico) {
        onVoltarDoHistorico();
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      aoVoltar,
    );
    return () => subscription.remove();
  }, [visible, emHistorico, onClose, onVoltarDoHistorico]);

  useEffect(() => {
    if (visible) {
      const mountTimer = setTimeout(() => setIsMounted(true), 0);
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
      return () => clearTimeout(mountTimer);
    }

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
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        onFechado?.();
      }
    });
  }, [visible, translateX, overlayOpacity, duration, onFechado]);

  if (!isMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={emHistorico ? onVoltarDoHistorico : onClose}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>
            {emHistorico ? "Histórico" : titulo}
          </Text>
          {emHistorico ? null : (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onAbrirHistorico}
              hitSlop={10}
            >
              <Text style={styles.headerLink}>Histórico</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.corpo}
          contentContainerStyle={[
            styles.conteudo,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Abas aba={aba} onChange={onMudarAba} />
          {aba === "entregas" ? (
            <Text style={estilosTaxa.vazio}>
              Ainda não há entregas para mostrar.
            </Text>
          ) : (
            children
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 30 },
  overlay: { backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#F4F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    elevation: 2,
  },
  headerTitulo: { flex: 1, fontSize: 20, fontWeight: "600", color: "#222" },
  headerLink: { fontSize: 15, color: "#777" },
  corpo: { flex: 1 },
  conteudo: { paddingHorizontal: 16, paddingTop: 8 },
});
