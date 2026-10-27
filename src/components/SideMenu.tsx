import { useAuth } from "@/context/AuthProvider";
import { api } from "@/Services/api";
import { AnimationConfig, useSlideAnimation } from "@/hooks/useSlideAnimation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Image,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CentralAjuda from "./CentralAjuda";
import CentralGanhos from "./CentralGanhos";
import HistoricoCorridas from "./HistoricoCorridas";
import HistoricoMensagens from "./HistoricoMensagens";
import Preferencias from "./Preferencias";
import HorasDirigindo from "./usuario/HorasDirigindo";
import MeusVeiculos from "./usuario/MeusVeiculos";
import PerfilUsuario from "./usuario/PerfilUsuario";
interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  drawerWidth: number;
  animationConfig?: AnimationConfig;
  menuItems?: MenuItem[];
  showOverlay?: boolean;
  enableSwipeGesture?: boolean;
  disponivel: boolean;
  emCorrida: boolean;
  onAlternarDisponibilidade: (proximoEstado: boolean) => void;
}

interface MenuItem {
  icon: string;
  label: string;
  onPress?: () => void;
  color?: string;
  // ainda não existe: aparece com selo e não abre
  emBreve?: boolean;
}

const defaultMenuItems: MenuItem[] = [
  { icon: "time-outline", label: "Histórico de corridas" },
  { icon: "cash-outline", label: "Ganhos" },
  { icon: "chatbubble-outline", label: "Notificações" },
  { icon: "shield-checkmark-outline", label: "Central de Ajuda" },
  { icon: "car-outline", label: "Veículo" },
  // o servidor ainda não conta o tempo online (a tela mostrava 11:24 fixo)
  { icon: "time-outline", label: "Horas dirigindo", emBreve: true },
  { icon: "settings-outline", label: "Preferências" },
];

export default function SideMenu({
  visible,
  onClose,
  drawerWidth,
  animationConfig = {},
  menuItems = defaultMenuItems,
  showOverlay = true,
  enableSwipeGesture = true,
  disponivel,
  emCorrida,
  onAlternarDisponibilidade,
}: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { translateX, overlayOpacity, closeAnimation } = useSlideAnimation(
    visible,
    drawerWidth,
    animationConfig,
  );

  const [isMounted, setIsMounted] = useState(visible);
  const [showHistoricoCorridas, setShowHistoricoCorridas] = useState(false);
  const [showHistoricoMensagens, setShowHistoricoMensagens] = useState(false);
  const [showCentralAjuda, setShowCentralAjuda] = useState(false);
  const [showPerfilUsuario, setShowPerfilUsuario] = useState(false);
  const [showMeusVeiculos, setShowMeusVeiculos] = useState(false);
  const [showHorasDirigindo, setShowHorasDirigindo] = useState(false);
  const [showCentralGanhos, setShowCentralGanhos] = useState(false);
  const [showPreferencias, setShowPreferencias] = useState(false);

  const handleDisconnect = () => {
    if (disponivel && !emCorrida) onAlternarDisponibilidade(false);
  };

  const closeMenu = useCallback(() => {
    closeAnimation(onClose);
  }, [closeAnimation, onClose]);

  // veículo e números vêm da conta toda vez que o menu abre, para refletir
  // um veículo cadastrado agora ou corridas finalizadas há pouco
  const [veiculoPrincipal, setVeiculoPrincipal] = useState<string | null>(null);
  const [estatisticas, setEstatisticas] = useState<{
    taxa_aceitacao: number | null;
    taxa_finalizacao: number | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;

    let ativo = true;
    Promise.all([
      api.get<{
        veiculo_ativo_id: number | null;
        data: { id: number; marca?: string; modelo?: string; placa?: string }[];
      }>("/motorista/me/veiculos"),
      api.get<{
        taxa_aceitacao: number | null;
        taxa_finalizacao: number | null;
      }>("/motorista/me/estatisticas"),
    ])
      .then(([veiculos, numeros]) => {
        if (!ativo) return;
        const primeiro = veiculos.data.data?.find(
          (veiculo) => veiculo.id === veiculos.data.veiculo_ativo_id,
        );
        setVeiculoPrincipal(
          primeiro
            ? // a placa vem primeiro: se o nome do modelo for longo, ela não some
              [primeiro.placa, primeiro.modelo].filter(Boolean).join(" · ")
            : null,
        );
        setEstatisticas(numeros.data);
      })
      .catch(() => {
        // sem rede o menu segue abrindo; os campos ficam como estavam
      });

    return () => {
      ativo = false;
    };
  }, [visible]);

  useEffect(() => {
    // Se o dialog estiver aberto, fecha
    const onBackPress = () => {
      if (showPreferencias) {
        setShowPreferencias(false);
        return true;
      }
      if (showCentralGanhos) {
        setShowCentralGanhos(false);
        return true;
      }
      if (showPerfilUsuario) {
        setShowPerfilUsuario(false);
        return true;
      }
      if (showHorasDirigindo) {
        setShowHorasDirigindo(false);
        return true;
      }
      if (showHistoricoMensagens) {
        setShowHistoricoMensagens(false);
        return true;
      }
      if (showHistoricoCorridas) {
        setShowHistoricoCorridas(false);
        return true;
      }
      if (showCentralAjuda) {
        setShowCentralAjuda(false);
        return true;
      }
      if (showMeusVeiculos) {
        setShowMeusVeiculos(false);
        return true;
      }
      if (visible) {
        closeMenu();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    visible,
    closeMenu,
    showPreferencias,
    showCentralGanhos,
    showPerfilUsuario,
    showHorasDirigindo,
    showHistoricoMensagens,
    showHistoricoCorridas,
    showCentralAjuda,
    showMeusVeiculos,
  ]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0);
    } else {
      const closeDelay = animationConfig?.duration ?? 300;
      const t = setTimeout(() => setIsMounted(false), closeDelay + 20);
      return () => clearTimeout(t);
    }
  }, [visible, animationConfig?.duration]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enableSwipeGesture,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return enableSwipeGesture && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50 || gestureState.vx < -0.5) {
            closeMenu();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              damping: animationConfig.damping || 20,
              stiffness: animationConfig.stiffness || 90,
            }).start();
          }
        },
      }),
    [
      animationConfig.damping,
      animationConfig.stiffness,
      closeMenu,
      enableSwipeGesture,
      translateX,
    ],
  );

  const handleLogout = () => {
    closeMenu();
    void logout();
  };

  const menuSelecionado = (item: MenuItem) => {
    if (item.label === "Histórico de corridas") {
      setShowHistoricoCorridas(true);
    }
    if (item.label === "Notificações") {
      setShowHistoricoMensagens(true);
    }
    if (item.label === "Central de Ajuda") {
      setShowCentralAjuda(true);
    }
    if (item.label === "Veículo") {
      setShowMeusVeiculos(true);
    }
    if (item.label === "Horas dirigindo") {
      setShowHorasDirigindo(true);
    }
    if (item.label === "Ganhos") {
      setShowCentralGanhos(true);
    }
    if (item.label === "Preferências") {
      setShowPreferencias(true);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      <HistoricoCorridas
        visible={showHistoricoCorridas}
        onClose={() => setShowHistoricoCorridas(false)}
      />
      <HistoricoMensagens
        visible={showHistoricoMensagens}
        onClose={() => setShowHistoricoMensagens(false)}
      />
      <CentralAjuda
        visible={showCentralAjuda}
        onClose={() => setShowCentralAjuda(false)}
      />
      <PerfilUsuario
        visible={showPerfilUsuario}
        onClose={() => setShowPerfilUsuario(false)}
      />
      <MeusVeiculos
        visible={showMeusVeiculos}
        onClose={() => setShowMeusVeiculos(false)}
        disponivel={disponivel}
        emCorrida={emCorrida}
        onVeiculoSelecionado={(veiculo) =>
          setVeiculoPrincipal(
            [veiculo.placa, veiculo.modelo].filter(Boolean).join(" · "),
          )
        }
      />
      <HorasDirigindo
        visible={showHorasDirigindo}
        onClose={() => setShowHorasDirigindo(false)}
      />
      <CentralGanhos
        visible={showCentralGanhos}
        onClose={() => setShowCentralGanhos(false)}
      />
      <Preferencias
        visible={showPreferencias}
        onClose={() => setShowPreferencias(false)}
        onDisconnect={handleDisconnect}
        buscandoCorrida={disponivel && !emCorrida}
      />

      <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
        {showOverlay && (
          <TouchableWithoutFeedback onPress={closeMenu}>
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
            />
          </TouchableWithoutFeedback>
        )}

        <Animated.View
          style={[
            styles.sideMenu,
            {
              width: drawerWidth,
              paddingTop: Math.max(insets.top + 12, 40),
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* HEADER DE PERFIL */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={() => setShowPerfilUsuario(true)}>
              {user?.foto ? (
                <Image source={{ uri: user.foto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarVazio]}>
                  <Ionicons name="person" size={36} color="#777" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || "Motorista"}</Text>
            </View>

            <Text style={styles.statusReal}>
              {emCorrida ? "Em corrida" : disponivel ? "Online" : "Offline"}
            </Text>

            <TouchableOpacity
              style={styles.statusBadge}
              accessibilityRole="button"
              onPress={() => setShowMeusVeiculos(true)}
            >
              <View style={styles.badgeContent}>
                <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                <Text style={styles.statusText} numberOfLines={1}>
                  {veiculoPrincipal ?? "Cadastrar veículo"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#FFF" />
              </View>
              {/* o aviso é para cadastrar: com veículo não há o que avisar */}
              {veiculoPrincipal ? null : (
                <View style={styles.notificationDot} />
              )}
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {estatisticas?.taxa_aceitacao == null
                    ? "—"
                    : `${estatisticas.taxa_aceitacao}%`}
                </Text>
                <Text style={styles.statLabel}>Taxa de Aceitação</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {estatisticas?.taxa_finalizacao == null
                    ? "—"
                    : `${estatisticas.taxa_finalizacao}%`}
                </Text>
                <Text style={styles.statLabel}>Taxa de Finalização</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => menuSelecionado(item)}
                disabled={item.emBreve}
                accessibilityRole="button"
                accessibilityLabel={
                  item.emBreve ? `${item.label}, em breve` : item.label
                }
                accessibilityState={{ disabled: item.emBreve === true }}
              >
                <Ionicons
                  name={
                    item.icon as React.ComponentProps<typeof Ionicons>["name"]
                  }
                  size={19}
                  color={item.emBreve ? "#9CA3AF" : (item.color ?? "#333")}
                />
                <Text
                  style={[
                    styles.menuText,
                    item.color && { color: item.color },
                    item.emBreve && styles.menuTextoEmBreve,
                  ]}
                >
                  {item.label}
                </Text>
                {item.emBreve ? (
                  <View style={styles.emBreve}>
                    <Text style={styles.emBreveTexto}>Em breve</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}

            {user && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
              >
                <Ionicons name="log-out-outline" size={19} color="#FF4D4D" />
                <Text style={[styles.menuText, styles.logoutText]}>Sair</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  sideMenu: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: 40,
    elevation: 8,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    marginBottom: 15,
  },
  avatarVazio: {
    backgroundColor: "#F0F1F3",
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userName: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#111",
  },
  statusReal: {
    color: "#666",
    fontSize: 13,
    marginBottom: 8,
  },
  statusBadge: {
    maxWidth: "100%",
    backgroundColor: "#313663",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  badgeContent: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    flexShrink: 1,
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D4D",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#EEE",
  },
  // LISTA DE ITENS
  menuList: {
    paddingHorizontal: 18,
    marginTop: 10,
  },
  menuItem: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "500",
  },
  menuTextoEmBreve: { color: "#6B7280" },
  emBreve: {
    borderRadius: 999,
    backgroundColor: "#ECEDEF",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emBreveTexto: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  logoutText: {
    color: "#FF4D4D",
  },
});
