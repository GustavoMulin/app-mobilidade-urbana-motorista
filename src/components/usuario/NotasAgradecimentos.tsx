import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
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

  const renderStars = () => {
    return (
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Text key={i} style={styles.star}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  const renderCard = (item: any, index: number) => (
    <View key={index} style={styles.card}>
      {/* aspas */}
      <Text style={styles.quote}>“</Text>

      {/* avatar */}
      <Image source={{ uri: item.avatar }} style={styles.avatar} />

      {/* texto */}
      <Text style={styles.text}>{item.text}</Text>

      {/* tags */}
      <Text style={styles.tags}>{item.tags}</Text>

      {/* autor */}
      <Text style={styles.author}>
        {item.name} • {item.time}
      </Text>

      {/* estrelas */}
      {renderStars()}
    </View>
  );

  const data = [
    {
      text: "Muito boa a corrida ao som de Bon Jovi, Bryan Adams... O excelente gosto musical do motorista tornou a viagem agradável. Parabéns!",
      tags: `"Pontual" "Educado" "Bom condutor" "Sabe o caminho"`,
      name: "Amanda",
      time: "1 mês atrás",
      avatar: "https://i.pravatar.cc/100?img=5",
    },
    {
      text: "excelente condutor",
      tags: `"Simpático" "Pontual" "Educado" "Veículo limpo" "Bom condutor" "Sabe o caminho" "Usou o cinto"`,
      name: "deivison",
      time: "5 meses atrás",
      avatar: "https://i.pravatar.cc/100?img=8",
    },
    {
      text: "excelente condutor",
      tags: `"Simpático" "Pontual" "Educado" "Veículo limpo" "Bom condutor" "Sabe o caminho" "Usou o cinto"`,
      name: "deivison",
      time: "5 meses atrás",
      avatar: "https://i.pravatar.cc/100?img=8",
    },
    {
      text: "excelente condutor",
      tags: `"Simpático" "Pontual" "Educado" "Veículo limpo" "Bom condutor" "Sabe o caminho" "Usou o cinto"`,
      name: "deivison",
      time: "5 meses atrás",
      avatar: "https://i.pravatar.cc/100?img=8",
    },
    {
      text: "excelente condutor",
      tags: `"Simpático" "Pontual" "Educado" "Veículo limpo" "Bom condutor" "Sabe o caminho" "Usou o cinto"`,
      name: "deivison",
      time: "5 meses atrás",
      avatar: "https://i.pravatar.cc/100?img=8",
    },
    {
      text: "excelente condutor",
      tags: `"Simpático" "Pontual" "Educado" "Veículo limpo" "Bom condutor" "Sabe o caminho" "Usou o cinto"`,
      name: "deivison",
      time: "5 meses atrás",
      avatar: "https://i.pravatar.cc/100?img=8",
    },
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

            <Text style={styles.headerTitle}>Notas de agradecimentos</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {data.map(renderCard)}
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
});
