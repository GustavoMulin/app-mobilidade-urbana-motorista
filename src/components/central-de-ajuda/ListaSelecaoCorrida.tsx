import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SelecaoMotivoAjuda from "./SelecaoMotivoAjuda";

const { width } = Dimensions.get("window");

interface RideHistory {
  id: string;
  date: string;
  time: string;
  type: string;
  paymentMethod: "cash" | "app";
  origin: string;
  destination: string;
  value: string;
  status: string;
  isTip?: boolean;
}

const DATA: RideHistory[] = [
  {
    id: "1",
    date: "27/01/2026",
    time: "18:30",
    type: "Pop",
    paymentMethod: "cash",
    origin: "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    destination: "2343, Flodoaldo Pontes Pinto, Porto Velho - RO",
    value: "R$8,30",
    status: "Pedido finalizado",
  },
  {
    id: "2",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
  {
    id: "3",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
  {
    id: "4",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
  {
    id: "5",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
  {
    id: "6",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
  {
    id: "7",
    date: "27/01/2026",
    time: "18:28",
    type: "Negocia",
    paymentMethod: "cash",
    origin: "Rua Paulo Leal, Nossa Senhora das Graças, Porto Velho - RO",
    destination:
      "Avenida Sete de Setembro, Nossa Sra. das Graças, Porto Velho - RO",
    value: "R$6,11",
    status: "Pedido finalizado",
  },
];

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function ListaSelecaoCorrida({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showSelecaoMotivoAjuda, setShowSelecaoMotivoAjuda] = useState(visible);

  // ✅ estado do radio
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const renderItem = ({ item }: { item: RideHistory }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedId(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateTimeText}>
            {item.date} {item.time}
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
          <Text style={styles.paymentText}>
            {item.paymentMethod === "cash"
              ? "Ganhos pagos em dinheiro"
              : "Ganhos pagos no app"}
          </Text>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.typeContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={item.isTip ? "gift-outline" : "car-side"}
                size={20}
                color="#666"
              />
            </View>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>

          {/* ✅ RADIO NO LUGAR DO CHEVRON */}
          <View>
            <Ionicons
              name={isSelected ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={isSelected ? "#000" : "#ccc"}
            />
          </View>
        </View>

        {!item.isTip && (
          <View style={styles.addressSection}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: "#999" }]} />
              <View style={styles.line} />
              <View style={[styles.dot, { backgroundColor: "#666" }]} />
            </View>
            <View style={styles.addresses}>
              <Text style={styles.addressText} numberOfLines={1}>
                {item.origin}
              </Text>
              <Text
                style={[styles.addressText, { marginTop: 12 }]}
                numberOfLines={1}
              >
                {item.destination}
              </Text>
            </View>
          </View>
        )}

        {item.status ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (!isMounted) return null;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayOpacity },
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
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back-outline" size={26} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Central de ajuda</Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          <View style={styles.body}>
            <FlatList
              data={DATA}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 120 }} // espaço pros botões
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* ✅ BOTÕES INFERIORES */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              backgroundColor: "#F2F2F2",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#FFD600",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={() => {
                setShowSelecaoMotivoAjuda(true);
                console.log("Confirmar:", selectedId);
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                Confirmar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#E0E0E0",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={onClose}
            >
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <SelecaoMotivoAjuda
        visible={showSelecaoMotivoAjuda}
        onClose={() => setShowSelecaoMotivoAjuda(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  body: {
    flex: 1,
    padding: 12,
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
    color: "#888",
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
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  valueText: {
    fontSize: 17,
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
    color: "#4CAF50",
    fontWeight: "500",
  },
});
