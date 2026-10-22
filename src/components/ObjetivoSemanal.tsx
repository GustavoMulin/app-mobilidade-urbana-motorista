import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DefinirMetaGanhos from "./DefinirMetaGanhos";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const FeatureItem = ({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) => (
  <TouchableOpacity style={styles.featureRow}>
    <View style={styles.featureIconContainer}>
      <Ionicons name={icon} size={24} color="#111" />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export default function ObjetivoSemanal({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [dialogDefinirMetaGanhos, setDialogDefinirMetaGanhos] = useState(false);

  const mostrarDefinirMetaGanhos = () => {
    setDialogDefinirMetaGanhos(true);
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

        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
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
              <Text style={styles.headerTitle}>Definir meta de ganhos</Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            {/* CARD DE OBJETIVO */}
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalMainTitle}>Objetivo semanal</Text>
                <TouchableOpacity
                  onPress={mostrarDefinirMetaGanhos}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil" size={14} color="#111" />
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalDescription}>
                Fica mais fácil atingir sua meta se ela estiver registrada
              </Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                  <View style={styles.iconMoney}>
                    <Ionicons name="cash-outline" size={18} color="#00D084" />
                  </View>
                  <Text style={styles.progressLabel}>Objetivo semanal</Text>
                  <Text style={styles.progressValues}>
                    <Text style={styles.currentValue}>257,87</Text>
                    <Text style={styles.totalValue}> / R$1.400,00</Text>
                  </Text>
                </View>

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: "18%" }]} />
                </View>

                <Text style={styles.continueText}>
                  Continue aumentando seus ganhos
                </Text>
              </View>
            </View>

            {/* ESPAÇADOR CINZA */}
            <View style={styles.separator} />

            {/* LISTA DE RECURSOS */}
            <View style={styles.featuresList}>
              <FeatureItem
                icon="stats-chart"
                title="Acompanhe o progresso dos seus ganhos"
                subtitle="Veja quanto falta para atingir sua meta"
              />
              <FeatureItem
                icon="ribbon-outline"
                title="Receba sugestões de como aumentar seus ganhos"
                subtitle="Dicas personalizadas para atingir sua meta com mais rapidez"
              />
            </View>
          </View>
        </Animated.View>
      </View>
      <DefinirMetaGanhos
        visible={dialogDefinirMetaGanhos}
        onClose={() => setDialogDefinirMetaGanhos(false)}
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
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEE",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  body: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  // Goal Card
  goalCard: {
    padding: 20,
    backgroundColor: "#FFF",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalMainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
    color: "#111",
  },
  goalDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 25,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconMoney: {
    marginRight: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },
  progressValues: {
    fontSize: 16,
  },
  currentValue: {
    fontWeight: "bold",
    color: "#111",
  },
  totalValue: {
    color: "#BBB",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00D084",
    borderRadius: 3,
  },
  continueText: {
    fontSize: 14,
    color: "#00D084",
    fontWeight: "700",
    marginTop: 12,
  },
  separator: {
    height: 8,
    backgroundColor: "#F7F7F7",
    width: "100%",
  },
  featuresList: {
    padding: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  featureIconContainer: {
    marginTop: 2,
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: "#888",
    lineHeight: 20,
  },
});
