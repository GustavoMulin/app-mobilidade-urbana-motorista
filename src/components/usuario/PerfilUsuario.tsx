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
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { useDadosDaTela } from "@/hooks/useDadosDaTela";
import { textoDeQuando, type PerfilMotorista } from "@/domain/perfilMotorista";
import DetalhesComentario from "./DetalhesComentario";
import DicasAvaliacao from "./DicasAvaliacao";
import PerfilPublico from "./PerfilPublico";
import MeuPerfil from "./MeuPerfil";
import ModalSelos from "./ModalSelos";
import NotasAgradecimentos from "./NotasAgradecimentos";
import VerificacoesUsuario from "./VerificacoesUsuario";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const RatingRow = ({
  stars,
  count,
  percentage,
}: {
  stars: number;
  count: number;
  percentage: number;
}) => {
  const styles = useEstilos(estilosBase);
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.starLabel}>{stars} ★</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.ratingCount}>{count}</Text>
    </View>
  );
};

export default function PerfilUsuario({
  visible,
  onClose,
  duration = 200,
}: props) {
  const { cores } = useTema();
  const styles = useEstilos(estilosBase);
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showMeuPerfil, setShowMeuPerfil] = useState(false);
  const [showNotasAgradecimentos, setShowNotasAgradecimentos] = useState(false);
  const [showVerificacoesUsuario, setShowVerificacoesUsuario] = useState(false);
  const [showModalSelos, setShowModalSelos] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [seloSelecionado, setSeloSelecionado] = useState<any>(null);
  const [ComentarioSelecionado, setComentarioSelecionado] = useState<any>(null);
  const [showDetalhesComentario, setShowDetalhesComentarioSelecionado] =
    useState(false);
  const [showDicasAvaliacao, setShowDicasAvaliacao] = useState(false);
  const [showPerfilPublico, setShowPerfilPublico] = useState(false);

  // selos, notas de agradecimento e dicas vêm do servidor; conta nova começa sem selos nem notas
  const { dados: perfil } = useDadosDaTela<PerfilMotorista>(
    visible,
    "/motorista/me/perfil",
  );
  const avaliacoesPositivas = perfil?.elogios ?? [];
  const notasAgradecimento = perfil?.notas_agradecimento ?? [];
  const dicasAvaliacao = perfil?.dicas ?? [];

  const mostrarAvaliacaoPositiva = (payload: object) => {
    setSeloSelecionado(payload);
    setShowModalSelos(true);
  };
  const mostrarDetalhesMensagem = (payload: object) => {
    setComentarioSelecionado(payload);
    setShowDetalhesComentarioSelecionado(true);
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
  }, [visible, duration, translateX, overlayOpacity]);

  if (!isMounted) return null;

  return (
    <>
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
          {/* HEADER */}
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
            onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerContentLeft}>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="chevron-back" size={24} color={cores.icone} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Perfil de usuário</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMeuPerfil(true)}>
                <Text style={styles.headerLink}>Configurações</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* USER INFO */}
            <View style={styles.profileSection}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                style={styles.mainAvatar}
              />
              <Text style={styles.userName}>Diogo</Text>
              <TouchableOpacity
                style={styles.publicProfileBtn}
                onPress={() => setShowPerfilPublico(true)}
              >
                <Text style={styles.publicProfileText}>Ver perfil público</Text>
              </TouchableOpacity>
            </View>

            {/* STATS */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>8000+</Text>
                <Text style={styles.statLabel}>Corridas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2+</Text>
                <Text style={styles.statLabel}>Anos</Text>
              </View>
            </View>

            {/* RATING SECTION */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.evaluationTitle}>Avaliação 4.63 ★</Text>
                <TouchableOpacity onPress={() => setShowDicasAvaliacao(true)}>
                  <Text style={styles.linkText}>Como funciona {">"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subInfoText}>
                Média das 100 últimas avaliações de corridas
              </Text>

              <View style={styles.ratingGraph}>
                <RatingRow stars={5} count={89} percentage={89} />
                <RatingRow stars={4} count={0} percentage={0} />
                <RatingRow stars={3} count={2} percentage={2} />
                <RatingRow stars={2} count={3} percentage={3} />
                <RatingRow stars={1} count={6} percentage={6} />
              </View>
            </View>

            {/* POSITIVE REVIEWS HORIZONTAL */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Minhas avaliações positivas
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {avaliacoesPositivas.length === 0 && (
                    <Text style={styles.semDados}>
                      Você ainda não recebeu selos. Eles aparecem aqui quando os
                      passageiros elogiarem suas corridas.
                    </Text>
                  )}
                  {avaliacoesPositivas.map((item) => (
                    <View key={item.chave} style={styles.badgeItem}>
                      <View style={styles.avatarWrapper}>
                        <TouchableOpacity
                          onPress={() =>
                            mostrarAvaliacaoPositiva({
                              titulo: item.titulo,
                              subtitulo: item.descricao ?? "",
                              icone: item.icone,
                              imagem: item.imagem,
                            })
                          }
                        >
                          <View style={styles.avatarEmoji}>
                            <IconeDoSelo
                              imagem={item.imagem}
                              icone={item.icone}
                              tamanho={64}
                            />
                          </View>
                        </TouchableOpacity>
                        <View style={styles.badgeCountContainer}>
                          <Text style={styles.badgeCountText}>
                            {item.quantidade}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.badgeLabel}>{item.titulo}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* SEÇÃO: NOTAS DE AGRADECIMENTO */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notas de agradecimento</Text>
                <TouchableOpacity
                  onPress={() => setShowNotasAgradecimentos(true)}
                >
                  <Text style={styles.linkText}>Ver tudo {">"}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {notasAgradecimento.length === 0 && (
                  <Text style={styles.semDados}>
                    Ainda não há notas de agradecimento. Os comentários que os
                    passageiros deixarem ao avaliar você aparecem aqui.
                  </Text>
                )}
                {notasAgradecimento.map((item) => (
                  <View key={item.id} style={styles.noteCard}>
                    <TouchableOpacity
                      onPress={() =>
                        mostrarDetalhesMensagem({
                          autor: item.autor,
                          comentario: item.comentario,
                          tempo: textoDeQuando(item.quando),
                          elogios: item.elogios,
                          nota: item.nota,
                        })
                      }
                    >
                      <Text style={styles.noteText} numberOfLines={3}>
                        {item.comentario}
                      </Text>
                      <Text style={styles.noteFooter}>
                        {item.autor} • {textoDeQuando(item.quando)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* SEÇÃO: COMO TER MAIS AVALIAÇÕES */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Como ter mais avaliações positivas?
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {dicasAvaliacao.length === 0 && (
                  <Text style={styles.semDados}>
                    Nenhuma dica cadastrada por enquanto.
                  </Text>
                )}
                {dicasAvaliacao.map((item) => (
                  <View key={item.id} style={styles.dicaCard}>
                    <Text style={styles.dicaTitle}>{item.titulo}</Text>
                    <Text style={styles.dicaSub}>{item.texto}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* CONQUESTS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selos de conquistas</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                <View style={styles.conquestCard}>
                  <Ionicons name="ribbon" size={40} color="#FFD700" />
                  <Text style={styles.conquestTitle}>
                    5 estrelas 1000+ vezes
                  </Text>
                  <Text style={styles.conquestSub}>
                    Preferido dos passageiros
                  </Text>
                </View>
                <View style={styles.conquestCard}>
                  <Ionicons name="medal" size={40} color="#C0C0C0" />
                  <Text style={styles.conquestTitle}>2 anos na plataforma</Text>
                  <Text style={styles.conquestSub}>Pioneiro nas ruas</Text>
                </View>
              </ScrollView>
            </View>

            {/* VERIFICATIONS */}
            <View style={[styles.section, { marginBottom: 40 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Verificações</Text>
                <TouchableOpacity
                  onPress={() => setShowVerificacoesUsuario(true)}
                >
                  <Text style={styles.linkText}>Mais {">"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.verificationRow}>
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                <Text style={styles.verificationText}>
                  Verificação de Antecedentes
                </Text>
              </View>
              <View style={styles.verificationRow}>
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                <Text style={styles.verificationText}>CNH verificada</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        <ModalSelos
          visible={showModalSelos}
          onClose={() => setShowModalSelos(false)}
          headerHeight={headerHeight}
          data={seloSelecionado}
        />
        <MeuPerfil
          visible={showMeuPerfil}
          onClose={() => setShowMeuPerfil(false)}
        />
        <NotasAgradecimentos
          visible={showNotasAgradecimentos}
          onClose={() => setShowNotasAgradecimentos(false)}
        />
        <VerificacoesUsuario
          visible={showVerificacoesUsuario}
          onClose={() => setShowVerificacoesUsuario(false)}
        />
        <DetalhesComentario
          visible={showDetalhesComentario}
          onClose={() => setShowDetalhesComentarioSelecionado(false)}
          data={ComentarioSelecionado}
        />
        <DicasAvaliacao
          visible={showDicasAvaliacao}
          onClose={() => setShowDicasAvaliacao(false)}
        />
        <PerfilPublico
          visible={showPerfilPublico}
          onClose={() => setShowPerfilPublico(false)}
        />
      </View>
    </>
  );
}

const estilosBase = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContentLeft: {
    flexDirection: "row",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  headerLink: {
    fontSize: 14,
    color: "#666",
  },
  scrollContainer: { flex: 1 },
  profileSection: { alignItems: "center", marginTop: 25 },
  mainAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  userName: { fontSize: 24, fontWeight: "800", color: "#111", marginTop: 15 },
  publicProfileBtn: {
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  publicProfileText: { fontSize: 14, fontWeight: "600", color: "#666" },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 30,
    paddingHorizontal: 40,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  evaluationTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  linkText: { fontSize: 14, color: "#999", fontWeight: "500" },
  subInfoText: { fontSize: 13, color: "#999", marginBottom: 15 },
  ratingGraph: { marginTop: 5 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  starLabel: { width: 30, fontSize: 12, color: "#333", fontWeight: "600" },
  barBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    marginHorizontal: 10,
  },
  barFill: { height: "100%", backgroundColor: "#FFD600", borderRadius: 3 },
  ratingCount: { width: 25, fontSize: 12, color: "#333", textAlign: "right" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },
  horizontalScroll: { paddingRight: 20 },
  badgeItem: {
    marginTop: 10,
    alignItems: "center",
    marginRight: 25,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    position: "relative",
  },
  avatarEmoji: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmojiTexto: { fontSize: 30 },
  semDados: { fontSize: 14, color: "#777", lineHeight: 20, paddingRight: 16 },
  avatarBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#eee",
  },
  badgeCountContainer: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 5,
  },
  badgeCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  badgeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    width: 80,
    fontWeight: "500",
  },
  noteCard: {
    backgroundColor: "#f5f5f5",
    width: 240,
    height: 110,
    borderRadius: 20,
    padding: 15,
    marginRight: 12,
    justifyContent: "space-between",
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
  },
  noteFooter: {
    fontSize: 12,
    color: "#999",
  },
  dicaCard: {
    backgroundColor: "#f5f5f5",
    width: 220,
    height: 100,
    borderRadius: 20,
    padding: 15,
    marginRight: 12,
    justifyContent: "center",
  },
  dicaTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  dicaSub: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  conquestCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginRight: 15,
    width: 160,
    alignItems: "center",
  },
  conquestTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },
  conquestSub: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  verificationText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
});
