import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  carregarCarteira,
  Carteira,
  consultarSaque,
  formatarReais,
  Movimento,
  Saque,
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
import DefinirMetodoResgate from "./DefinirMetodoResgate";
import SacarSaldo from "./SacarSaldo";
import SaqueStatus from "./SaqueStatus";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const ICONE_MOVIMENTO: Record<
  Movimento["tipo"],
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  corrida: "car",
  taxa_dinheiro: "cash",
  taxa_cancelamento: "cash-plus",
  saque: "bank-transfer-out",
};

const doisDigitos = (n: number) => String(n).padStart(2, "0");

const comoData = (iso: string | null) => {
  const data = iso ? new Date(iso) : null;
  return data && !Number.isNaN(data.getTime()) ? data : null;
};

const diaDe = (iso: string | null) => {
  const data = comoData(iso);
  return data
    ? `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`
    : "";
};

const hora = (iso: string | null) => {
  const data = comoData(iso);
  return data
    ? `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
    : "";
};

function agruparPorDia(movimentos: Movimento[]) {
  const grupos: { dia: string; itens: Movimento[] }[] = [];
  for (const movimento of movimentos) {
    const dia = diaDe(movimento.quando);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(movimento);
    else grupos.push({ dia, itens: [movimento] });
  }
  return grupos;
}

export default function MeuSaldo({ visible, onClose, duration = 200 }: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [sacarSaldo, setSacarSaldo] = useState(false);
  const [saqueAberto, setSaqueAberto] = useState<Saque | null>(null);
  const [visibleDefinirMetodoResgate, setVisibleDefinirMetodoResgate] =
    useState(false);
  const [carteira, setCarteira] = useState<Carteira | null>(null);
  const [erroCarteira, setErroCarteira] = useState(false);

  const recarregar = useCallback(() => {
    carregarCarteira()
      .then((dados) => {
        setCarteira(dados);
        setErroCarteira(false);
      })
      .catch(() => setErroCarteira(true));
  }, []);

  useEffect(() => {
    if (visible) recarregar();
  }, [visible, recarregar]);

  const mostrarSacarSaldo = () => {
    setSacarSaldo(true);
  };

  const mostrarDefinirMetodoResgate = () => {
    setVisibleDefinirMetodoResgate(true);
  };

  const abrirSaque = (id: number) => {
    consultarSaque(id)
      .then(setSaqueAberto)
      .catch(() => undefined);
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

  const grupos = agruparPorDia(carteira?.movimentos ?? []);

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
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
                <Ionicons name="chevron-back" size={28} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Saldo</Text>
              <TouchableOpacity onPress={mostrarDefinirMetodoResgate}>
                <Text style={styles.headerRight}>Configurações</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.container} bounces={false}>
            <View style={styles.balanceCard}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceValue}>
                  {carteira ? formatarReais(carteira.saldo) : "—"}
                </Text>
                <Text style={styles.regasText} numberOfLines={2}>
                  {carteira?.metodo_principal
                    ? `Saques para ${carteira.metodo_principal.descricao}`
                    : "Cadastre uma chave Pix ou conta bancária para sacar"}
                </Text>
                <Text style={styles.subText}>
                  Corridas pagas no app entram no saldo. Nas corridas em
                  dinheiro, a taxa da plataforma é descontada daqui.
                </Text>
                {carteira && carteira.saldo < 0 && (
                  <Text style={styles.avisoNegativo}>
                    O saldo está negativo por causa das taxas de corridas em
                    dinheiro: você já recebeu o valor delas em mãos. O valor é
                    abatido das próximas corridas pagas pelo app.
                  </Text>
                )}
                {erroCarteira && (
                  <Text style={styles.erroTexto} accessibilityRole="alert">
                    Não foi possível atualizar o saldo.
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={mostrarSacarSaldo}
                disabled={!carteira}
                accessibilityRole="button"
                style={[styles.btnResgatar, !carteira && styles.btnInativo]}
              >
                <Text style={styles.btnResgatarText}>Resgatar</Text>
              </TouchableOpacity>

              <MaterialCommunityIcons
                name="currency-usd"
                size={120}
                color="rgba(255,215,0,0.1)"
                style={styles.bgIcon}
              />
            </View>

            <View style={styles.listSection}>
              {carteira && carteira.movimentos.length === 0 && (
                <Text style={styles.vazio}>
                  Seus ganhos e saques vão aparecer aqui.
                </Text>
              )}

              {grupos.map((grupo) => (
                <View key={grupo.dia}>
                  <Text style={styles.dateText}>{grupo.dia}</Text>
                  {grupo.itens.map((item) => {
                    const ehSaque = item.tipo === "saque";
                    const falhou = item.status === "falhou";
                    const situacao = falhou
                      ? "Não concluído"
                      : item.status === "processando"
                        ? "Processando"
                        : item.detalhe;

                    return (
                      <TouchableOpacity
                        key={`${item.tipo}-${item.id}`}
                        disabled={!ehSaque}
                        onPress={() => abrirSaque(item.id)}
                        accessibilityRole={ehSaque ? "button" : undefined}
                        style={styles.transactionItem}
                      >
                        <View style={styles.itemLeft}>
                          <View style={styles.iconCircle}>
                            <MaterialCommunityIcons
                              name={ICONE_MOVIMENTO[item.tipo] ?? "cash"}
                              size={22}
                              color="#444"
                            />
                          </View>
                          <View style={styles.itemTextos}>
                            <Text style={styles.itemType}>
                              {item.descricao}
                            </Text>
                            <Text style={styles.itemTime} numberOfLines={1}>
                              {hora(item.quando)} · {situacao}
                            </Text>
                            {typeof item.recebido_em_maos === "number" && (
                              <Text style={styles.recebidoEmMaos}>
                                Você recebeu{" "}
                                {formatarReais(item.recebido_em_maos)} em
                                dinheiro
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.itemRight}>
                          <Text
                            style={[
                              styles.itemValue,
                              {
                                color: falhou
                                  ? "#999"
                                  : item.valor < 0
                                    ? "#111"
                                    : "#F39C12",
                              },
                            ]}
                          >
                            {formatarReais(item.valor)}
                          </Text>
                          {ehSaque && (
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#CCC"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      <SacarSaldo
        visible={sacarSaldo}
        carteira={carteira}
        onSacado={recarregar}
        onClose={() => {
          setSacarSaldo(false);
          recarregar();
        }}
      />
      <SaqueStatus
        visible={saqueAberto !== null}
        saque={saqueAberto}
        onClose={() => {
          setSaqueAberto(null);
          recarregar();
        }}
      />
      <DefinirMetodoResgate
        visible={visibleDefinirMetodoResgate}
        onClose={() => {
          setVisibleDefinirMetodoResgate(false);
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
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
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
  headerRight: {
    fontSize: 15,
    color: "#666",
  },
  container: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: "#FFFDED", // Amarelo bem claro conforme imagem
    padding: 20,
    paddingTop: 10,
    position: "relative",
    overflow: "hidden",
  },
  balanceInfo: {
    zIndex: 2,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111",
  },
  regasRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  regasText: {
    fontSize: 14,
    color: "#666",
  },
  avisoNegativo: {
    color: "#8A6100",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  recebidoEmMaos: { color: "#18794E", fontSize: 12, marginTop: 2 },
  subText: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
    width: "80%",
    lineHeight: 18,
  },
  btnResgatar: {
    backgroundColor: "#FFD700", // Amarelo 99
    borderRadius: 8,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    zIndex: 2,
  },
  btnResgatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  bgIcon: {
    position: "absolute",
    right: -20,
    top: -10,
    zIndex: 1,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 14,
    color: "#999",
  },
  transferenciaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  transferenciaLabel: {
    fontSize: 16,
    color: "#999",
  },
  transferenciaValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  itemTextos: {
    flexShrink: 1,
  },
  btnInativo: {
    opacity: 0.5,
  },
  erroTexto: {
    fontSize: 13,
    color: "#C62828",
    marginTop: 6,
  },
  vazio: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemType: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  itemTime: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemValue: {
    fontSize: 16,
    fontWeight: "700",
    marginRight: 5,
  },
});
