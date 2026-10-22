import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdicionarMetodoResgatePix from "@/components/AdicionarMetodoResgatePix";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import InformacoesMetodoResgateConta from "./InformacoesMetodoResgateConta";
import RegistroMetodoResgateConta from "./RegistroMetodoResgateConta";
import { carregarMetodosResgate, MetodoResgate } from "@/domain/carteira";
const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function MetodosResgate({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [visibleMetodoResgatePix, setVisibleAdicionarMetodoResgatePix] =
    useState(false);
  const [
    visibleInformacoesMetodoResgateConta,
    setVisibleInformaceosMetodoResgateConta,
  ] = useState(false);

  const [registrandoConta, setRegistrandoConta] = useState(false);
  const [metodos, setMetodos] = useState<MetodoResgate[]>([]);

  const recarregar = useCallback(() => {
    carregarMetodosResgate()
      .then(setMetodos)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (visible) recarregar();
  }, [visible, recarregar]);

  const pix = metodos.find((metodo) => metodo.tipo === "pix") ?? null;
  const conta = metodos.find((metodo) => metodo.tipo === "conta") ?? null;

  const mostrarAdicionarMetodoResgatePix = () => {
    setVisibleAdicionarMetodoResgatePix(true);
  };

  const mostrarAdicionarMetodoResgateConta = () => {
    if (conta) setVisibleInformaceosMetodoResgateConta(true);
    else setRegistrandoConta(true);
  };

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
      <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
        {/* Background escurecido */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.3)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        {/* Drawer deslizante */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {/* HEADER */}
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 50) },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Método de resgate</Text>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <Text style={styles.mainTitle}>Método de resgate</Text>

            {/* ITEM: CHAVE PIX */}
            <TouchableOpacity
              onPress={mostrarAdicionarMetodoResgatePix}
              style={styles.methodItem}
            >
              <View style={styles.leftContent}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#1DB963" }]}
                >
                  <MaterialCommunityIcons
                    name="rhombus-split"
                    size={22}
                    color="#FFF"
                  />
                </View>
                <View style={styles.methodTextos}>
                  <Text style={styles.methodLabel}>Chave Pix</Text>
                  {pix && (
                    <Text style={styles.methodDetalhe} numberOfLines={1}>
                      {pix.descricao.replace(/^Pix · /, "")}
                      {pix.principal ? " · principal" : ""}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.rightContent}>
                <Text style={styles.actionText}>
                  {pix ? "Editar" : "Adicionar"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </View>
            </TouchableOpacity>

            {/* ITEM: CONTA BANCÁRIA */}
            <TouchableOpacity
              onPress={mostrarAdicionarMetodoResgateConta}
              style={styles.methodItem}
            >
              <View style={styles.leftContent}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#FF6600" }]}
                >
                  <Ionicons name="home" size={20} color="#FFF" />
                </View>
                <View style={styles.methodTextos}>
                  <Text style={styles.methodLabel}>Conta bancária</Text>
                  {conta && (
                    <Text style={styles.methodDetalhe} numberOfLines={1}>
                      {conta.descricao}
                      {conta.principal ? " · principal" : ""}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.rightContent}>
                <Text style={styles.actionText}>
                  {conta ? "Ver" : "Adicionar"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <AdicionarMetodoResgatePix
        visible={visibleMetodoResgatePix}
        existente={pix}
        onSalvo={recarregar}
        onClose={() => {
          setVisibleAdicionarMetodoResgatePix(false);
          recarregar();
        }}
      />
      <InformacoesMetodoResgateConta
        visible={visibleInformacoesMetodoResgateConta}
        conta={conta}
        onSalvo={recarregar}
        onClose={() => setVisibleInformaceosMetodoResgateConta(false)}
      />
      <RegistroMetodoResgateConta
        visible={registrandoConta}
        existente={null}
        onSalvo={() => {
          setRegistrandoConta(false);
          recarregar();
        }}
        onClose={() => setRegistrandoConta(false)}
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
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backBtn: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#000",
    marginTop: 10,
    marginBottom: 40,
  },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    borderBottomWidth: 0, // A imagem não mostra bordas visíveis, apenas espaçamento
  },
  leftContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  methodTextos: {
    flexShrink: 1,
  },
  methodDetalhe: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  methodLabel: {
    fontSize: 17,
    fontWeight: "500",
    color: "#111",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#333",
    marginRight: 8,
  },
});
