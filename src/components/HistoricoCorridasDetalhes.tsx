import { Text } from "@/components/common/Texto";
import { ItemHistorico } from "@/hooks/useHistoricoCorridas";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
const E_MOTORISTA: boolean = true;

interface Props {
  corrida: ItemHistorico | null;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

interface InfoRowProps {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}

const InfoRow = ({
  label,
  value,
  bold = false,
  color = "#111",
}: InfoRowProps) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text
      style={[styles.infoValue, { color, fontWeight: bold ? "700" : "400" }]}
    >
      {value}
    </Text>
  </View>
);

export default function HistoricoCorridasDetalhes({
  corrida,
  visible,
  onClose,
  duration = 250,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
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
      ]).start(({ finished }) => finished && setIsMounted(false));
    }
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted || corrida === null) return null;

  const item = corrida;
  const statusColor = item.isCancelled
    ? "#D32F2F"
    : item.isFinalized
      ? "#2E7D32"
      : "#1565C0";
  const statusIcon = item.isCancelled
    ? "close-circle"
    : item.isFinalized
      ? "checkmark-circle"
      : "time";

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
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} hitSlop={15}>
              <Ionicons name="chevron-back" size={28} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalhes da corrida</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            <View style={styles.statusBadge}>
              <Ionicons name={statusIcon} size={18} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.valueLabel}>{item.valueLabel}</Text>
            <Text style={styles.mainValue}>{item.value}</Text>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Duração</Text>
                <Text style={styles.statValue}>{item.duration}</Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Distância</Text>
                <Text style={styles.statValue}>{item.distance}</Text>
              </View>
            </View>
          </View>

          {item.isCancelled ? (
            <View style={styles.cancelSection}>
              <View style={styles.cancelTitleRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={21}
                  color="#B71C1C"
                />
                <Text style={styles.cancelTitle}>Cancelamento registrado</Text>
              </View>
              <InfoRow
                label="Cancelada por"
                value={item.cancelledBy ?? "Não informado"}
                color="#B71C1C"
              />
              <InfoRow
                label="Motivo"
                value={item.cancellationReason ?? "Não informado"}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados gerais</Text>
            <InfoRow label="Código" value={item.code} />
            <InfoRow label="Data e hora" value={item.dateTime} />
            <InfoRow label="Tipo de corrida" value={item.type} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Método de pagamento</Text>
              <View style={styles.paymentValue}>
                <MaterialCommunityIcons
                  name={
                    item.paymentMethod === "cash"
                      ? "cash-multiple"
                      : "cellphone"
                  }
                  size={18}
                  color="#1565C0"
                />
                <Text style={styles.infoValue}>{item.paymentLabel}</Text>
              </View>
            </View>
          </View>

          {item.counterpartName !== "Não definido" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {E_MOTORISTA ? "Passageiro" : "Motorista"}
              </Text>
              <View style={styles.personRow}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={22} color="#777" />
                </View>
                <View style={styles.personData}>
                  <Text style={styles.personName}>{item.counterpartName}</Text>
                  {!E_MOTORISTA ? (
                    <Text style={styles.vehicleText}>{item.vehicle}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valores registrados</Text>
            {item.isNoShow ? (
              <InfoRow
                label="Taxa por ausência"
                value={item.passengerPaid}
                bold
              />
            ) : null}
            {E_MOTORISTA ? (
              <>
                <InfoRow label="Valor do motorista" value={item.driverEarned} />
                <InfoRow
                  label="Pago pelo passageiro"
                  value={item.passengerPaid}
                />
                <InfoRow label="Tarifa base" value={item.baseFare} />
                <InfoRow label="Taxa da plataforma" value={item.platformFee} />
                <InfoRow
                  label="Percentual da plataforma"
                  value={item.platformPercentage}
                />
              </>
            ) : (
              <>
                <InfoRow
                  label={item.isFinalized ? "Valor pago" : "Valor estimado"}
                  value={item.passengerPaid}
                  bold
                />
                <InfoRow label="Tarifa base" value={item.baseFare} />
              </>
            )}
          </View>

          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>Trajeto</Text>
            <View style={styles.addressContainer}>
              <View style={styles.timeline}>
                <View style={[styles.dot, styles.originDot]} />
                <View style={styles.line} />
                <View style={[styles.dot, styles.destinationDot]} />
              </View>
              <View style={styles.addresses}>
                <View>
                  <Text style={styles.addressLabel}>Origem</Text>
                  <Text style={styles.addressText}>{item.origin}</Text>
                </View>
                <View style={styles.destinationAddress}>
                  <Text style={styles.addressLabel}>Destino</Text>
                  <Text style={styles.addressText}>{item.destination}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 100,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
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
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
  },
  headerSpacer: {
    width: 28,
  },
  body: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  topSection: {
    alignItems: "center",
    paddingVertical: 26,
    borderBottomWidth: 8,
    borderBottomColor: "#F8F8F8",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  valueLabel: {
    fontSize: 15,
    color: "#666",
    marginBottom: 5,
  },
  mainValue: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111",
    marginBottom: 22,
  },
  statsContainer: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 20,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dividerVertical: {
    width: 1,
    backgroundColor: "#EEE",
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  lastSection: {
    marginBottom: 40,
  },
  cancelSection: {
    padding: 20,
    backgroundColor: "#FFF4F4",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD6D6",
  },
  cancelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  cancelTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#B71C1C",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    alignItems: "flex-start",
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: "#555",
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: "#111",
    textAlign: "right",
    flexShrink: 1,
  },
  paymentValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  personData: {
    flex: 1,
  },
  personName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  vehicleText: {
    fontSize: 14,
    color: "#777",
    marginTop: 3,
  },
  addressContainer: {
    flexDirection: "row",
    paddingLeft: 5,
  },
  timeline: {
    alignItems: "center",
    marginRight: 15,
    paddingVertical: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  originDot: {
    backgroundColor: "#2E7D32",
  },
  destinationDot: {
    backgroundColor: "#FF6D00",
  },
  line: {
    width: 1,
    minHeight: 55,
    flex: 1,
    backgroundColor: "#DDD",
    marginVertical: 4,
  },
  addresses: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  destinationAddress: {
    marginTop: 18,
  },
});
