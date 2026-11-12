import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
// três cartões por linha: 16 de margem nas bordas e 10 entre eles
const LARGURA_CARTAO = Math.floor((width - 32 - 20) / 3);

export interface OpcaoPainel {
  id: string;
  rotulo: string;
  valor: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  opcoes: OpcaoPainel[];
  selecionados: string[];
  // sempre no painel: não têm o ⊗ nem aparecem para adicionar
  fixos: string[];
  maximo: number;
  onConfirmar: (ids: string[]) => void;
}

export default function EditarPainelGanhos({
  visible,
  onClose,
  opcoes,
  selecionados,
  fixos,
  maximo,
  onConfirmar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [montado, setMontado] = useState(visible);
  const [escolha, setEscolha] = useState(selecionados);
  // cada abertura parte do painel salvo; voltar sem confirmar descarta
  const [aberta, setAberta] = useState(false);
  if (visible !== aberta) {
    setAberta(visible);
    if (visible) setEscolha(selecionados);
  }

  useEffect(() => {
    if (visible) {
      setTimeout(() => setMontado(true), 0);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: width,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMontado(false));
    }
  }, [visible, translateX]);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!visible) return false;
      onClose();
      return true;
    });
    return () => assinatura.remove();
  }, [visible, onClose]);

  if (!montado) return null;

  const porId = Object.fromEntries(opcoes.map((opcao) => [opcao.id, opcao]));
  const cheio = escolha.length >= maximo;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 35 }]}>
      <Animated.View style={[styles.tela, { transform: [{ translateX }] }]}>
        <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.titulo}>Editar Painel</Text>
        </View>

        <ScrollView contentContainerStyle={styles.conteudo}>
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Os dados selecionados serão exibidos no Painel da página inicial
            </Text>
          </View>

          <Text style={styles.secao}>Painel</Text>
          <View style={styles.grade}>
            {escolha.map((id) => {
              const opcao = porId[id];
              if (!opcao) return null;
              const fixo = fixos.includes(id);
              return (
                <View
                  key={id}
                  style={[styles.cartao, !fixo && styles.cartaoRemovivel]}
                >
                  <Text style={styles.valor}>{opcao.valor}</Text>
                  <Text style={styles.rotulo}>{opcao.rotulo}</Text>
                  {!fixo && (
                    <TouchableOpacity
                      style={styles.remover}
                      hitSlop={10}
                      onPress={() =>
                        setEscolha((atual) =>
                          atual.filter((item) => item !== id),
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${opcao.rotulo}`}
                    >
                      <Ionicons name="close-circle" size={22} color="#555" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.dica}>
            {cheio
              ? `Até ${maximo} itens: remova um para adicionar outro`
              : "Adicione opções tocando em +"}
          </Text>
          <View style={styles.grade}>
            {opcoes
              .filter((opcao) => !fixos.includes(opcao.id))
              .map((opcao) => {
                const escolhida = escolha.includes(opcao.id);
                const pode = !escolhida && !cheio;
                return (
                  <TouchableOpacity
                    key={opcao.id}
                    style={styles.cartao}
                    disabled={!pode}
                    onPress={() => setEscolha((atual) => [...atual, opcao.id])}
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar ${opcao.rotulo}`}
                    accessibilityState={{ disabled: !pode }}
                  >
                    <Text style={[styles.valor, escolhida && styles.apagado]}>
                      {opcao.valor}
                    </Text>
                    <Text style={[styles.rotulo, escolhida && styles.apagado]}>
                      {opcao.rotulo}
                    </Text>
                    {pode && (
                      <View style={styles.mais}>
                        <Ionicons name="add" size={16} color="#111" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        </ScrollView>

        <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.confirmar}
            onPress={() => {
              onConfirmar(escolha);
              onClose();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.confirmarTexto}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#FFF" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDD",
  },
  titulo: { fontSize: 22, lineHeight: 28, fontWeight: "500", color: "#222" },
  conteudo: { padding: 16, gap: 16 },
  aviso: { backgroundColor: "#FDEEE8", borderRadius: 12, padding: 14 },
  avisoTexto: { fontSize: 16, lineHeight: 22, color: "#333" },
  secao: { fontSize: 22, lineHeight: 28, fontWeight: "600", color: "#222" },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cartao: {
    width: LARGURA_CARTAO,
    minHeight: 104,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cartaoRemovivel: { borderColor: "#BDBDBD", borderStyle: "dashed" },
  valor: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  rotulo: {
    fontSize: 13,
    lineHeight: 18,
    color: "#777",
    textAlign: "center",
  },
  apagado: { color: "#C4C4C4" },
  remover: { position: "absolute", top: 4, right: 4 },
  mais: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
  },
  dica: { fontSize: 16, lineHeight: 22, color: "#555" },
  rodape: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#FFF" },
  confirmar: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmarTexto: { fontSize: 18, fontWeight: "700", color: "#111" },
});
