import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, mensagemDaApi } from "@/Services/api";
import ErrorBanner from "@/components/common/ErrorBanner";
import { Text, TextInput } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { combinaComBusca } from "@/domain/perfilMotorista";
import { useEspacoDoTeclado } from "@/hooks/useEspacoDoTeclado";

interface Cidade {
  id: number;
  nome: string;
  uf: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// os municípios do IBGE (~250 KB) vêm uma vez só por sessão do app
let cidadesEmCache: Cidade[] | null = null;

// a cidade onde o motorista roda: ele busca pelo nome e o estado vem da cidade
export default function EscolherCidade({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const espacoDoTeclado = useEspacoDoTeclado();
  const { user, atualizarUsuario } = useAuth();
  const [cidades, setCidades] = useState<Cidade[] | null>(cidadesEmCache);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!visible || cidadesEmCache) return;
    let ativo = true;
    api
      .get<{ data: Cidade[] }>("/motorista/cidades")
      .then(({ data }) => {
        cidadesEmCache = data.data;
        if (!ativo) return;
        setCidades(data.data);
        setErro("");
      })
      .catch(
        (error) =>
          ativo &&
          setErro(mensagemDaApi(error, "Não foi possível carregar as cidades.")),
      );
    return () => {
      ativo = false;
    };
  }, [visible]);

  const fechar = () => {
    setBusca("");
    onClose();
  };

  const escolher = async (cidade: Cidade) => {
    if (salvando !== null) return;
    if (cidade.id === user?.cidade?.id) return fechar();
    setSalvando(cidade.id);
    setErro("");
    try {
      const { data } = await api.put("/motorista/me/cidade", {
        cidade_id: cidade.id,
      });
      await atualizarUsuario(data.user);
      fechar();
    } catch (error) {
      setErro(mensagemDaApi(error, "Não foi possível salvar a cidade."));
    } finally {
      setSalvando(null);
    }
  };

  // sem busca, só a cidade atual: listar os 5.570 municípios não ajuda ninguém
  const visiveis = useMemo(() => {
    if (busca.trim().length < 2) {
      return (cidades ?? []).filter((item) => item.id === user?.cidade?.id);
    }
    return (cidades ?? []).filter((item) => combinaComBusca(busca, item.nome));
  }, [cidades, busca, user?.cidade?.id]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={fechar}
    >
      <Pressable style={styles.fundo} onPress={fechar} />
      <View
        style={[
          styles.folha,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 8 + espacoDoTeclado,
          },
        ]}
      >
        <View style={styles.topo}>
          <Text style={styles.titulo}>Cidade</Text>
          <TouchableOpacity
            onPress={fechar}
            style={styles.fechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={22} color="#999" />
          </TouchableOpacity>
        </View>
        <Text style={styles.apoio}>Em qual cidade você roda com o app?</Text>

        <View style={styles.campo}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.input}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar cidade"
            placeholderTextColor="#999"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Buscar cidade"
          />
          {busca !== "" && (
            <TouchableOpacity
              onPress={() => setBusca("")}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={20} color="#BDBDBD" />
            </TouchableOpacity>
          )}
        </View>

        {erro !== "" && <ErrorBanner message={erro} />}

        {cidades === null && erro === "" ? (
          <ActivityIndicator style={styles.carregando} color="#111" />
        ) : (
          <FlatList
            data={visiveis}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            ListEmptyComponent={
              <Text style={styles.vazio}>
                {busca.trim().length < 2
                  ? "Digite o nome da sua cidade."
                  : "Nenhuma cidade com esse nome."}
              </Text>
            }
            renderItem={({ item }) => {
              const atual = item.id === user?.cidade?.id;
              return (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => void escolher(item)}
                  disabled={salvando !== null}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: atual }}
                >
                  <Text style={[styles.nome, atual && styles.nomeAtual]}>
                    {item.nome}
                  </Text>
                  {salvando === item.id ? (
                    <ActivityIndicator color="#111" />
                  ) : atual ? (
                    <Ionicons name="checkmark-circle" size={24} color="#111" />
                  ) : (
                    <Text style={styles.sigla}>{item.uf}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  folha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    height: "85%",
  },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  fechar: {
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    padding: 4,
  },
  apoio: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
    marginBottom: 12,
  },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  carregando: {
    marginVertical: 32,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  nome: {
    flex: 1,
    fontSize: 18,
    color: "#333",
  },
  nomeAtual: {
    fontWeight: "700",
    color: "#111",
  },
  sigla: {
    fontSize: 15,
    color: "#999",
    fontWeight: "600",
  },
  vazio: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
});
