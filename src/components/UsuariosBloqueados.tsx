import { useEstilos, useTema } from "@/theme/tema";
import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { Text } from "@/components/common/Texto";
import { useToast } from "@/context/ToastContext";
import { textoDoBloqueio, type UsuarioBloqueado } from "@/domain/avaliacao";
import { api } from "@/Services/api";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

interface Pagina {
  data: UsuarioBloqueado[];
  current_page: number;
  last_page: number;
}

/** Passageiros que o motorista bloqueou, com o contexto da avaliação dele. */
export default function UsuariosBloqueados({
  visible,
  onClose,
  duration = 200,
}: Props) {
  const { cores } = useTema();
  const styles = useEstilos(estilosBase);
  const insets = useSafeAreaInsets();
  const { mostrarToast } = useToast();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [itens, setItens] = useState<UsuarioBloqueado[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultima, setUltima] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [removendo, setRemovendo] = useState<number | null>(null);

  const carregar = useCallback(
    async (alvo: number) => {
      setCarregando(true);

      try {
        const { data } = await api.get<Pagina>("/bloqueios-usuarios", {
          params: { perfil: "motorista", page: alvo },
        });
        setItens((atuais) =>
          alvo === 1 ? data.data : [...atuais, ...data.data],
        );
        setPagina(data.current_page);
        setUltima(data.last_page);
      } catch {
        mostrarToast({
          tipo: "error",
          titulo: "Não foi possível carregar",
          mensagem: "Confira sua conexão e tente de novo.",
        });
      } finally {
        setCarregando(false);
      }
    },
    [mostrarToast],
  );

  useEffect(() => {
    if (visible) void carregar(1);
  }, [visible, carregar]);

  const desbloquear = async (item: UsuarioBloqueado) => {
    setRemovendo(item.id);

    try {
      await api.delete(`/bloqueios-usuarios/${item.id}`, {
        params: { perfil: "motorista" },
      });
      setItens((atuais) => atuais.filter((outro) => outro.id !== item.id));
      mostrarToast({
        tipo: "success",
        titulo: "Passageiro desbloqueado",
        mensagem: `${item.nome} pode voltar a chamar você.`,
      });
    } catch {
      mostrarToast({
        tipo: "error",
        titulo: "Não foi possível desbloquear",
        mensagem: "Tente de novo em instantes.",
      });
    } finally {
      setRemovendo(null);
    }
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
  }, [visible, translateX, overlayOpacity, duration]);

  if (!isMounted) return null;

  const renderItem = ({ item }: { item: UsuarioBloqueado }) => (
    <View style={styles.item}>
      <View style={styles.linhaTopo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetra}>
            {item.nome.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.textos}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={styles.data}>{textoDoBloqueio(item.bloqueado_em)}</Text>
        </View>
        <TouchableOpacity
          style={styles.botaoDesbloquear}
          disabled={removendo === item.id}
          onPress={() => void desbloquear(item)}
        >
          <Text style={styles.textoDesbloquear}>
            {removendo === item.id ? "..." : "Desbloquear"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* o que o motorista deu a esse passageiro na corrida do bloqueio */}
      {item.nota !== null && (
        <View style={styles.estrelas}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= (item.nota ?? 0) ? "star" : "star-outline"}
              size={16}
              color={n <= (item.nota ?? 0) ? "#fbc02d" : "#BBB"}
            />
          ))}
        </View>
      )}
      {item.selos.length > 0 && (
        <View style={styles.selos}>
          {item.selos.map((selo) => (
            <View key={selo.titulo} style={styles.selo}>
              <IconeDoSelo
                imagem={selo.imagem}
                icone={selo.icone}
                tamanho={20}
              />
              <Text style={styles.seloTitulo}>{selo.titulo}</Text>
            </View>
          ))}
        </View>
      )}
      {item.comentario ? (
        <Text style={styles.comentario}>{item.comentario}</Text>
      ) : null}
    </View>
  );

  return (
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
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={28} color={cores.icone} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Usuários bloqueados</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>

        <FlatList
          data={itens}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          style={styles.corpo}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={styles.separador} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!carregando && pagina < ultima) void carregar(pagina + 1);
          }}
          ListEmptyComponent={
            <View style={styles.vazio}>
              {carregando ? (
                <ActivityIndicator color="#999" />
              ) : (
                <>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={42}
                    color="#BBB"
                  />
                  <Text style={styles.vazioTitulo}>
                    Nenhum usuário bloqueado
                  </Text>
                  <Text style={styles.vazioTexto}>
                    Quando você bloquear um passageiro ao avaliar uma corrida,
                    ele aparece aqui e deixa de tocar nas suas chamadas.
                  </Text>
                </>
              )}
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const estilosBase = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
  },
  header: { backgroundColor: "#fff", paddingBottom: 15, paddingHorizontal: 16 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#111" },
  corpo: { flex: 1 },
  item: { padding: 16, backgroundColor: "#FFF" },
  linhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetra: { fontSize: 18, fontWeight: "700", color: "#555" },
  textos: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "700", color: "#111" },
  data: { fontSize: 12, color: "#888", marginTop: 2 },
  botaoDesbloquear: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  textoDesbloquear: { fontSize: 13, color: "#333", fontWeight: "600" },
  estrelas: { flexDirection: "row", gap: 2, marginTop: 10 },
  selos: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
  },
  seloIcone: { fontSize: 14 },
  seloTitulo: { fontSize: 12, color: "#444" },
  comentario: { marginTop: 8, fontSize: 14, color: "#444", lineHeight: 20 },
  separador: { height: 1, backgroundColor: "#F0F0F0" },
  vazio: { padding: 32, alignItems: "center", gap: 8 },
  vazioTitulo: { fontSize: 16, fontWeight: "700", color: "#333" },
  vazioTexto: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
