import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { api, mensagemDaApi } from "@/Services/api";
import { Text } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { formatarTelefone } from "@/domain/perfilMotorista";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AlterarContato from "./AlterarContato";
import AlterarSenha from "./AlterarSenha";
import DocumentosPendentes from "./DocumentosPendentes";
import EscolherCidade from "./EscolherCidade";
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
  const { user, atualizarUsuario } = useAuth();
  // o contato que está sendo trocado (a tela fica montada para animar a saída)
  const [contato, setContato] = useState<"telefone" | "email">("telefone");
  const [showAlterarContato, setShowAlterarContato] = useState(false);
  const [showEscolherCidade, setShowEscolherCidade] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
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

  const abrirContato = (campo: "telefone" | "email") => {
    setContato(campo);
    setShowAlterarContato(true);
  };

  const enviarFoto = async (camera: boolean) => {
    if (!user) return;
    try {
      const permissao = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert(
          camera ? "Acesso à câmera" : "Acesso às fotos",
          "Permita o acesso nas configurações do aparelho para trocar a foto.",
          [
            { text: "Agora não", style: "cancel" },
            {
              text: "Abrir configurações",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
        return;
      }
      const opcoes: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };
      const resultado = camera
        ? await ImagePicker.launchCameraAsync({
            ...opcoes,
            cameraType: ImagePicker.CameraType.front,
          })
        : await ImagePicker.launchImageLibraryAsync(opcoes);
      const foto = resultado.canceled ? null : resultado.assets[0];
      if (!foto) return;

      setEnviandoFoto(true);
      const formulario = new FormData();
      formulario.append("image", {
        uri: foto.uri,
        name: foto.fileName || "foto.jpg",
        type: foto.mimeType || "image/jpeg",
      } as any);
      const { data } = await api.put(
        `/usuario-alterar-foto-perfil/${user.id}`,
        formulario,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      await atualizarUsuario({ foto: data.user.foto });
    } catch (error) {
      Alert.alert(
        "Foto de perfil",
        mensagemDaApi(error, "Não foi possível trocar a foto. Tente de novo."),
      );
    } finally {
      setEnviandoFoto(false);
    }
  };

  const trocarFoto = () =>
    Alert.alert(
      "Foto de perfil",
      "Uma foto real sua ajuda o passageiro a reconhecer você no embarque.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Galeria", onPress: () => void enviarFoto(false) },
        { text: "Tirar foto", onPress: () => void enviarFoto(true) },
      ],
    );

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
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  onPress={trocarFoto}
                  disabled={enviandoFoto}
                  accessibilityRole="button"
                  accessibilityLabel="Trocar foto de perfil"
                >
                  {user?.foto ? (
                    <Image source={{ uri: user.foto }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.semFoto]}>
                      <Ionicons name="person" size={48} color="#BDBDBD" />
                    </View>
                  )}
                  {enviandoFoto && (
                    <View style={[styles.avatar, styles.enviandoFoto]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.userName}>
                  {user?.name?.split(" ")[0]}
                </Text>
              </View>

              <View>
                {renderItem(
                  "call-outline",
                  "Número de telefone",
                  user?.telefone ? formatarTelefone(user.telefone) : "Adicionar",
                  () => abrirContato("telefone"),
                )}
                {renderItem("mail-outline", "E-mail", user?.email ?? "", () =>
                  abrirContato("email"),
                )}
                {renderItem(
                  "location-outline",
                  "Cidade",
                  // o mesmo nome existe em mais de um estado ("Bom Jesus")
                  user?.cidade
                    ? `${user.cidade.nome} - ${user.cidade.uf}`
                    : "Escolher cidade",
                  () => setShowEscolherCidade(true),
                )}
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
      <AlterarContato
        visible={showAlterarContato}
        campo={contato}
        onClose={() => setShowAlterarContato(false)}
      />
      <EscolherCidade
        visible={showEscolherCidade}
        onClose={() => setShowEscolherCidade(false)}
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
  semFoto: {
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  enviandoFoto: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
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
