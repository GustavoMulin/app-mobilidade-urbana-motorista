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

export default function RequisitoEnvioDocumentoFisico({
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

            <Text style={styles.headerTitle}>Veículo</Text>

            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* BODY */}
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* IMAGEM */}
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
            }}
            style={styles.mainImage}
            resizeMode="contain"
          />

          {/* REQUISITOS */}
          <Text style={styles.sectionTitle}>Requisitos de envio</Text>

          <Text style={styles.text}>
            1. O documento do carro deve estar dentro do prazo de validade.
          </Text>

          <Text style={styles.text}>
            2. Nos envie somente a primeira página do documento. Mas lembre-se
            de que os dados precisam estar legíveis.
          </Text>

          {/* COMO OBTER */}
          <Text style={styles.sectionTitle}>Como obter os documentos</Text>

          <Text style={styles.text}>
            Atualmente, devido a pandemia, os órgãos emissores não estão
            realizando a emissão do documento físico. Para mais informações,
            orientamos que procure o Denatran.
          </Text>

          <Text style={styles.text}>
            Para obter o CRLV digital, selecione essa opção no nosso app.
          </Text>

          <Text style={styles.link}>Clique aqui para acessar o site</Text>

          {/* ERROS */}
          <Text style={styles.sectionTitle}>Erros comuns a serem evitados</Text>

          <View style={styles.grid}>
            {[
              "Documento desfocado",
              "Documento cortado",
              "Documento errado",
              "Documento do carro vencido",
            ].map((item, index) => (
              <View key={index} style={styles.gridItem}>
                <View style={styles.imagePlaceholder} />

                <View style={styles.errorRow}>
                  <Ionicons name="close-circle" size={16} color="#E53935" />
                  <Text style={styles.errorText}>{item}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* BOTÃO FIXO */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Envie a foto</Text>
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
    backgroundColor: "#f5f5f5",
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

  mainImage: {
    width: "100%",
    height: 220,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
    marginTop: 10,
  },

  text: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },

  link: {
    color: "#1E88E5",
    fontSize: 14,
    marginBottom: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  gridItem: {
    width: "48%",
    marginBottom: 16,
  },

  imagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#ddd",
    borderRadius: 8,
    marginBottom: 6,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  errorText: {
    color: "#E53935",
    fontSize: 12,
    marginLeft: 4,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 0.6,
    borderTopColor: "#eee",
  },

  button: {
    backgroundColor: "#FFD400",
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
});
