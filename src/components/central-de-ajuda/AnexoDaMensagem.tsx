import { api } from "@/Services/api";
import type { AnexoDeAjuda } from "@/domain/ajuda";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LARGURA_MINIATURA = 200;

// as imagens do atendimento ficam num disco privado: o app busca com o token
// da sessão (o backend não aceita o token na URL)
export default function AnexoDaMensagem({ anexo }: { anexo: AnexoDeAjuda }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [token, setToken] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    let ativo = true;
    void SecureStore.getItemAsync("token").then((valor) => {
      if (ativo) setToken(valor);
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (token === null) return <View style={styles.carregando} />;

  // a imagem que o próprio app acabou de mandar ainda é o arquivo local
  const fonte = anexo.uri_local
    ? { uri: anexo.uri_local }
    : {
        uri: `${api.defaults.baseURL}${anexo.url}`,
        headers: { Authorization: `Bearer ${token}` },
      };
  // prints de celular são altos: a miniatura corta em 3:4 e o toque amplia
  const proporcao = Math.max(
    3 / 4,
    anexo.largura && anexo.altura ? anexo.largura / anexo.altura : 4 / 3,
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Imagem ${anexo.nome ?? ""}. Tocar para ampliar`}
        onPress={() => setAmpliada(true)}
      >
        <Image
          source={fonte}
          style={[styles.miniatura, { aspectRatio: proporcao }]}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Modal
        visible={ampliada}
        transparent
        animationType="fade"
        onRequestClose={() => setAmpliada(false)}
        statusBarTranslucent
      >
        <View style={styles.fundo}>
          <Image
            source={fonte}
            style={{ width, height: height * 0.8 }}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={[styles.fechar, { top: insets.top + 12 }]}
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem"
            onPress={() => setAmpliada(false)}
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  carregando: {
    width: LARGURA_MINIATURA,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  miniatura: {
    width: LARGURA_MINIATURA,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  fechar: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
