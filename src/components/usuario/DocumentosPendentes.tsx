import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

// Mock de dados para os documentos
const DOCUMENTOS = [
  {
    id: "1",
    titulo: "Documento de Identidade (RG)",
    data: "Enviado em 12/03/2026",
    status: "Aprovado",
    icon: "person-card-outline",
  },
  {
    id: "2",
    titulo: "Comprovante de Residência",
    data: "Enviado em 12/03/2026",
    status: "Em análise",
    icon: "home-outline",
  },
  {
    id: "3",
    titulo: "CNH (Motorista)",
    data: "Enviado em 10/03/2026",
    status: "Aprovado",
    icon: "car-outline",
  },
  {
    id: "4",
    titulo: "Antecedentes Criminais",
    data: "Enviado em 05/03/2026",
    status: "Recusado",
    icon: "document-text-outline",
  },
];

export default function DocumentosEnviados({
  visible,
  onClose,
  duration = 200,
}: props) {
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
  }, [visible, duration, translateX, overlayOpacity]);

  if (!isMounted) return null;

  const renderItem = ({ item }: any) => {
    const getStatusColor = (status: string) => {
      if (status === "Aprovado") return "#2ECC71";
      if (status === "Em análise") return "#F1C40F";
      return "#E74C3C";
    };

    return (
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon} size={24} color="#555" />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.docTitle}>{item.titulo}</Text>
            <Text style={styles.docDate}>{item.data}</Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
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
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Documentos enviados</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={styles.descriptionBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#666"
            />
            <Text style={styles.descriptionText}>
              Aqui você pode acompanhar o status de validação dos documentos que
              você enviou para a nossa plataforma.
            </Text>
          </View>

          <FlatList
            data={DOCUMENTOS}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity style={styles.newDocButton}>
            <Ionicons name="add-circle-outline" size={20} color="#111" />
            <Text style={styles.newDocText}>Enviar novo documento</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
    padding: 16,
    backgroundColor: "#fff",
  },
  descriptionBox: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    marginLeft: 10,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  docDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  newDocButton: {
    flexDirection: "row",
    height: 54,
    backgroundColor: "#FFD600",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  newDocText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginLeft: 8,
  },
});
