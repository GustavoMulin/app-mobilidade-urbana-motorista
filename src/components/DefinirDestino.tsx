import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

// 👉 DEFINIÇÃO DA INTERFACE PARA O ITEM DE ENDEREÇO
interface AddressItem {
  id: string;
  address: string;
  cityState: string;
  icon: string; // 👈 novo campo
  iconColor: string; // 👈 novo campo
}

// 👉 Dados dos destinos direcionados
const data: AddressItem[] = [
  // 👈 Tipando a lista de dados
  {
    id: "1",
    address: "Av. Paulista, 1000",
    cityState: "São Paulo, SP",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "2",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "3",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "4",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "5",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "6",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "7",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "8",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "9",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "10",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
  {
    id: "11",
    address: "Rua das Flores, 45",
    cityState: "Curitiba, PR",
    icon: "time-outline",
    iconColor: "#888",
  },
];

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function DefinirDestino({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  // Lógica para o botão de Configurações
  const entradaInput = () => {
    console.log("entradaInput");
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
          // 👉 abre da direita para a esquerda
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
          // 👉 fecha voltando para a direita
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
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  // 👉 Componente de renderização para cada item da lista de endereços
  // 👈 Tipagem corrigida com ListRenderItem<AddressItem>
  const renderItem: ListRenderItem<AddressItem> = ({ item, index }) => (
    <TouchableOpacity style={[styles.addressItem]}>
      {/* Ícone dinâmico */}
      <Ionicons
        name={item.icon as any}
        size={24}
        color={item.iconColor}
        style={styles.addressIcon}
      />
      {/* O addressContent agora contém a borda para que ela não inclua o ícone */}
      <View
        style={[
          styles.addressContent,
          // Aplica a borda condicionalmente
          index !== data.length - 1 && styles.addressContentSeparator,
        ]}
      >
        <Text style={styles.addressLine1}>{item.address}</Text>
        <Text style={styles.addressLine2}>{item.cityState}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      {/* Fundo escurecido */}
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
          },
        ]}
      >
        {/* HEADER */}
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Definir destino</Text>
            <View style={{ width: 26 }} />
          </View>
        </View>

        {/* Primeiro botão: Definir meu destino */}
        <View className="mt-3" style={styles.cardButton}>
          <View style={styles.cardLeft}>
            <Ionicons
              name="navigate-circle-outline"
              size={22}
              color="#111"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Por favor, ensira o endereço"
              placeholderTextColor="#444"
              onChangeText={entradaInput}
            />
          </View>

          {/* Ícone de seta à direita */}
          <TouchableOpacity>
            <Ionicons name="close-outline" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>

        <View className="mt-3" style={styles.cardButton}>
          <View style={styles.cardLeft}>
            <Ionicons
              name="home-outline"
              size={22}
              color="orange"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Por favor, ensira o endereço residencial"
              placeholderTextColor="#444"
              onChangeText={entradaInput}
            />
          </View>

          {/* Ícone de seta à direita */}
          <TouchableOpacity>
            <Ionicons name="create-outline" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View>
            {data.length > 0 && (
              <View style={styles.addressListContainer}>
                {/* Título 'Destinos direcionados' */}
                <Text style={styles.addressListTitle}>Definidos</Text>

                {/* Lista de endereços usando FlatList */}
                <FlatList
                  data={data}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={true} // A lista é curta, não precisa de rolagem interna
                />
              </View>
            )}
          </View>
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
    backgroundColor: "#f7f7f7", // corpo do drawer
  },

  // HEADER
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e5e5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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

  // BODY
  body: {
    flex: 1,
    padding: 16,
  },

  cardGroup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // 👉 Título fora dos cards
  outerSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 4,
    marginBottom: 6,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 16,
    marginTop: 4,
  },

  // CARD BUTTON
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 16,
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  cardText: {
    fontSize: 15,
    color: "#111",
  },

  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
    marginRight: 6,
  },

  // 👉 ESTILOS PARA A LISTA DE ENDEREÇOS
  addressListContainer: {
    paddingVertical: 10,
  },
  addressListTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginLeft: 16,
    marginBottom: 4,
    marginTop: 8,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addressIcon: {
    marginRight: 10,
    marginTop: 4,
  },
  addressContent: {
    flex: 1,
  },
  addressContentSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 12,
    paddingRight: 16,
    paddingTop: 12,
    marginTop: -12, // Compensa o padding superior adicionado em addressItem para manter o alinhamento
    marginBottom: -12, // Compensa o padding inferior adicionado em addressItem para manter o alinhamento
  },
  addressLine1: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111",
    marginBottom: 2,
  },
  addressLine2: {
    fontSize: 14,
    color: "#888",
  },
  // FIM DOS ESTILOS DA LISTA DE ENDEREÇOS

  // FOOTER - BOTÃO DESCONECTAR
  footer: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.4,
    borderTopColor: "#ddd",
    paddingBottom: 30,
  },
  botaoDesconectar: {
    borderWidth: 1.5,
    borderColor: "#111",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  textoDesconectar: {
    color: "#111",
    fontSize: 30,
    fontWeight: "600",
    textAlign: "center",
  },
});
