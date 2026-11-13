import { useAuth } from "@/context/AuthProvider";
import { api } from "@/Services/api";
import { AnimationConfig, useSlideAnimation } from "@/hooks/useSlideAnimation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "@/components/common/Texto";
import { textoDaNotaDoMotorista } from "@/domain/notaDoMotorista";
import {
  avisoDaSituacaoTaxa,
  type SituacaoTaxa,
} from "@/domain/taxaFinalizacao";
import {
  Animated,
  BackHandler,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CentralAjuda from "./CentralAjuda";
import CentralGanhos from "./CentralGanhos";
import ConvidarMotorista from "./ConvidarMotorista";
import HistoricoCorridas from "./HistoricoCorridas";
import HistoricoMensagens from "./HistoricoMensagens";
import Preferencias from "./Preferencias";
import TaxaAceitacao from "./TaxaAceitacao";
import TaxaFinalizacao from "./TaxaFinalizacao";
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
  label: string;
  onPress?: () => void;
  color?: string;
}

interface Estatisticas {
  taxa_aceitacao: number | null;
  taxa_finalizacao: number | null;
  taxa_finalizacao_minima?: number;
  situacao_taxa?: SituacaoTaxa;
  // média das notas dos passageiros; null enquanto não houver avaliação
  nota_motorista?: number | null;
}

const defaultMenuItems: MenuItem[] = [
  { label: "Histórico de corridas" },
  { label: "Ganhos" },
  { label: "Notificações" },
  { label: "Central de Ajuda" },
  { label: "Veículo" },
  // o servidor ainda não conta o tempo online (a tela mostrava 11:24 fixo)
  { label: "Horas dirigindo" },
  { label: "Indique e ganhe" },
  { label: "Preferências" },
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
  const [showConvidarMotorista, setShowConvidarMotorista] = useState(false);
  const [showTaxaFinalizacao, setShowTaxaFinalizacao] = useState(false);
  const [showTaxaAceitacao, setShowTaxaAceitacao] = useState(false);

  const handleDisconnect = () => {
    if (disponivel && !emCorrida) onAlternarDisponibilidade(false);
  };

  const closeMenu = useCallback(() => {
    closeAnimation(onClose);
  }, [closeAnimation, onClose]);

  // nota e taxas vêm da conta toda vez que o menu abre, para refletir
  // avaliações e corridas finalizadas há pouco
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);

  const finalizacaoAbaixoDaMinima =
    estatisticas?.taxa_finalizacao != null &&
    estatisticas.taxa_finalizacao_minima != null &&
    estatisticas.taxa_finalizacao < estatisticas.taxa_finalizacao_minima;
  const avisoDaTaxa = avisoDaSituacaoTaxa(estatisticas?.situacao_taxa);

  useEffect(() => {
    if (!visible) return;

    let ativo = true;
    api
      .get<Estatisticas>("/motorista/me/estatisticas")
      .then(({ data }) => {
        if (!ativo) return;
        setEstatisticas(data);
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
      // as telas das taxas decidem sozinhas: do Histórico voltam ao resumo, do resumo fecham
      if (showTaxaFinalizacao || showTaxaAceitacao) return false;
      if (showConvidarMotorista) {
        setShowConvidarMotorista(false);
        return true;
      }
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
    showTaxaFinalizacao,
    showTaxaAceitacao,
    showConvidarMotorista,
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
    if (item.label === "Indique e ganhe") {
      setShowConvidarMotorista(true);
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
      />
      <HorasDirigindo
        visible={showHorasDirigindo}
        onClose={() => setShowHorasDirigindo(false)}
      />
      <CentralGanhos
        visible={showCentralGanhos}
        onClose={() => setShowCentralGanhos(false)}
      />
      <TaxaFinalizacao
        visible={showTaxaFinalizacao}
        onClose={() => setShowTaxaFinalizacao(false)}
      />
      <TaxaAceitacao
        visible={showTaxaAceitacao}
        onClose={() => setShowTaxaAceitacao(false)}
      />
      <ConvidarMotorista
        visible={showConvidarMotorista}
        onClose={() => setShowConvidarMotorista(false)}
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
          <ScrollView
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16),
            }}
            showsVerticalScrollIndicator={false}
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

              <View
                style={styles.statusBadge}
                accessible
                accessibilityLabel={
                  typeof estatisticas?.nota_motorista === "number"
                    ? `Sua avaliação é ${textoDaNotaDoMotorista(estatisticas.nota_motorista)} estrelas`
                    : "Você ainda não tem avaliações"
                }
              >
                <View style={styles.badgeContent}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={styles.statusText} numberOfLines={1}>
                    {textoDaNotaDoMotorista(estatisticas?.nota_motorista)}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Abrir a taxa de aceitação"
                  activeOpacity={0.6}
                  onPress={() => setShowTaxaAceitacao(true)}
                  style={styles.statBox}
                >
                  <Text style={styles.statValue}>
                    {estatisticas?.taxa_aceitacao == null
                      ? "—"
                      : `${estatisticas.taxa_aceitacao}%`}
                  </Text>
                  <Text style={styles.statLabel}>Taxa de Aceitação</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Abrir a taxa de finalização"
                  activeOpacity={0.6}
                  onPress={() => setShowTaxaFinalizacao(true)}
                  style={styles.statBox}
                >
                  <Text
                    style={[
                      styles.statValue,
                      finalizacaoAbaixoDaMinima && styles.statValueAbaixo,
                    ]}
                  >
                    {estatisticas?.taxa_finalizacao == null
                      ? "—"
                      : `${estatisticas.taxa_finalizacao}%`}
                  </Text>
                  <Text style={styles.statLabel}>Taxa de Finalização</Text>
                </TouchableOpacity>
              </View>
              {avisoDaTaxa ? (
                <View style={styles.avisoTaxa}>
                  <Ionicons name="warning" size={16} color="#B3261E" />
                  <Text style={styles.avisoTaxaTexto}>{avisoDaTaxa}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.menuList}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => menuSelecionado(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Text
                    style={[
                      styles.menuText,
                      item.color && { color: item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {user && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta"
                >
                  <Text style={[styles.menuText, styles.logoutText]}>Sair</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
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
  // abaixo da taxa mínima de finalização definida pela plataforma
  statValueAbaixo: {
    color: "#D93025",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  // alerta de restrição por taxa de finalização baixa
  avisoTaxa: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FDECEA",
  },
  avisoTaxaTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#B3261E",
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
    fontSize: 26,
    color: "#111",
    fontWeight: "500",
  },
  logoutText: {
    color: "#FF4D4D",
  },
});
