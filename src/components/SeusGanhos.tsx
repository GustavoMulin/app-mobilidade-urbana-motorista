import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import HistoricoCorridas from "./HistoricoCorridas";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

type TabType = "Diários" | "Semanais" | "Mensais";

interface DetailRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

const DetailRow = ({ label, value, onPress }: DetailRowProps) => (
  <TouchableOpacity onPress={onPress} style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={styles.detailValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color="#CCC" />
    </View>
  </TouchableOpacity>
);

const StatsPanel = ({ activeTab }: { activeTab: TabType }) => {
  const data = {
    Diários: { km: "R$2,72", req: "R$10,37", total: "4" },
    Semanais: { km: "R$2,47", req: "R$11,72", total: "22" },
    Mensais: { km: "R$2,37", req: "R$12,03", total: "107" },
  }[activeTab];

  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Painel de ganhos</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.km}</Text>
          <Text style={styles.statLabel}>Ganhos por km</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.req}</Text>
          <Text style={styles.statLabel}>Ganhos por solicitação</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.total}</Text>
          <Text style={styles.statLabel}>Solicitações</Text>
        </View>
      </View>

      {activeTab === "Semanais" && (
        <TouchableOpacity style={styles.taxa99Row}>
          <View style={styles.taxaBadge}>
            <Text style={styles.taxaBadgeText}>No máximo</Text>
          </View>
          <Text style={styles.taxaValue}>0%</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.taxaLabel}>Taxa99</Text>
            <Ionicons name="chevron-forward" size={12} color="#666" />
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.helpLink}>
        <Ionicons name="help-circle" size={16} color="#999" />
        <Text style={styles.helpLinkText}>Como os ganhos são calculados?</Text>
        <Ionicons name="chevron-forward" size={14} color="#999" />
      </TouchableOpacity>
    </View>
  );
};

export default function SeusGanhos({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  const [isMounted, setIsMounted] = useState(visible);
  const [activeTab, setActiveTab] = useState<TabType>("Semanais");
  const [isLoading, setIsLoading] = useState(false);
  const [historicoCorrida, setHistoricoCorrida] = useState(false);

  const mostrarHistoricoCorrida = () => {
    console.log(historicoCorrida);
    console.log("historicoCorrida");
    setHistoricoCorrida(true);
  };

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
  }, [duration, overlayOpacity, translateX, visible]);

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
  }, [onClose, visible]);

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setIsLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 600);
  };

  if (!isMounted) return null;

  return (
    <>
      <HistoricoCorridas
        visible={historicoCorrida}
        onClose={() => setHistoricoCorrida(false)}
      />

      <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.3)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* HEADER */}
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
              <Text style={styles.headerTitle}>Seus ganhos</Text>
              <View style={{ width: 26 }} />
            </View>

            <View style={styles.tabContainer}>
              {["Diários", "Semanais", "Mensais"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => handleTabChange(tab as TabType)}
                  style={[
                    styles.tabItem,
                    activeTab === tab && styles.tabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.dateSelector}>
              <Text style={styles.dateText}>
                {activeTab === "Diários"
                  ? "27 jan (hoje)"
                  : activeTab === "Mensais"
                    ? "jan 2026"
                    : "26 jan - 1 fev"}
              </Text>
              <Ionicons name="caret-down" size={12} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#B0C4FF" />
              </View>
            )}

            <ScrollView
              style={[styles.body, { opacity: isLoading ? 0.3 : 1 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* CHART CARD */}
              <View style={styles.chartCard}>
                <Text style={styles.totalLabel}>
                  {activeTab === "Diários"
                    ? "R$41,49"
                    : activeTab === "Mensais"
                      ? "R$1.287,01"
                      : "R$216,38"}
                </Text>
                <View style={styles.earningsSummary}>
                  <TouchableOpacity onPress={mostrarHistoricoCorrida}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {activeTab === "Diários"
                          ? "R$20,16"
                          : activeTab === "Mensais"
                            ? "R$745,52"
                            : "R$91,97"}
                      </Text>
                      <Text style={styles.summaryLabel}>
                        Ganhos pagos em dinheiro
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.summaryItem}>
                    <TouchableOpacity onPress={mostrarHistoricoCorrida}>
                      <Text style={styles.summaryValue}>
                        {activeTab === "Diários"
                          ? "R$21,33"
                          : activeTab === "Mensais"
                            ? "R$541,49"
                            : "R$124,41"}
                      </Text>
                      <Text style={styles.summaryLabel}>
                        Ganhos pagos no app
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {activeTab !== "Mensais" && (
                  <View style={styles.chartContainer}>
                    {activeTab === "Diários"
                      ? [
                          "16:00",
                          "17:00",
                          "18:00",
                          "19:00",
                          "20:00",
                          "21:00",
                          "22:00",
                        ].map((hour, i) => (
                          <View key={i} style={styles.barWrapper}>
                            <Text style={styles.barTopText}>0,00</Text>
                            <View
                              style={[
                                styles.bar,
                                { height: 4, backgroundColor: "#EEE" },
                              ]}
                            />
                            <Text style={styles.barDayText}>{hour}</Text>
                          </View>
                        ))
                      : ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map(
                          (day, i) => (
                            <View key={i} style={styles.barWrapper}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height: i < 2 ? 40 : 4,
                                    backgroundColor: i < 2 ? "#B0C4FF" : "#EEE",
                                  },
                                ]}
                              />
                              <Text style={styles.barDayText}>{day}</Text>
                            </View>
                          ),
                        )}
                  </View>
                )}
              </View>

              {/* DETAILS SECTION */}
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Detalhamento de ganhos</Text>
                <DetailRow
                  label="Valor da solicitação"
                  onPress={mostrarHistoricoCorrida}
                  value={
                    activeTab === "Diários"
                      ? "R$41,49"
                      : activeTab === "Mensais"
                        ? "R$1.275,11"
                        : "R$214,38"
                  }
                />
                <DetailRow
                  label="Recompensa"
                  value="R$0,00"
                  onPress={mostrarHistoricoCorrida}
                />
                <DetailRow
                  label="Gorjeta"
                  onPress={mostrarHistoricoCorrida}
                  value={activeTab === "Mensais" ? "R$2,00" : "R$0,00"}
                />
                <DetailRow
                  label="Compensação"
                  onPress={mostrarHistoricoCorrida}
                  value={activeTab === "Mensais" ? "R$9,90" : "R$0,00"}
                />
                <DetailRow
                  label="Outro"
                  value="R$0,00"
                  onPress={mostrarHistoricoCorrida}
                />
                <TouchableOpacity
                  onPress={mostrarHistoricoCorrida}
                  style={styles.historyButton}
                >
                  <Text style={styles.historyButtonText}>
                    Histórico de solicitações
                  </Text>
                </TouchableOpacity>
              </View>

              {/* PAINEL DE GANHOS (Cards Anexos 1, 2 e 3) */}
              <StatsPanel activeTab={activeTab} />
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </View>
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
    backgroundColor: "#F5F6F8",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEE",
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 2,
    width: "100%",
    marginBottom: 15,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabText: { fontSize: 13, color: "#666", fontWeight: "500" },
  tabTextActive: { color: "#111" },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
  },
  dateText: { fontSize: 14, color: "#333", marginRight: 5, fontWeight: "500" },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  body: { flex: 1, padding: 16 },
  chartCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  totalLabel: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    marginVertical: 10,
  },
  earningsSummary: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { fontSize: 15, fontWeight: "700", color: "#333" },
  summaryLabel: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    height: 120,
    paddingTop: 20,
  },
  barWrapper: { alignItems: "center", flex: 1 },
  bar: { width: 22, borderRadius: 4 },
  barTopText: { fontSize: 9, color: "#666", marginBottom: 4 },
  barDayText: { fontSize: 10, color: "#999", marginTop: 8 },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: { fontSize: 14, color: "#444" },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginRight: 4,
  },
  historyButton: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  historyButtonText: { fontSize: 14, fontWeight: "700", color: "#444" },

  // ESTILOS DO NOVO PAINEL
  statsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 25,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#111" },
  statLabel: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 14,
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#EEE",
    paddingTop: 15,
  },
  helpLinkText: { flex: 1, fontSize: 13, color: "#666", marginLeft: 8 },
  taxa99Row: { alignItems: "center", marginTop: 10, marginBottom: 10 },
  taxaBadge: {
    backgroundColor: "#FFF2F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  taxaBadgeText: { color: "#FF5C5C", fontSize: 10, fontWeight: "bold" },
  taxaValue: { fontSize: 22, fontWeight: "bold", color: "#333" },
  taxaLabel: { fontSize: 12, color: "#666", marginRight: 2 },
});
