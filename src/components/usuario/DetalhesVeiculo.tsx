import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface veiculo {
  id: string;
  tipo: string;
  status: string;
  placa: string;
  modelo: string;
  imagem: string;
  ativo: boolean;
}

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  data: veiculo | null;
}

export default function DetalhesVeiculo({
  visible,
  onClose,
  duration = 200,
  data,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  const [isMounted, setIsMounted] = useState(visible);
  const [showDialog, setShowDialog] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // animação dialog
  const [dialogScale] = useState(() => new Animated.Value(0.9));
  const [dialogOpacity] = useState(() => new Animated.Value(0));

  const closeDialog = useCallback(() => {
    Animated.parallel([
      Animated.timing(dialogScale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(dialogOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setShowDialog(false));
  }, [dialogOpacity, dialogScale]);

  useEffect(() => {
    const onBackPress = () => {
      if (showDialog) {
        closeDialog();
        return true;
      }

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
  }, [visible, showDialog, closeDialog, onClose]);

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

  const openDialog = () => {
    setShowDialog(true);
    Animated.parallel([
      Animated.spring(dialogScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(dialogOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!isMounted || !data) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      {/* Overlay principal */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={26} color="#111" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Veículo</Text>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={22} color="#2ECC71" />
            <Text style={styles.statusText}>{data?.status}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placaText}>{data?.placa}</Text>
                <Text style={styles.modeloText}>{data?.modelo}</Text>
              </View>

              <Image source={{ uri: data?.imagem }} style={styles.avatar} />
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Categoria</Text>
                <Text style={styles.infoValue}>{data?.tipo}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cidade</Text>
                <Text style={styles.infoValue}>Porto Velho</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome</Text>
                <Text style={styles.infoValue}>DIOGO GUIMARAES DE S..</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data de cadastro</Text>
                <Text style={styles.infoValue}>14/03/2024</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.removeButton} onPress={openDialog}>
            <Text style={styles.removeButtonText}>Remover este veículo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* OVERLAY DO DIALOG (abaixo do header) */}
      {showDialog && (
        <Pressable
          style={[StyleSheet.absoluteFill, { top: headerHeight, zIndex: 5 }]}
          onPress={closeDialog}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(0,0,0,0.35)",
                opacity: dialogOpacity,
              },
            ]}
          />
        </Pressable>
      )}

      {/* DIALOG CENTRALIZADO */}
      {showDialog && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              top: headerHeight,
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10, // 👈 acima do overlay
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.dialog,
              {
                opacity: dialogOpacity,
                transform: [{ scale: dialogScale }],
              },
            ]}
          >
            <Text style={styles.dialogText}>
              Você tem certeza que deseja remover este veículo?
            </Text>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.dialogButton}>
              <Text style={styles.dialogConfirm}>Sim</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.dialogButton} onPress={closeDialog}>
              <Text style={styles.dialogCancel}>Não</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  infoList: { borderTopWidth: 0 },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#f7f7f7",
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
  },

  backButton: {
    marginRight: 10,
  },

  closeButton: {
    marginRight: 15,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
  },

  statusContainer: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },

  statusText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#2ECC71",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },

  cardHeader: {
    flexDirection: "row",
    marginBottom: 20,
  },

  placaText: {
    fontSize: 24,
    fontWeight: "800",
  },

  modeloText: {
    fontSize: 13,
    color: "#666",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  infoLabel: {
    color: "#999",
  },

  infoValue: {
    color: "#333",
  },

  footer: {
    padding: 20,
  },

  removeButton: {
    backgroundColor: "#eee",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  removeButtonText: {
    fontWeight: "700",
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },

  // DIALOG
  dialog: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },

  dialogText: {
    padding: 20,
    fontSize: 15,
    color: "#333",
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
  },

  dialogButton: {
    padding: 16,
    alignItems: "center",
  },

  dialogConfirm: {
    color: "#F57C00",
    fontWeight: "600",
    fontSize: 16,
  },

  dialogCancel: {
    color: "#666",
    fontSize: 16,
  },
});
