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
import ListaSelecaoCorrida from "./ListaSelecaoCorrida";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function DescricaoProblema({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showListaSelecaoCorrida, setShowListaSelecaoCorrida] =
    useState(visible);

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

  return (
    <>
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
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 50) },
            ]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="chevron-back" size={26} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Descrição do problema</Text>
              <View style={{ width: 26 }} />
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Text style={styles.mainTitle}>
                Valor da corrida diferente do esperado
              </Text>

              <Text style={styles.subTitle}>
                Valor da corrida diferente do esperado
              </Text>

              <Text style={styles.descriptionText}>
                <Text style={styles.boldText}>
                  Trânsito, desvios pequenos de rota ou paradas solicitadas fora
                  do aplicativo não alteram o valor da corrida.
                </Text>
              </Text>

              <Text style={styles.descriptionText}>
                Na maioria das corridas,{" "}
                <Text style={styles.boldText}>
                  o valor é definido no início da viagem
                </Text>
                , com base na distância e no tempo estimados, além das{" "}
                <Text style={styles.boldText}>
                  condições de trânsito e demanda no momento da solicitação.
                </Text>
              </Text>

              <Text style={styles.descriptionText}>
                O valor da corrida só é ajustado quando a{" "}
                <Text style={styles.boldText}>
                  mudança é registrada no aplicativo
                </Text>
                , por exemplo:{"\n"}O passageiro altera o destino no aplicativo
                {"\n"}O passageiro adiciona uma parada no aplicativo{"\n"}
                Há mudanças relevantes registradas na viagem
              </Text>

              <Text style={styles.descriptionText}>
                Se o passageiro pedir uma parada extra ou mudança de destino
                durante a viagem,{" "}
                <Text style={styles.boldText}>
                  peça para que ele faça a alteração diretamente no aplicativo.
                </Text>{" "}
                Assim, o valor da corrida será recalculado automaticamente.
              </Text>

              <View style={styles.section}>
                <Text style={[styles.boldText, styles.sectionTitle]}>
                  Corridas com preço variável (Táxi):
                </Text>
                <Text style={styles.descriptionText}>
                  Nas corridas de Táxi, o valor pode variar porque é calculado
                  com base nas condições reais da viagem, como tempo e distância
                  percorridos.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.boldText, styles.sectionTitle]}>
                  Como verificar os detalhes da corrida:
                </Text>
                <Text style={styles.descriptionText}>
                  Para ver o cálculo da tarifa, acesse Ganhos {">"} Histórico de
                  viagens e selecione a corrida desejada.
                </Text>
              </View>

              <Text style={styles.footerText}>
                Se depois de verificar essas informações você ainda acreditar
                que houve algum erro no valor da corrida, toque no botão abaixo
                para solicitar uma análise.
              </Text>

              {/* FEEDBACK SECTION */}
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>
                  Esse conteúdo te ajudou?
                </Text>
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity style={styles.feedbackButton}>
                    <Text style={styles.feedbackEmoji}>☹️</Text>
                    <Text style={styles.feedbackButtonText}>Não</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedbackButton}>
                    <Text style={styles.feedbackEmoji}>😊</Text>
                    <Text style={styles.feedbackButtonText}>Sim</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* FIXED FOOTER BUTTON */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => setShowListaSelecaoCorrida(true)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Preciso de ajuda</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <ListaSelecaoCorrida
        visible={showListaSelecaoCorrida}
        onClose={() => setShowListaSelecaoCorrida(false)}
      />
    </>
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
    paddingTop: 50,
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#333",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 5,
  },
  footerText: {
    fontSize: 14,
    color: "#888",
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  feedbackContainer: {
    alignItems: "center",
    marginTop: 10,
    // borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 30,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 15,
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 30,
  },
  feedbackEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  actionButton: {
    backgroundColor: "#ffdd00",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
});
