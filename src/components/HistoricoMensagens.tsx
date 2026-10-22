import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import { api } from "@/Services/api";
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

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida_em: string | null;
  created_at: string;
}

const formatarQuando = (iso: string) => {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export default function HistoricoMensagens({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let ativo = true;
    setCarregando(true);
    api
      .get<{ data: Notificacao[]; nao_lidas: number }>("/notificacoes", {
        // a mesma conta pode ser passageiro e motorista
        params: { perfil: "motorista" },
      })
      .then(({ data }) => {
        if (!ativo) return;
        setNotificacoes(data.data);
        setNaoLidas(data.nao_lidas);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [visible]);

  const marcarTodasLidas = () => {
    if (naoLidas === 0) return;
    api
      .post("/notificacoes/lidas", null, { params: { perfil: "motorista" } })
      .then(() => {
        setNaoLidas(0);
        setNotificacoes((atuais) =>
          atuais.map((item) => ({
            ...item,
            lida_em: item.lida_em ?? new Date().toISOString(),
          })),
        );
      })
      .catch(() => {});
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

  const renderNotification = ({ item }: { item: Notificacao }) => (
    <View style={styles.notificationItem}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={item.lida_em ? "notifications-outline" : "notifications"}
          size={24}
          color={item.lida_em ? "#666" : "#2F6BFF"}
        />
      </View>
      <View style={styles.textContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.mensagem}
        </Text>
        <Text style={styles.notifTime}>{formatarQuando(item.created_at)}</Text>
      </View>
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
        {/* HEADER PRINCIPAL */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={28} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notificações</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>

        {/* SUB-HEADER COM MENSAGENS E FILTROS */}
        <View style={styles.subHeader}>
          <View style={styles.messageSummary}>
            <Text style={styles.summaryText}>
              {naoLidas > 0
                ? `Mensagens (${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"})`
                : "Mensagens"}
            </Text>
            <TouchableOpacity
              onPress={marcarTodasLidas}
              accessibilityRole="button"
              accessibilityLabel="Marcar todas como lidas"
              disabled={naoLidas === 0}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={naoLidas === 0 ? "#CCC" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LISTA DE NOTIFICAÇÕES */}
        <FlatList
          data={notificacoes}
          renderItem={renderNotification}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                {carregando
                  ? "Carregando..."
                  : "Você ainda não tem notificações. Elas aparecem aqui quando uma corrida termina ou um pagamento é recebido."}
              </Text>
            </View>
          }
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: { padding: 24, alignItems: "center" },
  vazioTexto: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
  },
  subHeader: {
    backgroundColor: "#FFF",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  messageSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  summaryActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  filterTab: {
    paddingHorizontal: 22,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  filterTabActive: {
    backgroundColor: "#FFF",
    borderColor: "#FF6B00", // Cor de destaque baseada no estilo 99
  },
  filterText: {
    fontSize: 14,
    color: "#666",
  },
  filterTextActive: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
  },
  iconContainer: {
    marginRight: 15,
  },
  textContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 12,
    color: "#999",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 65, // Alinha com o início do texto
  },
});
