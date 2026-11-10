import { Text } from "@/components/common/Texto";
import type { ItemAcao } from "@/domain/acoesNecessarias";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const VERMELHO = "#C5221F";

export default function AcoesNecessarias({ itens }: { itens: ItemAcao[] }) {
  const pulso = useSharedValue(0);
  const movimentoReduzido = useReducedMotion();

  useEffect(() => {
    if (movimentoReduzido) return;
    // a repetição recomeça do valor de partida: parado no fim, ficaria de 1 a 1
    pulso.set(0);
    pulso.set(
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
      ),
    );
    return () => cancelAnimation(pulso);
  }, [pulso, movimentoReduzido]);

  // o ícone cresce e volta enquanto uma onda sai dele e some
  const icone = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + Math.sin(pulso.get() * Math.PI) * 0.1 }],
  }));
  const onda = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulso.get()),
    transform: [{ scale: 0.9 + pulso.get() * 0.65 }],
  }));

  return (
    <View style={styles.faixa}>
      <View style={styles.coluna}>
        <View style={styles.iconeCaixa}>
          <Animated.View style={[styles.onda, onda]} />
          <Animated.View style={icone}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={22}
              color={VERMELHO}
            />
          </Animated.View>
        </View>
        <View style={styles.trilho} />
      </View>

      <View style={styles.conteudo}>
        <Text maxFontSizeMultiplier={1.1} style={styles.titulo}>
          Ações necessárias ({itens.length})
        </Text>
        <Text maxFontSizeMultiplier={1.1} style={styles.subtitulo}>
          Ficar online quando resolvido
        </Text>
        {itens.map((item) => (
          <TouchableOpacity
            key={item.chave}
            style={styles.linha}
            onPress={item.onPress}
            disabled={!item.onPress}
            activeOpacity={0.7}
            accessibilityRole={item.onPress ? "button" : "text"}
            accessibilityLabel={`${item.titulo}. ${item.detalhe}`}
          >
            <View style={styles.textos}>
              <Text maxFontSizeMultiplier={1.1} style={styles.linhaTitulo}>
                {item.titulo}
              </Text>
              <Text maxFontSizeMultiplier={1.1} style={styles.linhaDetalhe}>
                {item.detalhe}
              </Text>
            </View>
            {item.onPress ? (
              <Ionicons name="chevron-forward" size={22} color="#1F1F1F" />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 12,
    // anula o recuo da folha: a faixa vai de borda a borda
    marginHorizontal: -16,
    marginTop: 12,
    paddingLeft: 16,
    paddingRight: 20,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: "#FCE8E6",
  },
  coluna: { width: 36, alignItems: "center" },
  iconeCaixa: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  onda: {
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    backgroundColor: VERMELHO,
  },
  // liga o ícone às ações, como na lista da Uber
  trilho: {
    flex: 1,
    width: 2,
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 1,
    backgroundColor: "rgba(197,34,31,0.25)",
  },
  conteudo: { flex: 1 },
  titulo: { fontSize: 22, lineHeight: 28, fontWeight: "600", color: "#1F1F1F" },
  subtitulo: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
    color: VERMELHO,
    marginBottom: 6,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.12)",
  },
  textos: { flex: 1 },
  linhaTitulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    color: "#1F1F1F",
  },
  linhaDetalhe: { fontSize: 16, lineHeight: 22, color: "#5F6368" },
});
