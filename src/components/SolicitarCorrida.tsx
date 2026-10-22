import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, TextInput } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface DestinationDrawerProps {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function DestinationDrawer({
  visible,
  onClose,
  duration = 300,
}: DestinationDrawerProps) {
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

          <View style={styles.userPillInline}>
            <Ionicons name="person-circle-outline" size={26} color="#666" />
            <Text style={styles.userName}>Diogo</Text>
            <Ionicons
              name="chevron-down-outline"
              size={18}
              color="#666"
              style={styles.userChevron}
            />
          </View>

          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.headerTitleCentered}>Para onde vamos?</Text>

        {/* Inputs */}
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={20} color="#444" />
          <TextInput
            style={styles.input}
            placeholder="Digite o local de partida"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="flag-outline" size={20} color="#444" />
          <TextInput
            style={styles.input}
            placeholder="Digite o destino"
            placeholderTextColor="#999"
          />
        </View>

        {/* Botões rápidos */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickButton}>
            <Ionicons name="home-outline" size={20} color="#444" />
            <Text style={styles.quickText}>Casa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton}>
            <Ionicons name="briefcase-outline" size={20} color="#444" />
            <Text style={styles.quickText}>Trabalho</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton}>
            <Ionicons name="star-outline" size={20} color="#444" />
            <Text style={styles.quickText}>Favoritos</Text>
          </TouchableOpacity>
        </View>

        {/* Lista */}
        <View style={styles.list}>
          <TouchableOpacity style={styles.listItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.listText}>Destino recente 1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.listText}>Destino recente 2</Text>
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
  headerTitleCentered: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f3f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  input: {
    marginLeft: 8,
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f3f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickText: {
    marginLeft: 6,
    fontSize: 15,
    color: "#111",
  },
  list: {
    marginTop: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },
  userPillInline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  userName: {
    fontSize: 15,
    color: "#111",
    fontWeight: "500",
    marginLeft: 6,
  },
  userChevron: {
    marginLeft: 6,
  },
});
