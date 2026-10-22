import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const DURACAO_CONTADOR_MS = 16 * 24 * 60 * 60 * 1000;

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function ConvidarMotorista({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  // 👇 controle do scroll
  const [scrollY] = useState(() => new Animated.Value(0));

  const [isMounted, setIsMounted] = useState(visible);

  const [timeLeft, setTimeLeft] = useState(DURACAO_CONTADOR_MS);

  useEffect(() => {
    const targetDate = Date.now() + DURACAO_CONTADOR_MS;
    const interval = setInterval(() => {
      const diff = targetDate - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

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

  // 👇 interpolação do background do header
  const headerBackground = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
    extrapolate: "clamp",
  });

  const renderRewardItem = (text: string, value: string) => (
    <TouchableOpacity style={styles.rewardItem} activeOpacity={0.7}>
      <View style={styles.rewardIconCircle}>
        <FontAwesome5 name="gift" size={20} color="#ffaa00" />
      </View>
      <View style={styles.rewardTextContainer}>
        <Text style={styles.rewardLabel}>{text}</Text>
        <Text style={styles.rewardValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* HEADER COM TRANSIÇÃO */}
        <Animated.View
          style={[
            styles.customHeader,
            {
              backgroundColor: headerBackground,
              paddingTop: Math.max(insets.top + 12, 50),
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.customHeaderTitle}>Convidar motoristas</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerRightText}>Mais recompensas</Text>
            <Ionicons name="caret-down" size={12} color="#333" />
          </View>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scrollContainer}
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        >
          {/* PLACEHOLDER DA IMAGEM SUPERIOR */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/bg-convidar-motorista.png")}
              style={styles.bannerImage}
            />
            <View style={styles.locationTag}>
              <Ionicons name="location-sharp" size={14} color="#666" />
              <Text style={styles.locationText}>Porto Velho</Text>
              <Ionicons name="caret-down" size={10} color="#666" />
            </View>
          </View>
          {/* CONTEÚDO BRANCO COM CURVA ACENTUADA */}
          <View style={styles.mainContentCard}>
            <Text style={styles.cardTitle}>
              Convide um novo motorista e ganhe até
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>R$</Text>
              <Text style={styles.price}>500</Text>
              <View style={styles.priceUnderline} />
            </View>

            <View style={styles.rewardsList}>
              {renderRewardItem(
                "Para cada novo motorista com veículo, você ganhará",
                "R$500",
              )}
              {renderRewardItem(
                "Para cada novo motorista sem veículo, você ganhará",
                "R$500",
              )}
            </View>

            <View style={styles.howItWorksContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.howItWorksTitle}>✨ Como funciona ✨</Text>
              </View>
              <View style={styles.stepsRow}>
                <View style={styles.stepItem}>
                  <View style={styles.stepIconBG}>
                    <Ionicons name="share-social" size={20} color="#ff6600" />
                  </View>
                  <Text style={styles.stepText}>Convide um amigo</Text>
                </View>
                <View style={styles.stepDivider} />
                <View style={styles.stepItem}>
                  <View style={styles.stepIconBG}>
                    <Ionicons name="person-add" size={20} color="#ff6600" />
                  </View>
                  <Text style={styles.stepText}>Amigo se cadastra</Text>
                </View>
                <View style={styles.stepDivider} />
                <View style={styles.stepItem}>
                  <View style={styles.stepIconBG}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#ff6600"
                    />
                  </View>
                  <Text style={styles.stepText}>Amigo finaliza corridas</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.rulesBtn}>
                <Text style={styles.rulesText}>Regras detalhadas</Text>
                <Ionicons name="chevron-forward" size={14} color="#666" />
              </TouchableOpacity>
            </View>

            {/* HISTÓRICO */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>
                🎁 Histórico de convites 🎁
              </Text>

              <Text style={styles.historyIcon}>🛸</Text>

              <Text style={styles.historyMainText}>
                Nenhum convite encontrado. Convide amigos para receber
                recompensas!
              </Text>

              <Text style={styles.historySubText}>
                Lembre-se: seus amigos precisam enviar os nomes completos para
                serem registrados!
              </Text>
            </View>
          </View>
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{days}</Text>
            </View>
            <Text style={styles.timerLabel}>dia(s)</Text>

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>
                {String(hours).padStart(2, "0")}
              </Text>
            </View>

            <Text style={styles.timerDivider}>:</Text>

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>
                {String(minutes).padStart(2, "0")}
              </Text>
            </View>

            <Text style={styles.timerDivider}>:</Text>

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>
                {String(seconds).padStart(2, "0")}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnConvidar}>
            <Text style={styles.btnConvidarText}>Convidar agora</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: "#fff7e6" },
  scrollContainer: { flex: 1 },
  customHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginLeft: -20,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  headerRightText: { fontSize: 13, color: "#333", marginRight: 2 },
  backButton: { padding: 4 },
  imageContainer: { height: 400, width: "100%", backgroundColor: "#fff7e6" },
  bannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  locationTag: {
    position: "absolute",
    bottom: 60,
    right: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    elevation: 3,
  },
  locationText: { fontSize: 12, fontWeight: "600", marginHorizontal: 4 },
  mainContentCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    marginTop: -40,
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 100,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#333",
    lineHeight: 28,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 20,
    marginBottom: 30,
  },
  currency: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffaa00",
    marginBottom: 8,
    marginRight: 2,
  },
  price: { fontSize: 58, fontWeight: "900", color: "#333" },
  priceUnderline: {
    position: "absolute",
    bottom: 5,
    width: 80,
    height: 6,
    backgroundColor: "#ffcc00",
    zIndex: -1,
  },
  rewardsList: {
    backgroundColor: "#fff9f2",
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  rewardIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  rewardTextContainer: { flex: 1, marginLeft: 15 },
  rewardLabel: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
    lineHeight: 20,
  },
  rewardValue: { fontSize: 18, fontWeight: "800", color: "#333", marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  howItWorksContainer: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  howItWorksTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepItem: { width: "28%", alignItems: "center" },
  stepIconBG: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff4eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepText: {
    fontSize: 11,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
  },
  stepDivider: {
    width: 30,
    height: 1,
    backgroundColor: "#eee",
    marginTop: -20,
  },
  rulesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  rulesText: { fontSize: 14, color: "#666", marginRight: 5 },

  historyCard: {
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: "#f2f2f2",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },

  historyIcon: { fontSize: 40, marginBottom: 15 },

  historyMainText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 10,
  },

  historySubText: {
    textAlign: "center",
    fontSize: 13,
    color: "#777",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  timerBox: {
    backgroundColor: "#fff9e6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timerText: { fontSize: 14, fontWeight: "700", color: "#333" },
  timerLabel: { fontSize: 11, color: "#666", marginHorizontal: 4 },
  timerDivider: { fontSize: 14, fontWeight: "700", marginHorizontal: 5 },
  btnConvidar: {
    backgroundColor: "#ffcc00",
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  btnConvidarText: { fontSize: 18, fontWeight: "800", color: "#333" },
});
