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

export default function VerificacoesUsuario({
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

  const data = [
    {
      title: "Verificação de Antecedentes",
      description:
        "A 99 verifica os antecedentes dos motoristas antes de aceitar seu cadastro na plataforma",
      icon: "person-outline",
    },
    {
      title: "CNH verificada",
      description:
        "Todo motorista deve enviar foto de sua carteira de habilitação para se cadastrar na 99",
      icon: "card-outline",
    },
    {
      title: "CRLV verificado",
      description:
        "O motorista enviou foto dos documentos do veículo para cadastrá-lo na plataforma",
      icon: "car-outline",
    },
    {
      title: "Foto com a CNH",
      description:
        "A 99 verifica que a foto da carteira de habilitação confere com o rosto do motorista",
      icon: "camera-outline",
    },
    {
      title: "Foto de perfil",
      description: "Todo motorista deve ter uma foto de perfil atualizada",
      icon: "image-outline",
    },
    {
      title: "Reconhecimento Facial",
      description:
        "O motorista passou por reconhecimento facial para confirmar sua identidade",
      icon: "scan-outline",
    },
  ];

  const renderItem = (item: any, index: number) => (
    <View key={index} style={styles.item}>
      {/* Ícone com check */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={22} color="#555" />
        </View>

        {/* CHECK AJUSTADO */}
        <View style={styles.check}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      </View>

      {/* Conteúdo */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
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

            <Text style={styles.headerTitle}>Verificações</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {data.map(renderItem)}
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

  item: {
    flexDirection: "row",
    marginBottom: 20,
  },

  iconWrapper: {
    width: 48,
    height: 48,
    marginRight: 12,
    position: "relative",
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },

  check: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2F80ED",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  description: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
  },
});
