// Navegação turn-by-turn no estilo 99 (banner de manobra, ponto no mapa com
// direção, velocímetro, ETA). Entra em cena depois do aceite para guiar até
// o embarque e volta a guiar até o destino quando a corrida é iniciada.
// Tudo abaixo funciona de verdade (rota real via Google Directions,
// posição/velocidade reais do GPS). Duas coisas do
// espelho do 99 ficaram de fora por dependerem de trabalho maior, sem ter
// pra onde "fingir" no frontend:
// - Voz guiando as manobras (precisa de TTS + lógica de quando anunciar).
// Paradas: em viagem o alvo é a próxima parada pendente e o botão vira
// "Confirmar parada" (POST confirmar-parada) até sobrar só o destino.
import BotaoChatPassageiro from "@/components/BotaoChatPassageiro";
import BotaoDeslizar from "@/components/BotaoDeslizar";
import MaisCorridaAtiva from "@/components/MaisCorridaAtiva";
import { enderecoCurto } from "@/domain/endereco";
import { Text } from "@/components/common/Texto";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
// CODEX: 391 linhas adicionadas e 157 removidas no diff atual; aceita posição e rota fixas do simulador. Remover após validação/commit.
import type {
  AcaoCorrida,
  PassageiroDaCorrida,
} from "@/components/CorridaEmAndamento";
import {
  anguloDaManobra,
  distanciaMetros,
  formatarDistancia,
  formatarHorario,
  type RotaNavegacao,
} from "@/domain/navegacao";
import { reputacaoPassageiro } from "@/domain/reputacaoPassageiro";
import type { Coordenada } from "@/domain/rotaDaCorrida";
import { useCarregamentoMapa } from "@/hooks/useCarregamentoMapa";
import type { ResultadoCancelamento } from "@/hooks/useDespachoMotorista";
import { useNavegacaoDaCorrida } from "@/hooks/useNavegacaoDaCorrida";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  status: "aceita" | "em_andamento";
  codigoCorrida: string;
  alvo: Coordenada | null;
  enderecoAlvo?: string | null;
  tipoAlvo?: "origem" | "parada" | "destino";
  totalParadas?: number;
  paradasPendentes?: number;
  categoria?: string | null;
  recusarNovas?: boolean;
  onAlternarRecusarNovas?: () => void;
  passageiro?: PassageiroDaCorrida | null;
  origem?: string | null;
  destino?: string | null;
  metodoPagamento?: string | null;
  minutos?: number | null;
  distanciaKm?: number | null;
  ocupado?: boolean;
  posicaoSimulada?: Coordenada | null;
  rotaSimulada?: RotaNavegacao | null;
  onAvancar: (acao: AcaoCorrida) => void;
  onCancelar: (motivo: string) => Promise<ResultadoCancelamento>;
  // conversa com o passageiro (ChatDaCorrida, aberto pela home)
  chatNaoLidas?: number;
  onAbrirChat?: () => void;
}

interface Passo {
  acao: AcaoCorrida;
  rotulo: string;
  cor: string;
  corTexto?: string;
}

function passoDaNavegacao(
  status: Props["status"],
  totalParadas: number,
  paradasPendentes: number,
): Passo {
  if (status === "aceita") {
    return { acao: "cheguei", rotulo: "Cheguei no embarque", cor: "#17A673" };
  }

  if (paradasPendentes > 0) {
    const atual = totalParadas - paradasPendentes + 1;
    return {
      acao: "confirmar-parada",
      rotulo:
        totalParadas > 1
          ? `Confirmar parada ${atual} de ${totalParadas}`
          : "Confirmar parada",
      cor: "#FFCB2F",
      corTexto: "#111111",
    };
  }

  return {
    acao: "finalizar",
    rotulo: "Finalizar corrida",
    cor: "#FFCB2F",
    corTexto: "#111111",
  };
}

const ROTULO_PAGAMENTO: Record<string, string> = {
  dinheiro: "dinheiro",
  cartao: "cartão",
  pix: "Pix",
};

const ZOOM_NAVEGACAO_ANDROID = 18;
const ALTITUDE_NAVEGACAO_IOS = 350;
const ZOOM_INICIAL_ANDROID = 16;
const ALTITUDE_INICIAL_IOS = 700;

// distância no traçado até achar o ponto mais próximo da posição atual —
// o resto da polyline (o que já foi percorrido) não é desenhado
function trecoRestante(polyline: Coordenada[], posicao: Coordenada | null) {
  if (!posicao || polyline.length < 2) return polyline;

  let indiceMaisProximo = 0;
  let menorDistancia = Infinity;

  polyline.forEach((ponto, indice) => {
    const d =
      (ponto.latitude - posicao.latitude) ** 2 +
      (ponto.longitude - posicao.longitude) ** 2;
    if (d < menorDistancia) {
      menorDistancia = d;
      indiceMaisProximo = indice;
    }
  });

  return polyline.slice(indiceMaisProximo);
}

export default function NavegacaoAtiva({
  status,
  codigoCorrida,
  alvo,
  enderecoAlvo,
  tipoAlvo = "destino",
  totalParadas = 0,
  paradasPendentes = 0,
  categoria,
  recusarNovas = false,
  onAlternarRecusarNovas,
  passageiro,
  origem,
  destino,
  metodoPagamento,
  minutos,
  distanciaKm,
  ocupado = false,
  posicaoSimulada = null,
  rotaSimulada = null,
  onAvancar,
  onCancelar,
  chatNaoLidas = 0,
  onAbrirChat,
}: Props) {
  const passo = passoDaNavegacao(status, totalParadas, paradasPendentes);
  const corDoAlvo = tipoAlvo === "origem" ? "#18C9A0" : "#FF7A2F";
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const mapaPronto = useRef(false);
  const {
    tentativa,
    demorando,
    aoPronto,
    aoCarregar,
    dispensar,
    tentarNovamente,
  } = useCarregamentoMapa();
  const primeiraPosicao = useRef(true);
  const ultimaPosicao = useRef<Coordenada | null>(null);
  const ultimoHeading = useRef(0);
  const [posicaoReal, setPosicaoReal] = useState<Coordenada | null>(null);
  const posicao = posicaoSimulada ?? posicaoReal;
  const [velocidadeKmh, setVelocidadeKmh] = useState<number | null>(null);
  // a folha varia de altura (contador de espera, chip de pagamento...), então
  // o velocímetro e os botões laterais acompanham a altura medida de verdade
  // em vez de um valor fixo — senão ou sobra vão embaixo da folha ou fica
  // um vão grande quando ela é mais baixa
  const [alturaCabecalho, setAlturaCabecalho] = useState(110);
  const [alturaConteudo, setAlturaConteudo] = useState(190);
  const pontosDaFolha = useMemo(() => {
    const limite = Math.max(alturaTela - insets.top - 96, 160);
    const recolhida = Math.min(alturaCabecalho + insets.bottom, limite - 1);
    return [
      recolhida,
      Math.min(
        Math.max(alturaCabecalho + alturaConteudo, recolhida + 1),
        limite,
      ),
    ];
  }, [alturaTela, insets.top, insets.bottom, alturaCabecalho, alturaConteudo]);
  const [indiceFolha, setIndiceFolha] = useState(1);
  const alturaFolha = pontosDaFolha[indiceFolha] ?? pontosDaFolha[1];
  const [navegando, setNavegando] = useState(false);
  const [maisVisivel, setMaisVisivel] = useState(false);
  const [segurancaVisivel, setSegurancaVisivel] = useState(false);

  const aoMudarFolha = useCallback(
    (indice: number) => setIndiceFolha(indice),
    [],
  );

  const { rota, passoAtual, distanciaAteManobra } = useNavegacaoDaCorrida(
    alvo,
    posicao,
    rotaSimulada,
  );

  const centralizarNavegacao = useCallback(
    (centro: Coordenada, direcao: number, duracao: number) => {
      mapRef.current?.animateCamera(
        {
          center: centro,
          heading: direcao,
          pitch: 55,
          zoom: ZOOM_NAVEGACAO_ANDROID,
          altitude: ALTITUDE_NAVEGACAO_IOS,
        },
        { duration: duracao },
      );
    },
    [],
  );

  const onMapReady = useCallback(() => {
    mapaPronto.current = true;
    aoPronto();
    const centro = posicaoSimulada ?? ultimaPosicao.current ?? alvo;

    if (centro) {
      centralizarNavegacao(centro, ultimoHeading.current, 0);
    }
  }, [alvo, centralizarNavegacao, aoPronto, posicaoSimulada]);

  const atualizarPosicaoReal = useCallback(
    (coordinate: Location.LocationObjectCoords) => {
      const nova = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      };
      ultimaPosicao.current = nova;
      setPosicaoReal(nova);
      // o onMapLoaded não chega em todo aparelho; receber a posição na camada
      // do mapa já prova que ele está desenhado (evita o aviso falso de
      // "O mapa está demorando a aparecer?")
      aoCarregar();

      if (typeof coordinate.heading === "number" && coordinate.heading >= 0) {
        ultimoHeading.current = coordinate.heading;
      }

      setVelocidadeKmh(
        typeof coordinate.speed === "number" && coordinate.speed >= 0
          ? coordinate.speed * 3.6
          : null,
      );

      if (mapaPronto.current) {
        centralizarNavegacao(
          nova,
          ultimoHeading.current,
          primeiraPosicao.current ? 0 : 600,
        );
        primeiraPosicao.current = false;
      }
    },
    [aoCarregar, centralizarNavegacao],
  );

  useEffect(() => {
    if (posicaoSimulada) return;

    let montado = true;
    let assinatura: Location.LocationSubscription | null = null;

    const iniciarAcompanhamento = async () => {
      try {
        const permissao = await Location.requestForegroundPermissionsAsync();
        if (!montado || permissao.status !== "granted") return;

        const ultima = await Location.getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 500,
        });
        if (ultima && montado) atualizarPosicaoReal(ultima.coords);

        assinatura = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3_000,
            distanceInterval: 5,
          },
          (localizacao) => {
            if (montado) atualizarPosicaoReal(localizacao.coords);
          },
        );
      } catch {
        // O mapa continua utilizável; a tela já mostra o aviso de carregamento
        // se não houver uma posição disponível para centralizar.
      }
    };

    void iniciarAcompanhamento();

    return () => {
      montado = false;
      assinatura?.remove();
    };
  }, [atualizarPosicaoReal, posicaoSimulada]);

  const polylineRestante = useMemo(
    () => trecoRestante(rota?.polyline ?? [], posicao),
    [rota, posicao],
  );

  // ETA proporcional ao que falta da rota: rota.duracao_s é da hora em que a
  // rota foi calculada e ficava parado enquanto a distância diminuía
  const fracaoRestante = useMemo(() => {
    const total = rota?.polyline?.length ?? 0;
    if (total < 2 || polylineRestante.length < 2) return 1;
    return Math.min(1, polylineRestante.length / total);
  }, [rota, polylineRestante]);

  // distância que ainda falta, medida na rota a partir da posição ao vivo —
  // rota.distancia_m é da hora em que a rota foi calculada (e vinha 0 perto
  // do embarque, mostrando "2 min · 0 m" com a manobra a 29 m)
  const distanciaTexto = useMemo(() => {
    let metros: number | null = null;

    if (polylineRestante.length >= 2) {
      metros = 0;
      for (let i = 1; i < polylineRestante.length; i++) {
        metros += distanciaMetros(polylineRestante[i - 1], polylineRestante[i]);
      }
    } else if (posicao && alvo) {
      metros = distanciaMetros(posicao, alvo);
    } else if (typeof distanciaKm === "number") {
      metros = distanciaKm * 1000;
    }

    return metros !== null ? formatarDistancia(metros) : "--";
  }, [polylineRestante, posicao, alvo, distanciaKm]);

  const minutosRestantes = useMemo(() => {
    // rota curtinha volta com duracao_s 0: ainda assim é "1 min", não "--"
    if (rota && typeof rota.duracao_s === "number") {
      return Math.max(1, Math.round((rota.duracao_s * fracaoRestante) / 60));
    }
    return typeof minutos === "number" ? minutos : null;
  }, [rota, minutos, fracaoRestante]);

  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const horarioChegada = useMemo(() => {
    if (minutosRestantes === null) return null;
    return formatarHorario(new Date(agora + minutosRestantes * 60_000));
  }, [agora, minutosRestantes]);

  const ligar = () => {
    if (!passageiro?.telefone) return;
    Linking.openURL(`tel:${passageiro.telefone.replace(/\D/g, "")}`);
  };

  // funcional: abre o compartilhamento nativo do aparelho com uma mensagem
  // real. FALTA pra chegar no nível do 99 (link de rastreamento ao vivo,
  // clicável, mostrando a corrida em tempo real pra quem recebe): um
  // endpoint público (sem login) que exponha a posição da corrida por um
  // token da própria corrida — isso ainda não existe no backend.
  const compartilhar = () => {
    void Share.share({
      message: `Estou a caminho na corrida ${codigoCorrida}. Acompanhe pelo app.`,
    });
  };

  const renderizarCabecalhoFolha = useCallback(
    () => (
      <View
        style={styles.cabecalhoFolhaArrastavel}
        onLayout={({ nativeEvent }) =>
          setAlturaCabecalho(Math.ceil(nativeEvent.layout.height))
        }
      >
        <View style={styles.puxador} />

        <View style={styles.resumoCabecalho}>
          <Ionicons name="chevron-down" size={26} color="#111" />
          <View style={styles.espacoMenuCorrida} />
          <View style={styles.resumoLinha}>
            <Text style={styles.resumoTexto}>
              {minutosRestantes !== null ? `${minutosRestantes} min` : "-- min"}
              {" · "}
              {distanciaTexto}
            </Text>

            <View style={styles.informacoesChegada}>
              {status === "em_andamento" && horarioChegada && (
                <View style={styles.avisoLimiteChegada}>
                  <Ionicons name="time-outline" size={16} color="#111" />
                  <Text style={styles.avisoLimiteChegadaTexto}>
                    Chegada prevista:
                    <Text style={styles.avisoLimiteChegadaTextoTempo}>
                      {` ` + horarioChegada}
                    </Text>
                  </Text>
                </View>
              )}
              {status === "aceita" && horarioChegada && (
                <View style={styles.avisoLimiteChegada}>
                  <Ionicons name="time-outline" size={16} color="#111" />
                  <Text style={styles.avisoLimiteChegadaTexto}>
                    Chegue antes de:
                    <Text style={styles.avisoLimiteChegadaTextoTempo}>
                      {` ` + horarioChegada}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.botaoMenuCorrida}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Abrir mais opções da corrida"
            onPress={() => setMaisVisivel(true)}
          >
            <Ionicons name="menu" size={24} color="#222" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [distanciaTexto, horarioChegada, minutosRestantes, status],
  );

  // funcional: mostra os telefones de emergência reais. FALTA pra chegar no
  // nível do 99 (gravação da corrida, notificar contato de confiança com a
  // localização ao vivo): infraestrutura de gravação/consentimento e o
  // mesmo endpoint público de rastreamento citado acima em compartilhar().
  const ligarEmergencia = (numero: string) => {
    setSegurancaVisivel(false);
    void Linking.openURL(`tel:${numero}`);
  };

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <MapView
        key={tentativa}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialCamera={
          (posicaoSimulada ?? alvo)
            ? {
                center: posicaoSimulada ?? alvo!,
                heading: 0,
                pitch: 0,
                zoom: ZOOM_INICIAL_ANDROID,
                altitude: ALTITUDE_INICIAL_IOS,
              }
            : undefined
        }
        userInterfaceStyle="light"
        showsCompass={false}
        // Não usar showsUserLocation/onUserLocationChange: em Android/Fabric
        // o Maps pode emitir topUserLocationChange, evento não registrado pelo
        // Expo Go. A localização é acompanhada pelo expo-location acima.
        showsUserLocation={false}
        followsUserLocation={false}
        showsMyLocationButton={false}
        onMapReady={onMapReady}
        onMapLoaded={aoCarregar}
      >
        {polylineRestante.length > 1 && (
          <Polyline
            coordinates={polylineRestante}
            strokeColor="#17A673"
            strokeWidth={6}
          />
        )}
        {alvo && (
          <Marker coordinate={alvo} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.marcadorAlvo, { backgroundColor: corDoAlvo }]}>
              <Ionicons
                name={tipoAlvo === "origem" ? "arrow-up" : "arrow-down"}
                size={16}
                color="#FFF"
              />
            </View>
          </Marker>
        )}
        {posicao && (
          <Marker
            coordinate={posicao}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={ultimoHeading.current}
            tracksViewChanges={false}
          >
            <View style={styles.marcadorMotoristaSimulado}>
              <Ionicons name="navigate" size={17} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* TOPO: manobra e próximo ponto no mesmo cartão, como no 99 */}
      <View style={[styles.topo, { top: insets.top + 10 }]}>
        <View style={styles.cartaoTopo}>
          {navegando && passoAtual && (
            <>
              <TouchableOpacity
                style={styles.manobra}
                onPress={() => setNavegando(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Ocultar instruções de navegação"
              >
                <Ionicons
                  name="arrow-up"
                  size={44}
                  color="#FFF"
                  style={{
                    transform: [
                      { rotate: `${anguloDaManobra(passoAtual.manobra)}deg` },
                    ],
                  }}
                />
                <View style={styles.bannerTextos}>
                  <Text style={styles.bannerDistancia}>
                    {formatarDistancia(
                      distanciaAteManobra ?? passoAtual.distancia_m,
                    )}
                  </Text>
                  <Text numberOfLines={1} style={styles.bannerRua}>
                    {passoAtual.rua ?? passoAtual.instrucao}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.cartaoDivisor} />
            </>
          )}

          <TouchableOpacity
            style={styles.alvoLinha}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              navegando ? "Ocultar navegação" : "Iniciar navegação"
            }
            onPress={() => setNavegando((atual) => !atual)}
          >
            <View style={[styles.pontoCor, { backgroundColor: corDoAlvo }]} />
            <Text numberOfLines={1} style={styles.alvoTexto}>
              {tipoAlvo === "parada" && (
                <Text style={styles.alvoRotulo}>Parada · </Text>
              )}
              {enderecoAlvo
                ? enderecoCurto(enderecoAlvo)
                : "Carregando endereço..."}
            </Text>
            {!navegando && (
              <View style={styles.irBotao}>
                <Ionicons name="navigate" size={14} color="#111" />
                <Text style={styles.irTexto}>Ir</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {demorando && (
          <View style={styles.avisoMapa} accessibilityRole="alert">
            <Text style={styles.avisoMapaTexto}>
              O mapa está demorando a aparecer?
            </Text>
            <View style={styles.avisoMapaAcoes}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.avisoMapaBotao}
                onPress={() => {
                  mapaPronto.current = false;
                  tentarNovamente();
                }}
              >
                <Text style={styles.avisoMapaLink}>Tentar novamente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.avisoMapaBotao}
                onPress={dispensar}
              >
                <Text style={styles.avisoMapaLink}>Já apareceu</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* velocímetro */}
      <View style={[styles.velocidade, { bottom: alturaFolha + 84 }]}>
        <Text style={styles.velocidadeValor}>
          {velocidadeKmh !== null ? Math.round(velocidadeKmh) : "--"}
        </Text>
        <Text style={styles.velocidadeUnidade}>km/h</Text>
      </View>

      {/* segurança + compartilhar, na pílula do 99 */}
      <View style={[styles.pilulaCompartilhar, { bottom: alturaFolha + 12 }]}>
        <TouchableOpacity
          style={styles.pilulaSeguranca}
          accessibilityRole="button"
          accessibilityLabel="Segurança"
          onPress={() => setSegurancaVisivel(true)}
        >
          <Ionicons name="shield-checkmark" size={24} color="#2F6BFF" />
          <Text style={styles.pilulaCompartilharTexto}>
            Compartilhe com{"\n"}amigos e família
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoCompartilhar}
          accessibilityRole="button"
          onPress={compartilhar}
        >
          <Text style={styles.botaoCompartilharTexto}>Compartilhar</Text>
        </TouchableOpacity>
      </View>

      {/* FOLHA INFERIOR */}
      <BottomSheet
        index={1}
        topInset={insets.top}
        snapPoints={pontosDaFolha}
        animateOnMount={false}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableHandlePanningGesture={status === "aceita"}
        enableContentPanningGesture={false}
        onChange={aoMudarFolha}
        backgroundStyle={styles.folhaFundo}
        handleComponent={renderizarCabecalhoFolha}
      >
        <BottomSheetScrollView
          onContentSizeChange={(_, altura) =>
            setAlturaConteudo(Math.ceil(altura))
          }
          style={{ opacity: indiceFolha === 0 ? 0 : 1 }}
          pointerEvents={indiceFolha === 0 ? "none" : "auto"}
          accessibilityElementsHidden={indiceFolha === 0}
          importantForAccessibility={
            indiceFolha === 0 ? "no-hide-descendants" : "auto"
          }
          bounces={false}
          contentContainerStyle={[
            styles.folhaConteudo,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {metodoPagamento && (
            <View style={styles.chipPagamento}>
              <Ionicons name="cash" size={20} color="#1959B3" />
              <Text style={styles.chipPagamentoTexto}>
                Corrida em{" "}
                {ROTULO_PAGAMENTO[metodoPagamento] ?? metodoPagamento}
              </Text>
            </View>
          )}

          <View style={styles.separador} />

          <View style={styles.linhaPassageiro}>
            {passageiro?.foto && !passageiro.foto_oculta ? (
              <Image source={{ uri: passageiro.foto }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarVazio,
                  passageiro?.foto_oculta && styles.avatarProtegido,
                ]}
              >
                <Feather name="user" size={20} color="#888" />
              </View>
            )}

            <View style={styles.passageiroBloco}>
              <Text style={styles.passageiroNome}>
                {passageiro?.nome ?? "Passageiro"}
              </Text>
              <Text style={styles.passageiroApoio}>
                {reputacaoPassageiro(passageiro?.nota, passageiro?.corridas)}
                {passageiro?.solicitante
                  ? ` · Pedido por ${passageiro.solicitante}`
                  : ""}
              </Text>
            </View>

            {onAbrirChat ? (
              <BotaoChatPassageiro
                naoLidas={chatNaoLidas}
                onPress={onAbrirChat}
                estilo={styles.botaoLigar}
              />
            ) : null}
            {passageiro?.telefone ? (
              <TouchableOpacity
                style={styles.botaoLigar}
                onPress={ligar}
                accessibilityRole="button"
                accessibilityLabel="Ligar para o passageiro"
              >
                <Feather name="phone" size={20} color="#000" />
              </TouchableOpacity>
            ) : null}
          </View>

          <BotaoDeslizar
            rotulo={passo.rotulo}
            cor={passo.cor}
            corTexto={passo.corTexto}
            desabilitado={ocupado}
            onConfirmar={() => onAvancar(passo.acao)}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      <MaisCorridaAtiva
        visible={maisVisivel}
        passageiro={passageiro}
        origem={origem}
        destino={destino}
        categoria={categoria}
        ocupado={ocupado}
        podeCancelar={status === "aceita"}
        recusarNovas={recusarNovas}
        onAlternarRecusarNovas={onAlternarRecusarNovas}
        onClose={() => setMaisVisivel(false)}
        onCancelar={onCancelar}
      />

      {/* funcional: liga para os números de emergência reais e compartilha a
          corrida. FALTA para o nível do 99 (gravação de áudio, contato de
          confiança com localização ao vivo): infraestrutura de gravação e
          um endpoint público de rastreamento da corrida. */}
      <Modal
        visible={segurancaVisivel}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSegurancaVisivel(false)}
      >
        <Pressable
          style={styles.segurancaFundo}
          onPress={() => setSegurancaVisivel(false)}
        />
        <View
          style={[
            styles.segurancaFolha,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <Text style={styles.segurancaTitulo}>Segurança</Text>
          {[
            {
              icone: "call" as const,
              cor: "#E5484D",
              texto: "Ligar 190 · Polícia",
              acao: () => ligarEmergencia("190"),
            },
            {
              icone: "medkit" as const,
              cor: "#F97316",
              texto: "Ligar 192 · SAMU",
              acao: () => ligarEmergencia("192"),
            },
            {
              icone: "share-social" as const,
              cor: "#2F6BFF",
              texto: "Compartilhar corrida",
              acao: () => {
                setSegurancaVisivel(false);
                compartilhar();
              },
            },
          ].map((opcao) => (
            <TouchableOpacity
              key={opcao.texto}
              style={styles.segurancaLinha}
              accessibilityRole="button"
              onPress={opcao.acao}
            >
              <View
                style={[styles.segurancaIcone, { backgroundColor: opcao.cor }]}
              >
                <Ionicons name={opcao.icone} size={18} color="#FFF" />
              </View>
              <Text style={styles.segurancaTexto}>{opcao.texto}</Text>
              <Ionicons name="chevron-forward" size={18} color="#AAA" />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avisoMapa: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  avisoMapaTexto: { color: "#333", fontSize: 14, fontWeight: "600" },
  avisoMapaAcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  avisoMapaBotao: { minHeight: 44, justifyContent: "center" },
  avisoMapaLink: { color: "#1959B3", fontSize: 14, fontWeight: "600" },
  // cobre o mapa/menu de fora por cima: sem isso o TopMenu e os botões do
  // Map por trás (zIndex até 30) apareciam por cima da navegação
  tela: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#E5E3DF",
    zIndex: 100,
    elevation: 100,
  },
  topo: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 8,
  },
  cartaoTopo: {
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  manobra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
  },
  bannerTextos: { flex: 1 },
  bannerDistancia: { color: "#FFF", fontSize: 32, fontWeight: "800" },
  bannerRua: { color: "#FFF", fontSize: 18, fontWeight: "500", marginTop: 2 },
  cartaoDivisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  alvoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 50,
  },
  alvoTexto: { flex: 1, color: "#FFF", fontSize: 15, fontWeight: "500" },
  alvoRotulo: { color: "#FFB27A", fontWeight: "700" },
  irBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    backgroundColor: "#FFD600",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  irTexto: { color: "#111", fontSize: 14, fontWeight: "700" },
  pontoCor: { width: 9, height: 9, borderRadius: 5 },
  // mesmos ícones da tela Mais: embarque ↑ verde-água, parada/destino ↓ laranja
  marcadorAlvo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  marcadorMotoristaSimulado: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    elevation: 5,
  },
  avisoLimiteChegada: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  avisoLimiteChegadaTexto: {
    color: "#111",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  avisoLimiteChegadaTextoTempo: {
    color: "#C2410C",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  velocidade: {
    position: "absolute",
    left: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  velocidadeValor: { color: "#111", fontSize: 20, fontWeight: "800" },
  velocidadeUnidade: { color: "#333", fontSize: 10, fontWeight: "600" },
  pilulaCompartilhar: {
    position: "absolute",
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "#FFF",
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  pilulaSeguranca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  pilulaCompartilharTexto: { color: "#1959B3", fontSize: 13, lineHeight: 17 },
  botaoCompartilhar: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 12,
  },
  botaoCompartilharTexto: { color: "#1959B3", fontSize: 14, fontWeight: "700" },
  segurancaFundo: { flex: 1, backgroundColor: "rgba(16,24,32,0.55)" },
  segurancaFolha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 4,
  },
  segurancaTitulo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  segurancaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
  },
  segurancaIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  segurancaTexto: { flex: 1, fontSize: 16, color: "#111" },
  folhaFundo: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 10,
  },
  folhaConteudo: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cabecalhoFolhaArrastavel: {
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 6,
  },
  resumoCabecalho: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  espacoMenuCorrida: { width: 20, height: 42 },
  botaoMenuCorrida: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  puxador: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDD",
  },
  resumoLinha: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  resumoTexto: {
    color: "#000",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  informacoesChegada: {
    flexDirection: "column",
    alignItems: "center",
  },
  chipPagamento: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF2FE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chipPagamentoTexto: {
    flexShrink: 1,
    color: "#1959B3",
    fontSize: 17,
    fontWeight: "600",
  },
  separador: { height: 1, backgroundColor: "#EEE" },
  linhaPassageiro: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarVazio: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarProtegido: { opacity: 0.55, backgroundColor: "#D8D8D8" },
  passageiroBloco: { flex: 1, minWidth: 0 },
  passageiroNome: { fontSize: 16, fontWeight: "600", color: "#000" },
  passageiroApoio: { fontSize: 13, color: "#777", marginTop: 2 },
  botaoLigar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
});
