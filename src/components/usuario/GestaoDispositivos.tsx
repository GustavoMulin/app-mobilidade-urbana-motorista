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

// Mock de dispositivos conectados
const DISPOSITIVOS = [
  {
    id: "1",
    nome: "iPhone 15 Pro (Este dispositivo)",
    localizacao: "Porto Velho, Brasil",
    ultimaSessao: "Ativo agora",
    isCurrent: true,
    icon: "smartphone-outline",
  },
  {
    id: "2",
    nome: 'MacBook Pro 14"',
    localizacao: "Porto Velho, Brasil",
    ultimaSessao: "Último acesso: Ontem às 14:20",
    isCurrent: false,
    icon: "desktop-outline",
  },
  {
    id: "3",
    nome: "Samsung Galaxy S23",
    localizacao: "São Paulo, Brasil",
    ultimaSessao: "Último acesso: 05 de Abr às 09:12",
    isCurrent: false,
    icon: "smartphone-outline",
  },
];

export default function GestaoDispositivos({
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

  const renderItem = ({ item }: any) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceInfo}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={24} color="#444" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.deviceName}>{item.nome}</Text>
          <Text style={styles.deviceSub}>
            {item.localizacao} • {item.ultimaSessao}
          </Text>
        </View>
      </View>

      {!item.isCurrent && (
        <TouchableOpacity style={styles.logoutIconButton}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
        </TouchableOpacity>
      )}
      {item.isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentText}>ATIVO</Text>
        </View>
      )}
    </View>
  );

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
            <Text style={styles.headerTitle}>Gestão de dispositivos</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>Sessões ativas</Text>
            <Text style={styles.introDesc}>
              Estes são os dispositivos que acessaram sua conta recentemente. Se
              não reconhecer algum, desconecte-o imediatamente.
            </Text>
          </View>

          <FlatList
            data={DISPOSITIVOS}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity style={styles.globalLogout}>
            <Text style={styles.globalLogoutText}>
              Sair de todas as sessões
            </Text>
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
    padding: 20,
  },
  introBox: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  introDesc: {
    fontSize: 14,
    color: "#777",
    lineHeight: 20,
  },
  list: {
    paddingBottom: 20,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  deviceSub: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  logoutIconButton: {
    padding: 8,
    backgroundColor: "#FDEDEC",
    borderRadius: 8,
  },
  currentBadge: {
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#27AE60",
  },
  globalLogout: {
    marginTop: "auto",
    marginBottom: 10,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  globalLogoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E74C3C",
  },
});
