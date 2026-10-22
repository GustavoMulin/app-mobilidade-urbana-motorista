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
import AlterarEmail from "./AlterarEmail";
import AlterarNumero from "./AlterarNumero";
import AlterarSenha from "./AlterarSenha";
import DocumentosPendentes from "./DocumentosPendentes";
import GestaoDispositivos from "./GestaoDispositivos";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function MeuPefil({ visible, onClose, duration = 200 }: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showAlterarNumero, setShowAlterarNumero] = useState(false);
  const [showAlterarEmail, setShowAlterarEmail] = useState(false);
  const [showAlterarSenha, setShowAlterarSenha] = useState(false);
  const [showDocumentosPendentes, setShowDocumentosPendentes] = useState(false);
  const [showGestaoDispositivos, setShowGestaoDispositivos] = useState(false);

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

  const renderItem = (
    icon: any,
    title: string,
    subtitle?: string,
    onPress?: () => void,
  ) => (
    <TouchableOpacity onPress={onPress} style={styles.item}>
      <View style={styles.left}>
        <Ionicons name={icon} size={22} color="#333" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="black" />
    </TouchableOpacity>
  );

  return (
    <>
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
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-outline" size={26} color="#111" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Perfil</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* BODY */}
            <View style={styles.body}>
              {/* SEÇÃO */}
              <Text style={styles.sectionTitle}>Informações pessoais</Text>

              {/* PROFILE INFO */}
              <View style={styles.profileCard}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                    style={styles.avatar}
                  />
                  <TouchableOpacity style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.userName}>Diogo</Text>
                {/* <Text style={styles.userEmail}>diogo.dev@exemplo.com</Text>
              <Text style={styles.userPhone}>(69) 99999-9999</Text> */}
              </View>

              <View>
                {/* {renderItem("", "Foto de perfil", undefined, true)} */}
                {renderItem(
                  "call-outline",
                  "Número de telefone",
                  "+5569981400661",
                  () => setShowAlterarNumero(true),
                )}
                {renderItem(
                  "mail-outline",
                  "E-mail",
                  "diogoguimaraes.br@gmail.com",
                  () => setShowAlterarEmail(true),
                )}
                {renderItem("location-outline", "Cidade", "Porto Velho")}
                {renderItem("key-outline", "Senha", "", () =>
                  setShowAlterarSenha(true),
                )}

                {/* SEÇÃO */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  Gerenciamento de perfil
                </Text>

                {renderItem(
                  "document-text-outline",
                  "Documentos pendentes",
                  "",
                  () => setShowDocumentosPendentes(true),
                )}
                {renderItem(
                  "phone-portrait-outline",
                  "Gestão de dispositivo",
                  "",
                  () => setShowGestaoDispositivos(true),
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      <AlterarNumero
        visible={showAlterarNumero}
        onClose={() => setShowAlterarNumero(false)}
      />
      <AlterarEmail
        visible={showAlterarEmail}
        onClose={() => setShowAlterarEmail(false)}
      />
      <AlterarSenha
        visible={showAlterarSenha}
        onClose={() => setShowAlterarSenha(false)}
      />
      <DocumentosPendentes
        visible={showDocumentosPendentes}
        onClose={() => setShowDocumentosPendentes(false)}
      />
      <GestaoDispositivos
        visible={showGestaoDispositivos}
        onClose={() => setShowGestaoDispositivos(false)}
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
    backgroundColor: "#f7f7f7",
  },

  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e5e5",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  body: {
    flex: 1,
    padding: 16,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 20,
    color: "#111",
  },

  subtitle: {
    fontSize: 16,
    color: "#777",
    marginTop: 2,
  },

  // avatar: {
  //   width: 36,
  //   height: 36,
  //   borderRadius: 18,
  // },
  profileCard: {
    alignItems: "center",
    paddingVertical: 30,
    // backgroundColor: '#fff',
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#f0f0f0",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFD600",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
});
