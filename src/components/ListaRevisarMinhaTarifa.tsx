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
import DescricaoProblema from "./central-de-ajuda/DescricaoProblema";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function RevisarTarifa({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showDescricaoProblema, setShowDescricaoProblema] = useState(false);

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

  const renderOption = (title: string, onPress?: () => void) => (
    <TouchableOpacity
      style={styles.topicItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* O flex: 1 aqui garante que o texto não empurre o ícone para fora */}
      <View style={styles.topicTextContainer}>
        <Text style={styles.topicText}>{title}</Text>
      </View>
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.3)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 50) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Revisar tarifa</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <View style={styles.topicsList}>
              {renderOption("Viagem em dinheiro não paga pelo passageiro", () =>
                setShowDescricaoProblema(true),
              )}
              {renderOption("Valor da corrida diferente do esperado", () =>
                console.log("Valor da corrida"),
              )}
              {renderOption("Viagem no cartão sem pagamento na carteira")}
              {renderOption(
                "Viagem com cartão ainda em processamento na carteira",
              )}
              {renderOption("Tive problemas com o pagamento de pedágio")}
              {renderOption("Taxa de espera")}
              {renderOption("Cancelamentos")}
              {renderOption("Trocos e reembolsos")}
              {renderOption("Transferência de pagamento")}
              {renderOption("Incentivos e parceiros")}
              {renderOption(
                "Não recebi a recompensa de indicação de motorista",
              )}
              {renderOption(
                "Não recebi a recompensa de indicação de motorista",
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
      <DescricaoProblema
        visible={showDescricaoProblema}
        onClose={() => setShowDescricaoProblema(false)}
      />
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
    backgroundColor: "#fff", // Fundo branco total como na imagem
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0", // Borda mais suave
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
  },
  body: {
    flex: 1,
    paddingTop: 8, // Ajuste leve para o início da lista
  },
  topicsList: {
    backgroundColor: "#fff",
    // Removido borderRadius e shadows para ficar flat como na imagem
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8", // Linha divisória bem sutil
  },
  topicTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  topicText: {
    fontSize: 16, // Aumentado levemente para legibilidade
    color: "#333",
    fontWeight: "400", // Menos negrito, seguindo o padrão da imagem
    lineHeight: 22,
  },
  chevronContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
