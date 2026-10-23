import { Text } from "@/components/common/Texto";
import {
  ItemHistorico,
  useHistoricoCorridas,
} from "@/hooks/useHistoricoCorridas";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import HistoricoCorridasDetalhes from "./HistoricoCorridasDetalhes";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const visualDoStatus = (status: string) => {
  if (status === "cancelada") {
    return { icon: "close-circle" as const, color: "#D32F2F" };
  }
  if (status === "finalizada") {
    return { icon: "checkmark-circle" as const, color: "#2E7D32" };
  }
  return { icon: "time" as const, color: "#1565C0" };
};

export default function HistoricoCorridas({
  visible,
  onClose,
  duration = 200,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [selecionada, setSelecionada] = useState<ItemHistorico | null>(null);
  const [detalhesVisiveis, setDetalhesVisiveis] = useState(false);
  const { itens, carregando, carregandoMais, erro, recarregar, carregarMais } =
    useHistoricoCorridas(visible);

  useEffect(() => {
    const onBackPress = () => {
      if (detalhesVisiveis) return false;
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
  }, [visible, onClose, detalhesVisiveis]);

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
      ]).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
          setDetalhesVisiveis(false);
        }
      });
    }
  }, [visible, translateX, overlayOpacity, duration]);

  const renderItem = ({ item }: { item: ItemHistorico }) => {
    const visual = visualDoStatus(item.statusCode);

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Abrir detalhes da corrida ${item.code}`}
        onPress={() => {
          setSelecionada(item);
          setDetalhesVisiveis(true);
        }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateTimeText}>
            {item.date} {item.time} · {item.code}
          </Text>
        </View>

        <View style={styles.paymentInfo}>
          <Ionicons
            name={
              item.paymentMethod === "cash"
                ? "cash-outline"
                : "phone-portrait-outline"
            }
            size={16}
            color={item.paymentMethod === "cash" ? "#2196F3" : "#4CAF50"}
          />
          <Text style={styles.paymentText}>{item.paymentSummary}</Text>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.typeContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="car-side" size={20} color="#666" />
            </View>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <View style={styles.valueContainer}>
            {/* cancelada sem taxa: o motorista não ganhou esse valor */}
            <Text
              style={[
                styles.valueText,
                item.isCancelled && !item.isNoShow && styles.valorCancelado,
              ]}
            >
              {item.value}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </View>
        </View>

        <View style={styles.addressSection}>
          <View style={styles.timeline}>
            <View style={[styles.dot, { backgroundColor: "#2E7D32" }]} />
            <View style={styles.line} />
            <View style={[styles.dot, { backgroundColor: "#FF6D00" }]} />
          </View>
          <View style={styles.addresses}>
            <Text style={styles.addressText} numberOfLines={1}>
              {item.origin}
            </Text>
            <Text
              style={[styles.addressText, styles.destinationText]}
              numberOfLines={1}
            >
              {item.destination}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Ionicons name={visual.icon} size={16} color={visual.color} />
          <Text style={[styles.statusText, { color: visual.color }]}>
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isMounted) return null;

  return (
    <>
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
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="arrow-back-outline" size={26} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Histórico de corridas</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.scopeRow}>
              <Ionicons name="calendar-outline" size={16} color="#555" />
              <Text style={styles.scopeText}>
                Todas as corridas registradas
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <FlatList
              data={itens}
              ListEmptyComponent={
                <Text style={styles.listaVazia}>
                  {carregando
                    ? "Carregando..."
                    : erro.length > 0
                      ? erro
                      : "Você ainda não tem corridas registradas."}
                </Text>
              }
              ListFooterComponent={
                carregandoMais ? (
                  <ActivityIndicator
                    color="#1565C0"
                    style={styles.loadingMore}
                  />
                ) : undefined
              }
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={carregando && itens.length > 0}
              onRefresh={() => void recarregar()}
              onEndReached={carregarMais}
              onEndReachedThreshold={0.4}
            />
          </View>
        </Animated.View>
      </View>

      <HistoricoCorridasDetalhes
        corrida={selecionada}
        visible={detalhesVisiveis}
        onClose={() => setDetalhesVisiveis(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 30,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  listaVazia: {
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    paddingVertical: 40,
  },
  loadingMore: {
    paddingVertical: 16,
  },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#F2F2F2",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  headerSpacer: {
    width: 26,
  },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scopeText: {
    fontSize: 13,
    color: "#555",
  },
  body: {
    flex: 1,
    padding: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    marginBottom: 4,
  },
  dateTimeText: {
    fontSize: 12,
    color: "#777",
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  paymentText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  typeText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  addressSection: {
    flexDirection: "row",
    paddingLeft: 10,
    marginBottom: 15,
  },
  timeline: {
    alignItems: "center",
    width: 20,
    marginRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 1,
    flex: 1,
    minHeight: 14,
    backgroundColor: "#DDD",
    marginVertical: 4,
  },
  addresses: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  destinationText: {
    marginTop: 12,
  },
  valorCancelado: {
    color: "#9CA3AF",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
