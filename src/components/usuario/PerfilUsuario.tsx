import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import Carregando3D from "@/components/common/Carregando3D";
import { Text } from "@/components/common/Texto";
import { useAuth } from "@/context/AuthProvider";
import { textoDaNotaDoMotorista } from "@/domain/notaDoMotorista";
import {
  coresDaFaixa,
  larguraDaBarra,
  tempoNaPlataforma,
  textoDaMedia,
  textoDasFaixas,
  textoDeQuando,
  totalDaDistribuicao,
  type Elogio,
  type NotaDeAgradecimento,
  type PerfilMotorista,
} from "@/domain/perfilMotorista";
import { useDadosDaTela } from "@/hooks/useDadosDaTela";
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
import DetalhesComentario from "./DetalhesComentario";
import DicasAvaliacao from "./DicasAvaliacao";
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
}) => (
  <View style={styles.ratingRow}>
    <Text style={styles.starLabel}>{stars} ★</Text>
    <View style={styles.barBackground}>
      <View style={[styles.barFill, { width: `${percentage}%` }]} />
    </View>
    <Text style={styles.ratingCount}>{count}</Text>
  </View>
);

export default function PerfilUsuario({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);
  const [showMeuPerfil, setShowMeuPerfil] = useState(false);
  const [showNotasAgradecimentos, setShowNotasAgradecimentos] = useState(false);
  const [showVerificacoesUsuario, setShowVerificacoesUsuario] = useState(false);
  const [showModalSelos, setShowModalSelos] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [seloSelecionado, setSeloSelecionado] = useState<Elogio | null>(null);
  const [ComentarioSelecionado, setComentarioSelecionado] =
    useState<NotaDeAgradecimento | null>(null);
  const [showDetalhesComentario, setShowDetalhesComentarioSelecionado] =
    useState(false);
  const [showDicasAvaliacao, setShowDicasAvaliacao] = useState(false);

  // tudo vem da conta: nome, foto, nota, elogios, notas, selos e verificações
  const { user } = useAuth();
  const { dados: perfil, erro } = useDadosDaTela<PerfilMotorista>(
    visible,
    "/motorista/me/perfil",
  );
  const tempo = tempoNaPlataforma(perfil?.meses_na_plataforma ?? 0);
  const totalDeAvaliacoes = perfil
    ? totalDaDistribuicao(perfil.distribuicao)
    : 0;
  const elogiosRecebidos = (perfil?.elogios ?? []).filter(
    (elogio) => elogio.quantidade > 0,
  );

  const dicasAvaliacao = [
    {
      id: "1",
      titulo: "Cuide do seu veículo",
      sub: "Veículo limpo e manutenção em dia ajudam na avaliação.",
    },
    {
      id: "2",
      titulo: "Mantenha a calma",
      sub: "Respeite as leis de trânsito para uma viagem segura.",
    },
  ];

  const mostrarAvaliacaoPositiva = (payload: Elogio) => {
    setSeloSelecionado(payload);
    setShowModalSelos(true);
  };
  const mostrarDetalhesMensagem = (payload: NotaDeAgradecimento) => {
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
                  <Ionicons name="chevron-back" size={24} color="#111" />
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
              {perfil?.foto ? (
                <Image
                  source={{ uri: perfil.foto }}
                  style={styles.mainAvatar}
                />
              ) : (
                <View style={[styles.mainAvatar, styles.avatarVazio]}>
                  <Ionicons name="person" size={44} color="#999" />
                </View>
              )}
              <Text style={styles.userName}>
                {perfil?.nome ?? user?.name ?? "Motorista"}
              </Text>
              {perfil?.novo ? (
                <View style={styles.novoBadge}>
                  <Ionicons name="sparkles" size={14} color="#B07A00" />
                  <Text style={styles.novoBadgeText}>Novo usuário</Text>
                </View>
              ) : null}
            </View>

            {perfil ? (
              <>
                {/* STATS */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{perfil.corridas}</Text>
                    <Text style={styles.statLabel}>
                      {perfil.corridas === 1 ? "Corrida" : "Corridas"}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{tempo.valor}</Text>
                    <Text style={styles.statLabel}>{tempo.rotulo}</Text>
                  </View>
                </View>

                {/* RATING SECTION */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.evaluationTitle}>
                      Avaliação {textoDaNotaDoMotorista(perfil.nota)} ★
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDicasAvaliacao(true)}
                    >
                      <Text style={styles.linkText}>Como funciona {">"}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.subInfoText}>{textoDaMedia(perfil)}</Text>

                  {/* classificação da nota, com os limites definidos pela plataforma */}
                  <View
                    style={[
                      styles.faixaSelo,
                      {
                        backgroundColor: coresDaFaixa(perfil.faixa.chave).fundo,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faixaTitulo,
                        { color: coresDaFaixa(perfil.faixa.chave).texto },
                      ]}
                    >
                      Faixa: {perfil.faixa.titulo}
                    </Text>
                    <Text style={styles.faixaLimites}>
                      {textoDasFaixas(perfil.faixas)}
                    </Text>
                  </View>

                  {perfil.nota_base ? null : (
                    <View style={styles.ratingGraph}>
                      {[5, 4, 3, 2, 1].map((estrelas) => {
                        const quantidade = perfil.distribuicao[estrelas] ?? 0;

                        return (
                          <RatingRow
                            key={estrelas}
                            stars={estrelas}
                            count={quantidade}
                            percentage={larguraDaBarra(
                              quantidade,
                              totalDeAvaliacoes,
                            )}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* ELOGIOS QUE OS PASSAGEIROS MARCARAM */}
                {elogiosRecebidos.length > 0 ? (
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
                        {elogiosRecebidos.map((item) => (
                          <View key={item.chave} style={styles.badgeItem}>
                            <View style={styles.avatarWrapper}>
                              <TouchableOpacity
                                onPress={() => mostrarAvaliacaoPositiva(item)}
                              >
                                <View
                                  style={[
                                    styles.avatarBadge,
                                    styles.elogioIcone,
                                  ]}
                                >
                                  <Ionicons
                                    name="thumbs-up"
                                    size={28}
                                    color="#B07A00"
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
                ) : null}

                {/* SEÇÃO: NOTAS DE AGRADECIMENTO */}
                {perfil.notas_agradecimento.length > 0 ? (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        Notas de agradecimento
                      </Text>
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
                      {perfil.notas_agradecimento.map((item) => (
                        <View key={item.id} style={styles.noteCard}>
                          <TouchableOpacity
                            onPress={() => mostrarDetalhesMensagem(item)}
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
                ) : null}

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
                    {dicasAvaliacao.map((item) => (
                      <View key={item.id} style={styles.dicaCard}>
                        <Text style={styles.dicaTitle}>{item.titulo}</Text>
                        <Text style={styles.dicaSub}>{item.sub}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* CONQUISTAS */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Selos de conquistas</Text>
                  {perfil.selos.length === 0 ? (
                    <Text style={styles.vazioTexto}>
                      Finalize corridas e receba 5 estrelas para conquistar
                      selos.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScroll}
                    >
                      {perfil.selos.map((selo) => (
                        <View key={selo.chave} style={styles.conquestCard}>
                          <Ionicons
                            name={selo.icone as keyof typeof Ionicons.glyphMap}
                            size={40}
                            color="#FFB800"
                          />
                          <Text style={styles.conquestTitle}>
                            {selo.titulo}
                          </Text>
                          <Text style={styles.conquestSub}>
                            {selo.subtitulo}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
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
                  {perfil.verificacoes.map((verificacao) => (
                    <View
                      key={verificacao.chave}
                      style={styles.verificationRow}
                    >
                      <Ionicons
                        name={
                          verificacao.ok
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={20}
                        color={verificacao.ok ? "#28a745" : "#BBB"}
                      />
                      <Text
                        style={[
                          styles.verificationText,
                          !verificacao.ok && styles.verificacaoPendente,
                        ]}
                      >
                        {verificacao.titulo}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.carregandoPerfil}>
                {erro ? (
                  <Text style={styles.vazioTexto}>{erro}</Text>
                ) : (
                  <Carregando3D tamanho={36} cor="#FFB800" />
                )}
              </View>
            )}
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
          verificacoes={perfil?.verificacoes ?? []}
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
      </View>
    </>
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
  verificacaoPendente: { color: "#999" },
  faixaSelo: {
    alignSelf: "stretch",
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
  },
  faixaTitulo: { fontSize: 15, fontWeight: "700" },
  faixaLimites: { fontSize: 12, lineHeight: 17, color: "#666", marginTop: 4 },
  avatarVazio: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE",
  },
  novoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#FFF4D6",
  },
  novoBadgeText: { fontSize: 13, fontWeight: "600", color: "#B07A00" },
  elogioIcone: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4D6",
  },
  vazioTexto: { fontSize: 14, lineHeight: 20, color: "#777", marginTop: 6 },
  carregandoPerfil: { paddingVertical: 60, alignItems: "center" },
});
