import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { Text } from "@/components/common/Texto";
import {
  tempoNoApp,
  textoDaNotaPublica,
  type PerfilPublicoPassageiro,
} from "@/domain/perfilPassageiro";
import { extrasDaCorrida, useEstilos, useTema } from "@/theme/tema";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  perfil: PerfilPublicoPassageiro | null;
  carregando?: boolean;
  erro?: boolean;
  duration?: number;
}

/**
 * Perfil público do passageiro, como o motorista o enxerga: foto ou avatar,
 * primeiro nome, nota, corridas, tempo no app, o que já foi confirmado, as
 * avaliações positivas e as conquistas. Nada de contato nem de documentos.
 */
export default function PerfilPassageiroPublico({
  visible,
  onClose,
  perfil,
  carregando = false,
  erro = false,
  duration = 200,
}: Props) {
  const { cores } = useTema();
  const styles = useEstilos(estilosBase, extrasDaCorrida);
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMounted(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: width,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => finished && setIsMounted(false));
    }
  }, [visible, duration, translateX]);

  if (!isMounted) return null;

  const tempo = tempoNoApp(
    perfil?.meses_na_plataforma ?? 0,
    perfil?.desde_em ?? null,
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 70, elevation: 70 }]}>
      <Animated.View style={[styles.tela, { transform: [{ translateX }] }]}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={26} color={cores.icone} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil do passageiro</Text>
        </View>

        {carregando && !perfil ? (
          <View style={styles.centro}>
            <ActivityIndicator color="#fbc02d" />
          </View>
        ) : erro && !perfil ? (
          <View style={styles.centro}>
            <Text style={styles.erro}>
              Não foi possível carregar o perfil agora.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.corpo}
            contentContainerStyle={styles.corpoConteudo}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.identidade}>
              {perfil?.foto ? (
                <Image source={{ uri: perfil.foto }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoVazia]}>
                  <Ionicons name="person" size={64} color="#BDBDBD" />
                </View>
              )}
              <View style={styles.identidadeTextos}>
                <Text style={styles.nome} numberOfLines={2}>
                  {(perfil?.nome ?? "").split(" ")[0]}
                </Text>
                <Text style={styles.noApp}>
                  No app há{" "}
                  <Text style={styles.noAppForte}>
                    {tempo.valor} {tempo.rotulo.toLowerCase()}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.numeros}>
              <View style={styles.numero}>
                <View style={styles.numeroLinha}>
                  <Text style={styles.numeroValor}>
                    {perfil ? textoDaNotaPublica(perfil.nota) : "-"}
                  </Text>
                  <Ionicons name="star" size={22} color={cores.icone} />
                </View>
                <Text style={styles.numeroRotulo}>Nota</Text>
              </View>
              <View style={styles.numero}>
                <Text style={styles.numeroValor}>
                  {perfil?.corridas ?? "-"}
                </Text>
                <Text style={styles.numeroRotulo}>
                  {perfil?.corridas === 1 ? "Corrida" : "Corridas"}
                </Text>
              </View>
              <View style={styles.numero}>
                <Text style={styles.numeroValor}>{tempo.valor}</Text>
                <Text style={styles.numeroRotulo}>{tempo.rotulo}</Text>
              </View>
            </View>

            {(perfil?.verificacoes ?? []).length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>Verificações</Text>
                <View style={styles.chips}>
                  {(perfil?.verificacoes ?? []).map((item) => (
                    <View key={item.chave} style={styles.chip}>
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={cores.icone}
                      />
                      <Text style={styles.chipTexto}>{item.titulo}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {(perfil?.elogios ?? []).length > 0 && (
              <>
                <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
                  Avaliações positivas
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.linhaHorizontal}
                >
                  {(perfil?.elogios ?? []).map((item) => (
                    <View key={item.chave} style={styles.positiva}>
                      <View>
                        <View style={styles.positivaImagem}>
                          <IconeDoSelo
                            imagem={item.imagem}
                            icone={item.icone}
                            tamanho={88}
                          />
                        </View>
                        <View style={styles.contador}>
                          <Text style={styles.contadorTexto}>
                            {item.quantidade}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.positivaTitulo} numberOfLines={2}>
                        {item.titulo}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {(perfil?.selos ?? []).length > 0 && (
              <>
                <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
                  Conquistas
                </Text>
                <View style={styles.conquistas}>
                  {(perfil?.selos ?? []).map((item) => (
                    <View key={item.chave} style={styles.conquista}>
                      <View style={styles.conquistaIcone}>
                        <Ionicons
                          name={
                            item.icone as React.ComponentProps<
                              typeof Ionicons
                            >["name"]
                          }
                          size={34}
                          color="#fff"
                        />
                      </View>
                      <Text style={styles.conquistaTitulo}>{item.titulo}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}

        <View
          style={[
            styles.rodape,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botaoFechar}
            onPress={onClose}
          >
            <Text style={styles.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const estilosBase = StyleSheet.create({
  tela: { ...StyleSheet.absoluteFill, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 19, fontWeight: "600", color: "#333" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  erro: { fontSize: 16, color: "#888", textAlign: "center" },
  corpo: { flex: 1 },
  corpoConteudo: { paddingHorizontal: 24, paddingBottom: 24 },
  identidade: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 18,
  },
  foto: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "#E5E7EB",
  },
  fotoVazia: { alignItems: "center", justifyContent: "center" },
  identidadeTextos: { flex: 1, marginLeft: 26 },
  nome: { fontSize: 38, fontWeight: "800", color: "#111" },
  noApp: { fontSize: 17, color: "#111", marginTop: 14 },
  noAppForte: { fontWeight: "800" },
  numeros: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 40,
    marginBottom: 36,
  },
  numero: { alignItems: "center" },
  numeroLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  numeroValor: { fontSize: 34, fontWeight: "700", color: "#111" },
  numeroRotulo: { fontSize: 18, color: "#9AA0A6", marginTop: 6 },
  secaoTitulo: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
    marginBottom: 14,
  },
  secaoSolta: { marginTop: 40, marginBottom: 18 },
  chips: { alignItems: "flex-start", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F3F5",
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  chipTexto: { fontSize: 18, color: "#111" },
  linhaHorizontal: { gap: 18, paddingRight: 8 },
  positiva: { width: 112, alignItems: "center" },
  positivaImagem: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  contador: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF5722",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  contadorTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },
  positivaTitulo: {
    marginTop: 12,
    fontSize: 18,
    color: "#111",
    textAlign: "center",
  },
  conquistas: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  conquista: { width: 92, alignItems: "center" },
  conquistaIcone: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  conquistaTitulo: {
    marginTop: 12,
    fontSize: 15,
    color: "#111",
    textAlign: "center",
  },
  rodape: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: "#fff" },
  botaoFechar: {
    backgroundColor: "#FFD600",
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
  },
  botaoFecharTexto: { fontSize: 22, fontWeight: "800", color: "#111" },
});
