import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
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

export default function DicasAvaliacao({
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
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  const dicas = [
    "O respeito entre todos é a parte mais importante da viagem. A melhor dica para seguir é: trate o outro como gostaria de ser tratado. Praticar atitudes positivas em cada atendimento é fazer a sua parte.",
    "Os passageiros costumam gostar quando perguntados sobre qual o seu caminho preferido, e também sobre qual a sua preferência entre os navegadores disponíveis (Waze, Google Maps, etc).",
    "Se quiser, é interessante dar opção para que o passageiro escolha a estação de rádio ou conecte seu celular para ser mais personalizado ainda.",
    "Celular é uma grande mania dos passageiros! Oferecer carregadores pode aumentar o nível de satisfação dos seus clientes.",
    "Os passageiros prezam muito pelo conforto e isso é muito importante para seu sucesso como motorista. É bem legal perguntar se a temperatura do ar-condicionado está agradável ou se ele tem alguma preferência.",
    "Muitos motoristas optam por disponibilizar balinhas e água, porque isso costuma deixar os passageiros muito felizes e satisfeitos. Isso os estimula e incentiva a andar mais com você, parceiro.",
    "Manter o carro limpinho e organizado são detalhes que influenciam em uma melhor avaliação.",
    "O celular também é sua ferramenta de trabalho. Ele é essencial para tomar as melhores decisões de rota, na comunicação e na busca de passageiro.",
  ];

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

            <Text style={styles.headerTitle}>
              Dicas de avaliação 5 estrelas
            </Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* TÍTULO */}
          <Text style={styles.mainTitle}>Dicas de motoristas 5 estrelas</Text>

          {/* SUBTEXTO */}
          <Text style={styles.subtitle}>
            Seguindo essas recomendações, você vai receber elogios sempre.
          </Text>

          {/* LISTA */}
          {dicas.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.bullet}>▶</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
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

  // HEADER
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
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  // BODY
  body: {
    flex: 1,
    padding: 16,
  },

  mainTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F57C00",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  bullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
    color: "#111",
  },

  itemText: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
});
