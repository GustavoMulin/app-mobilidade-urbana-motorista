import { useEstilos, useTema } from "@/theme/tema";
import SelosDaNota from "./SelosDaNota";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import { api } from "@/Services/api";
import {
  textoDeQuando,
  type NotaDeAgradecimento,
} from "@/domain/perfilMotorista";
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

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function NotasAgradecimento({
  visible,
  onClose,
  duration = 200,
}: props) {
  const { cores } = useTema();
  const styles = useEstilos(estilosBase);
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [notas, setNotas] = useState<NotaDeAgradecimento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultima, setUltima] = useState(1);
  const [carregando, setCarregando] = useState(false);

  const carregar = async (alvo: number) => {
    setCarregando(true);
    try {
      const { data } = await api.get<{
        data: NotaDeAgradecimento[];
        current_page: number;
        last_page: number;
      }>("/motorista/me/notas-agradecimento", { params: { page: alvo } });
      setNotas((atuais) =>
        alvo === 1 ? data.data : [...atuais, ...data.data],
      );
      setPagina(data.current_page);
      setUltima(data.last_page);
    } catch {
      // a lista fica como estava; tenta de novo ao reabrir
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (visible) void carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

  if (!isMounted) return null;

  const renderStars = (nota: number) => (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[styles.star, i >= nota && { color: "#DDD" }]}>
          ★
        </Text>
      ))}
    </View>
  );

  const renderCard = (item: NotaDeAgradecimento) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.quote}>“</Text>

      <Text style={styles.text}>{item.comentario}</Text>

      {item.elogios.length > 0 && (
        <Text style={styles.tags}>
          {item.elogios.map((titulo) => `"${titulo}"`).join(" ")}
        </Text>
      )}

      <Text style={styles.author}>
        {item.autor} • {textoDeQuando(item.quando)}
      </Text>

      {renderStars(item.nota)}

      {/* por último, no fim do cartão, os selos que a mesma avaliação recebeu */}
      {(item.selos ?? []).length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SelosDaNota selos={item.selos} tamanho={30} maximo={5} />
        </View>
      )}
    </View>
  );
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      {/* Overlay */}
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
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="arrow-back-outline"
                size={26}
                color={cores.icone}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Notas de agradecimentos</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {notas.length === 0 && !carregando && (
            <Text
              style={{
                padding: 24,
                textAlign: "center",
                color: "#777",
                lineHeight: 20,
              }}
            >
              Ainda não há notas de agradecimento. Os comentários que os
              passageiros deixarem ao avaliar você aparecem aqui.
            </Text>
          )}
          {notas.map(renderCard)}
          {pagina < ultima && (
            <TouchableOpacity
              disabled={carregando}
              onPress={() => void carregar(pagina + 1)}
              style={{ padding: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#2F6BFF", fontWeight: "600" }}>
                {carregando ? "Carregando..." : "Carregar mais"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const estilosBase = StyleSheet.create({
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
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e5e5",
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },

  body: {
    flex: 1,
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  quote: {
    fontSize: 40,
    color: "#ddd",
    position: "absolute",
    top: 10,
    left: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: "absolute",
    right: 16,
    top: 16,
  },

  text: {
    fontSize: 14,
    color: "#111",
    marginTop: 30,
    lineHeight: 20,
  },

  tags: {
    marginTop: 10,
    fontWeight: "600",
    color: "#111",
  },

  author: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },

  stars: {
    flexDirection: "row",
    marginTop: 6,
  },

  star: {
    color: "#FFD600",
    marginRight: 2,
    fontSize: 14,
  },
});
