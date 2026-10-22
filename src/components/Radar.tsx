import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
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

// ==========================================================
// 🚀 Novo Componente: SearchingIndicator (Efeito Pulsante)
// ==========================================================
const SearchingIndicator = () => {
  const [pulseAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Função para iniciar a animação de pulso
    const startPulse = () => {
      pulseAnim.setValue(0); // Reinicia o valor
      Animated.timing(pulseAnim, {
        toValue: 1, // Vai de 0 a 1
        duration: 2000, // Duração da expansão
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // Necessário para animações de `width`/`height` ou `scale` no Android/Web, mas usaremos `scale` e `opacity`
      }).start(() => startPulse()); // Repete a animação
    };

    startPulse(); // Inicia o loop da animação

    // Limpa a animação ao desmontar
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  // Interpolação para o efeito de pulsação
  // 1. scale: Aumenta de 0.5 até 2.5
  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });

  // 2. opacity: Diminui de 1 até 0
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  return (
    <View style={searchingStyles.container}>
      {/* Círculo pulsante animado */}
      <Animated.View
        style={[
          searchingStyles.pulseCircle,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      {/* Texto e ícone fixos no centro */}
      <View style={searchingStyles.content}>
        <Ionicons name="location-outline" size={30} color="#fff" />
        <Text style={searchingStyles.text}>Buscando</Text>
      </View>
    </View>
  );
};

// Estilos específicos para o SearchingIndicator
const searchingStyles = StyleSheet.create({
  container: {
    // 📐 Ocupa o espaço entre o header e o footer (se houver)
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // 🎨 Cor de fundo para o efeito de pulsação (igual ao do vídeo)
    backgroundColor: "#FF5F00", // Laranja/Amarelo forte
    marginHorizontal: -16, // Neutraliza o padding lateral do drawer
    marginTop: -16, // Neutraliza o padding superior do drawer
    marginBottom: 16, // Adiciona margem abaixo
    paddingVertical: 40,
  },
  pulseCircle: {
    position: "absolute",
    width: 100, // Tamanho base do círculo
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Cor clara para o pulso
  },
  content: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
});
// ==========================================================
// 🛑 Fim do Componente: SearchingIndicator
// ==========================================================

export default function DestinationDrawer({
  visible,
  onClose,
  duration = 300,
}: props) {
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  // ✅ Estado interno para controlar a presença na tela
  const [isMounted, setIsMounted] = useState(visible);

  // ✅ Detecta botão "voltar" do Android
  useEffect(() => {
    const onBackPress = () => {
      if (visible) {
        onClose();
        return true; // impede o comportamento padrão (sair do app)
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [visible, onClose]);

  // ✅ Animações de abertura e fechamento
  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0); // garante que o componente está montado
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
      // Fecha o drawer
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
      ]).start(({ finished }) => {
        if (finished) {
          // Espera a animação terminar antes de desmontar
          setIsMounted(false);
        }
      });
    }
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      {/* Fundo escuro clicável */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* Drawer deslizante */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            zIndex: 31, // zIndex maior que o overlay
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back-outline" size={28} color="#111" />
          </TouchableOpacity>
          <View>
            <Text>Solicitações</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* 💡 Componente de Busca Pulsante Adicionado Aqui */}
        <SearchingIndicator />

        {/* Conteúdo adicional (opções de corrida, etc.) viria aqui */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Toque para selecionar uma</Text>
          <Text style={styles.subtitle}>
            1 corrida(s) nas opções de corridas
          </Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Nova</Text>
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
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 16,
  },
  // 💡 Estilos adicionados para o restante do conteúdo
  contentContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    marginHorizontal: -16, // Extende a largura de volta
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF", // Cor de destaque para o botão
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
