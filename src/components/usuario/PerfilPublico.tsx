import { useEstilos, useTema } from "@/theme/tema";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { Text } from "@/components/common/Texto";
import { textoDaNotaDoMotorista } from "@/domain/notaDoMotorista";
import {
  tempoNaPlataforma,
  textoDeQuando,
  type PerfilMotorista,
} from "@/domain/perfilMotorista";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  // os mesmos dados do perfil: o público é o recorte que o passageiro enxerga
  perfil: PerfilMotorista | null;
  duration?: number;
}

type Icone = keyof typeof Ionicons.glyphMap;

// cores dos quadrinhos das conquistas, em rodízio
const CORES_CONQUISTA = ["#FF7A00", "#F25C1E", "#7B4DFF", "#2F9BFF"];

export default function PerfilPublico({
  visible,
  onClose,
  perfil,
  duration = 200,
}: props) {
  const { cores } = useTema();
  const tema = useEstilos(estilosBase);
  // o botão amarelo mantém o texto preto nos dois modos
  const styles = {
    ...tema,
    botaoFecharTexto: { ...estilosBase.botaoFecharTexto, color: "#000" },
  };
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
      setTimeout(() => setIsMounted(true), 0);
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

  const tempo = tempoNaPlataforma(
    perfil?.meses_na_plataforma ?? 0,
    perfil?.desde_em ?? null,
  );
  const verificacoes = (perfil?.verificacoes ?? []).filter((item) => item.ok);
  const elogios = perfil?.elogios ?? [];
  const conquistas = perfil?.selos ?? [];
  // as avaliações de 5 estrelas com comentário, da mais nova para a mais antiga
  const cincoEstrelas = (perfil?.notas_agradecimento ?? [])
    .filter((nota) => nota.nota === 5)
    .slice(0, 3);
  const cidade = perfil?.cidade
    ? `${perfil.cidade.nome} - ${perfil.cidade.uf}`
    : null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      <Animated.View style={[styles.tela, { transform: [{ translateX }] }]}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
        >
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={cores.icone} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil público</Text>
        </View>

        <ScrollView
          style={styles.corpo}
          contentContainerStyle={styles.corpoConteudo}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Isto é o que os passageiros verão
            </Text>
          </View>

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
              {cidade ? (
                <Text style={styles.cidade}>
                  De <Text style={styles.cidadeForte}>{cidade}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.numeros}>
            <View style={styles.numero}>
              <View style={styles.numeroLinha}>
                <Text style={styles.numeroValor}>
                  {perfil ? textoDaNotaDoMotorista(perfil.nota) : "-"}
                </Text>
                <Ionicons name="star" size={22} color={cores.icone} />
              </View>
              <Text style={styles.numeroRotulo}>Nota</Text>
            </View>
            <View style={styles.numero}>
              <Text style={styles.numeroValor}>{perfil?.corridas ?? "-"}</Text>
              <Text style={styles.numeroRotulo}>
                {perfil?.corridas === 1 ? "Corrida" : "Corridas"}
              </Text>
            </View>
            <View style={styles.numero}>
              <Text style={styles.numeroValor}>{tempo.valor}</Text>
              <Text style={styles.numeroRotulo}>{tempo.rotulo}</Text>
            </View>
          </View>

          {verificacoes.length > 0 && (
            <>
              <View style={styles.secaoCabecalho}>
                <Text style={styles.secaoTitulo}>Verificações</Text>
              </View>
              <View style={styles.chips}>
                {verificacoes.map((item) => (
                  <View key={item.chave} style={styles.chip}>
                    <Ionicons name="checkmark" size={14} color={cores.icone} />
                    <Text style={styles.chipTexto}>{item.titulo}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {elogios.length > 0 && (
            <>
              <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
                Avaliações positivas
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.linhaHorizontal}
              >
                {elogios.map((item) => (
                  <View key={item.chave} style={styles.positiva}>
                    <View>
                      <View
                        style={[styles.positivaFoto, styles.positivaImagem]}
                      >
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

          {conquistas.length > 0 && (
            <>
              <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
                Conquistas
              </Text>
              <View style={styles.conquistas}>
                {conquistas.map((item, indice) => (
                  <View key={item.chave} style={styles.conquista}>
                    <View
                      style={[
                        styles.conquistaIcone,
                        {
                          backgroundColor:
                            CORES_CONQUISTA[indice % CORES_CONQUISTA.length],
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icone as Icone}
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

          {cincoEstrelas.length > 0 && (
            <>
              <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
                Avaliações 5 estrelas
              </Text>
              {cincoEstrelas.map((nota) => (
                <View key={nota.id} style={styles.avaliacaoCincoEstrelas}>
                  <Text style={styles.comentario}>{nota.comentario}</Text>
                  <Text style={styles.comentarioRodape}>
                    {nota.autor} • {textoDeQuando(nota.quando)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.rodape,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity style={styles.botaoFechar} onPress={onClose}>
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
  corpo: { flex: 1 },
  corpoConteudo: { paddingHorizontal: 24, paddingBottom: 24 },
  aviso: {
    marginTop: 18,
    backgroundColor: "#F2F3F5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  avisoTexto: { fontSize: 17, fontWeight: "600", color: "#111" },
  identidade: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 18,
  },
  foto: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "#E5E7EB",
  },
  identidadeTextos: { flex: 1, marginLeft: 26 },
  nome: { fontSize: 38, fontWeight: "800", color: "#111" },
  cidade: { fontSize: 17, color: "#111", marginTop: 14 },
  cidadeForte: { fontWeight: "800" },
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
  secaoCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  secaoTitulo: { fontSize: 27, fontWeight: "800", color: "#111" },
  fotoVazia: { alignItems: "center", justifyContent: "center" },
  positivaImagem: { alignItems: "center", justifyContent: "center" },
  avaliacaoCincoEstrelas: { marginBottom: 22 },
  secaoSolta: { marginTop: 40, marginBottom: 18 },
  maisLinha: { flexDirection: "row", alignItems: "center" },
  maisTexto: { fontSize: 17, color: "#111" },
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
  positivaFoto: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E5E7EB",
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
  conquistas: { flexDirection: "row", justifyContent: "space-between" },
  conquista: { width: "24%", alignItems: "center" },
  conquistaIcone: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  conquistaTitulo: {
    marginTop: 12,
    fontSize: 15,
    color: "#111",
    textAlign: "center",
  },
  comentario: { fontSize: 20, lineHeight: 30, color: "#222" },
  comentarioRodape: { fontSize: 17, color: "#A0A4A8", marginTop: 16 },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  botaoFechar: {
    backgroundColor: "#FFD600",
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
  },
  botaoFecharTexto: { fontSize: 22, fontWeight: "800", color: "#111" },
});
