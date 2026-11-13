import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import Carregando3D from "@/components/common/Carregando3D";
import { Text } from "@/components/common/Texto";
import {
  inicialDoNome,
  textoDeQuando,
  type NotaDeAgradecimento,
} from "@/domain/perfilMotorista";
import { useDadosDaTela } from "@/hooks/useDadosDaTela";
import { api } from "@/Services/api";
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

interface PaginaDeNotas {
  data: NotaDeAgradecimento[];
  current_page: number;
  last_page: number;
}

export default function NotasAgradecimento({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // a primeira página vem ao abrir; as demais, no botão Carregar mais
  const { dados, erro } = useDadosDaTela<PaginaDeNotas>(
    visible,
    "/motorista/me/notas-agradecimento",
  );
  const [extras, setExtras] = useState<NotaDeAgradecimento[]>([]);
  const [proxima, setProxima] = useState(2);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const itens = [...(dados?.data ?? []), ...extras];
  const temMais = dados !== null && proxima <= dados.last_page;

  const carregarMais = () => {
    setCarregandoMais(true);
    api
      .get<PaginaDeNotas>("/motorista/me/notas-agradecimento", {
        params: { page: proxima },
      })
      .then(({ data }) => {
        setExtras((atuais) => [...atuais, ...data.data]);
        setProxima((atual) => atual + 1);
      })
      .catch(() => undefined)
      .finally(() => setCarregandoMais(false));
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
      ]).start(({ finished }) => {
        if (!finished) return;
        setIsMounted(false);
        setExtras([]);
        setProxima(2);
      });
    }
  }, [duration, overlayOpacity, translateX, visible]);

  if (!isMounted) return null;

  const renderStars = (nota: number) => (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[styles.star, i >= nota && styles.estrelaVazia]}>
          ★
        </Text>
      ))}
    </View>
  );

  const renderCard = (item: NotaDeAgradecimento) => (
    <View key={item.id} style={styles.card}>
      {/* aspas */}
      <Text style={styles.quote}>“</Text>

      {/* avatar: a foto de quem avaliou não é exposta, só a inicial */}
      <View style={[styles.avatar, styles.avatarInicial]}>
        <Text style={styles.inicial}>{inicialDoNome(item.autor)}</Text>
      </View>

      {/* texto */}
      <Text style={styles.text}>{item.comentario}</Text>

      {/* elogios marcados */}
      {item.elogios.length > 0 ? (
        <Text style={styles.tags}>
          {item.elogios.map((elogio) => `"${elogio}"`).join(" ")}
        </Text>
      ) : null}

      {/* autor */}
      <Text style={styles.author}>
        {item.autor} • {textoDeQuando(item.quando)}
      </Text>

      {/* estrelas */}
      {renderStars(item.nota)}
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
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Notas de agradecimentos</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {itens.map(renderCard)}
          {dados === null ? (
            <View style={styles.centralizado}>
              {erro ? (
                <Text style={styles.vazio}>{erro}</Text>
              ) : (
                <Carregando3D tamanho={36} cor="#FFB800" />
              )}
            </View>
          ) : itens.length === 0 ? (
            <Text style={styles.vazio}>
              Você ainda não recebeu notas de agradecimento.
            </Text>
          ) : null}
          {temMais ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={carregandoMais}
              onPress={carregarMais}
              style={styles.maisBotao}
            >
              <Text style={styles.maisTexto}>
                {carregandoMais ? "Carregando..." : "Carregar mais"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
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

  estrelaVazia: { color: "#DDD" },

  avatarInicial: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE9B8",
  },

  inicial: { fontSize: 18, fontWeight: "bold", color: "#B07A00" },

  centralizado: { paddingVertical: 60, alignItems: "center" },

  vazio: {
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    paddingVertical: 40,
  },

  maisBotao: {
    alignSelf: "center",
    marginVertical: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#ECECEE",
  },

  maisTexto: { fontSize: 14, fontWeight: "600", color: "#333" },
});
