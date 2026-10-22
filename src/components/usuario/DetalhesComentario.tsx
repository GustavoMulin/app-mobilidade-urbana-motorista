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

interface ComentarioSelecionado {
  id: string;
  avatar: string;
  autor: string;
  comentario: string;
  tempo: string;
}

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
  data: ComentarioSelecionado | null;
}

export default function NotasAgradecimento({
  visible,
  onClose,
  duration = 200,
  data,
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

  if (!isMounted || !data) return null;

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
            <Text style={styles.headerTitle}>Comentário</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* TOP ROW: Quote and Avatar */}
            <View style={styles.cardTopRow}>
              <Text style={styles.quote}>“</Text>
              <Image source={{ uri: data.avatar }} style={styles.avatar} />
            </View>

            {/* CONTENT */}
            <Text style={styles.text}>{data.comentario}</Text>

            <Text style={styles.tags}>
              {'"Pontual" "Educado" "Bom condutor" "Sabe o caminho"'}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.author}>
                {data.autor} • {data.tempo}
              </Text>
              {renderStars()}
            </View>
          </View>
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
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    // Shadow iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Shadow Android
    elevation: 3,
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
    padding: 20,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  quote: {
    fontSize: 80,
    color: "#E8E8E8",
    lineHeight: 80,
    marginTop: -10, // Ajuste para alinhar o topo da aspa
    fontWeight: "bold",
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#eee",
  },
  text: {
    fontSize: 18,
    color: "#333",
    lineHeight: 24,
    marginBottom: 20,
  },
  tags: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 25,
  },
  footer: {
    marginTop: 10,
  },
  author: {
    fontSize: 15,
    color: "#888",
    marginBottom: 4,
  },
  stars: {
    flexDirection: "row",
  },
  star: {
    color: "#FFD600",
    marginRight: 2,
    fontSize: 18,
  },
});
