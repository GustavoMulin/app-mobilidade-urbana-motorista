import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import { api } from "@/Services/api";
import {
  carregarMetodosResgate,
  formatarReais,
  MetodoResgate,
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
import HistoricoCorridas from "./HistoricoCorridas";
import MetodosResgate from "./MetodoResgate";
import MeuSaldo from "./MeuSaldo";
const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function CentralGanhos({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [historicoCorridas, setHistoricoCorridas] = useState(false);
  const [meuSaldo, setMeuSaldo] = useState(false);
  // números reais vindos de /motorista/me/ganhos; "—" enquanto carrega ou sem rede
  const [ganhos, setGanhos] = useState<{
    data: string;
    ganhos_do_dia: number;
    saldo: number;
  } | null>(null);

  const [visibleMetodoResgate, setVisibleMetodoResgate] = useState(false);

  const mostrarMetodoResgate = () => {
    setVisibleMetodoResgate(true);
  };

  const mostrarHistoricoCorridas = () => {
    setHistoricoCorridas(true);
  };

  const mostrarMeuSaldo = () => {
    setMeuSaldo(true);
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

  const [metodoPrincipal, setMetodoPrincipal] = useState<MetodoResgate | null>(
    null,
  );

  // de novo ao voltar do saldo ou dos métodos: um saque ou um método novo
  // muda o que aparece aqui
  const recarregar = useCallback(() => {
    api
      .get<{ data: string; ganhos_do_dia: number; saldo: number }>(
        "/motorista/me/ganhos",
      )
      .then(({ data }) => setGanhos(data))
      .catch(() => {});
    carregarMetodosResgate()
      .then((metodos) =>
        setMetodoPrincipal(metodos.find((metodo) => metodo.principal) ?? null),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) recarregar();
  }, [visible, recarregar]);


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
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
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
                <Ionicons name="chevron-back" size={24} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Central de ganhos</Text>
              <TouchableOpacity onPress={mostrarHistoricoCorridas}>
                <Text style={styles.headerLink}>Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BODY */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* CARD PRINCIPAL - GANHOS DO DIA */}
            <TouchableOpacity
              onPress={mostrarHistoricoCorridas}
              style={styles.mainEarningCard}
            >
              <Text style={styles.earningLabel}>
                Ganhos do dia{ganhos ? ` (${ganhos.data})` : ""}
              </Text>
              <View style={styles.row}>
                <Text style={styles.earningValue}>
                  {formatarReais(ganhos?.ganhos_do_dia)}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#333" />
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Meus recursos</Text>

            {/* SEÇÃO MEUS RECURSOS */}
            <View style={styles.resourcesContainer}>
              {/* SALDO */}
              <TouchableOpacity
                onPress={mostrarMeuSaldo}
                style={styles.resourceItem}
              >
                <View style={styles.row}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#E3F2FD" }]}
                  >
                    <Ionicons name="cash" size={22} color="#1976D2" />
                  </View>
                  <Text style={styles.resourceName}>Saldo</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.resourceValue}>
                    {formatarReais(ganhos?.saldo)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* MÉTODO DE RESGATE */}
              <TouchableOpacity
                onPress={mostrarMetodoResgate}
                style={styles.resourceItem}
              >
                <View style={styles.row}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#FFF3E0" }]}
                  >
                    <Ionicons name="home" size={22} color="#E65100" />
                  </View>
                  <View>
                    <Text style={styles.resourceName}>Método de resgate</Text>
                    <Text style={styles.resourceSubtext} numberOfLines={1}>
                      {metodoPrincipal
                        ? metodoPrincipal.descricao
                        : "Adicione uma chave Pix ou conta"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CCC" />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* CONTA 99 */}
              <TouchableOpacity style={styles.resourceItem}>
                <View style={styles.row}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#FFEBEE" }]}
                  >
                    <Ionicons name="wallet" size={22} color="#D32F2F" />
                  </View>
                  <View>
                    <Text style={styles.resourceName}>Conta99</Text>
                    <Text style={styles.resourceSubtext}>
                      Saque quando quiser, pague boleto
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Text style={styles.resourceValue}>—</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Melhore seus ganhos</Text>

            {/* RECOMPENSAS: ainda não existem. A indicação ficou escondida
                (a tela prometia R$ 500 por convite que ninguém paga) */}
            <View
              style={styles.improvementItem}
              accessibilityLabel="Recompensas, em breve"
              accessibilityState={{ disabled: true }}
            >
              <View style={styles.row}>
                <Ionicons name="gift-outline" size={24} color="#9CA3AF" />
                <View style={styles.improvementTextContent}>
                  <Text style={[styles.resourceName, styles.emBreveNome]}>
                    Recompensas
                  </Text>
                  <Text style={styles.resourceSubtext}>
                    Confira suas recompensas mais recentes
                  </Text>
                </View>
              </View>
              <View style={styles.emBreve}>
                <Text style={styles.emBreveTexto}>Em breve</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      <HistoricoCorridas
        visible={historicoCorridas}
        onClose={() => setHistoricoCorridas(false)}
      />
      <MeuSaldo
        visible={meuSaldo}
        onClose={() => {
          setMeuSaldo(false);
          recarregar();
        }}
      />
      <MetodosResgate
        visible={visibleMetodoResgate}
        onClose={() => {
          setVisibleMetodoResgate(false);
          recarregar();
        }}
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
    backgroundColor: "#F8F8F8",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDD",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerLink: {
    fontSize: 14,
    color: "#666",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mainEarningCard: {
    backgroundColor: "#FFD700", // Amarelo característico
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    elevation: 2,
  },
  earningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  earningValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    flex: 1,
  },
  secondaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
  },
  cardLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 24,
    marginBottom: 12,
  },
  resourcesContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  resourceSubtext: {
    fontSize: 12,
    color: "#888",
  },
  resourceValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  emBreveNome: { color: "#6B7280" },
  emBreve: {
    borderRadius: 999,
    backgroundColor: "#ECEDEF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emBreveTexto: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  improvementItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  improvementTextContent: {
    marginLeft: 16,
    flex: 1,
  },
});
