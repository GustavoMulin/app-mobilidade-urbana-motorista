import { useEstilos, useTema } from "@/theme/tema";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
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
  duration?: number;
}

type Icone = keyof typeof Ionicons.glyphMap;

// Dados de exemplo, iguais aos da tela de perfil, até a ligação com o servidor
const perfil = {
  nome: "Diogo",
  cidade: "Porto Velho | Brazil",
  foto: "https://i.pravatar.cc/150?img=12",
  nota: "4.79",
  corridas: "9000+",
  anos: "2+",
};

const verificacoes = [
  "Verificação de Antecedentes",
  "CNH verificada",
  "CRLV verificado",
  "Foto com a CNH",
  "Foto de perfil",
  "Reconhecimento Facial",
];

const avaliacoesPositivas = [
  { id: "1", titulo: "Bom condutor", total: 183, foto: 1 },
  { id: "2", titulo: "Carro limpo", total: 117, foto: 2 },
  { id: "3", titulo: "Educado/Respeitoso", total: 65, foto: 3 },
  { id: "4", titulo: "Simpático", total: 63, foto: 4 },
];

const conquistas: { id: string; titulo: string; icone: Icone; cor: string }[] =
  [
    { id: "1", titulo: "10.000+ km", icone: "car-sport", cor: "#FF7A00" },
    {
      id: "2",
      titulo: "2 anos na plataforma",
      icone: "trophy",
      cor: "#F25C1E",
    },
    {
      id: "3",
      titulo: "5 estrelas 1000+ vezes",
      icone: "star",
      cor: "#7B4DFF",
    },
    {
      id: "4",
      titulo: "1000+ avaliações",
      icone: "chatbubbles",
      cor: "#2F9BFF",
    },
  ];

const avaliacaoCincoEstrelas = {
  comentario:
    "Muito boa a corrida ao som de Bon Jovi, Bryan Adams... O excelente gosto musical do motorista tornou a viagem agradável. Parabéns!",
  autor: "Amanda",
  tempo: "9 meses atrás",
};

export default function PerfilPublico({
  visible,
  onClose,
  duration = 200,
}: props) {
  const { cores } = useTema();
  const styles = useEstilos(estilosBase);
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
              Isto é o que os passageiro verão
            </Text>
          </View>

          <View style={styles.identidade}>
            <Image source={{ uri: perfil.foto }} style={styles.foto} />
            <View style={styles.identidadeTextos}>
              <Text style={styles.nome}>{perfil.nome}</Text>
              <Text style={styles.cidade}>
                De <Text style={styles.cidadeForte}>{perfil.cidade}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.numeros}>
            <View style={styles.numero}>
              <View style={styles.numeroLinha}>
                <Text style={styles.numeroValor}>{perfil.nota}</Text>
                <Ionicons name="star" size={22} color={cores.icone} />
              </View>
              <Text style={styles.numeroRotulo}>Nota</Text>
            </View>
            <View style={styles.numero}>
              <Text style={styles.numeroValor}>{perfil.corridas}</Text>
              <Text style={styles.numeroRotulo}>Corridas</Text>
            </View>
            <View style={styles.numero}>
              <Text style={styles.numeroValor}>{perfil.anos}</Text>
              <Text style={styles.numeroRotulo}>Anos</Text>
            </View>
          </View>

          <View style={styles.secaoCabecalho}>
            <Text style={styles.secaoTitulo}>Verificações</Text>
            <View style={styles.maisLinha}>
              <Text style={styles.maisTexto}>Mais</Text>
              <Ionicons name="chevron-forward" size={16} color={cores.textoApoio} />
            </View>
          </View>
          <View style={styles.chips}>
            {verificacoes.map((titulo) => (
              <View key={titulo} style={styles.chip}>
                <Ionicons name="checkmark" size={14} color={cores.icone} />
                <Text style={styles.chipTexto}>{titulo}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
            Avaliações positivas
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.linhaHorizontal}
          >
            {avaliacoesPositivas.map((item) => (
              <View key={item.id} style={styles.positiva}>
                <View>
                  <Image
                    source={{
                      uri: `https://i.pravatar.cc/150?img=${item.foto}`,
                    }}
                    style={styles.positivaFoto}
                  />
                  <View style={styles.contador}>
                    <Text style={styles.contadorTexto}>{item.total}</Text>
                  </View>
                </View>
                <Text style={styles.positivaTitulo}>{item.titulo}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
            Conquistas
          </Text>
          <View style={styles.conquistas}>
            {conquistas.map((item) => (
              <View key={item.id} style={styles.conquista}>
                <View
                  style={[styles.conquistaIcone, { backgroundColor: item.cor }]}
                >
                  <Ionicons name={item.icone} size={34} color="#fff" />
                </View>
                <Text style={styles.conquistaTitulo}>{item.titulo}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.secaoTitulo, styles.secaoSolta]}>
            Avaliações 5 estrelas
          </Text>
          <Text style={styles.comentario}>
            {avaliacaoCincoEstrelas.comentario}
          </Text>
          <Text style={styles.comentarioRodape}>
            {avaliacaoCincoEstrelas.autor} • {avaliacaoCincoEstrelas.tempo}
          </Text>
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
