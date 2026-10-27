import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { enderecoCurto } from "@/domain/endereco";
import {
  emDistancia,
  minutosEstimados,
  valoresSugeridos,
} from "@/domain/negocia";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RecebendoChamadaProps {
  onAceitar: () => void;
  onRecusar: () => void;
  // se o tempo acabar sem resposta; sem isso o fim do tempo conta como recusa
  onExpirar?: () => void;
  // Negocia: aceitar é mandar proposta pela oferta (sem valor) ou por outro valor
  negociavel?: boolean;
  onPropor?: (valorMotorista?: number) => void;
  valor?: number;
  distanciaAteOrigem?: number;
  distanciaDaCorrida?: number;
  origem?: string;
  destino?: string | null;
  paradas?: number;
  paraOutraPessoa?: boolean;
  categoria?: string | null;
  metodoPagamento?: string | null;
  notaPassageiro?: number | null;
  corridasPassageiro?: number;
  // viagem compartilhada: vários embarques numa viagem só, valor da viagem inteira
  compartilhada?: {
    passageiros: number;
    embarques: number;
    bonus_percentual: number;
  } | null;
  // Negocia: o lápis abre o valor livre (OfertaNegociaMotorista)
  onEditarValor?: () => void;
  // altura do card, para o mapa enquadrar a rota acima dele
  onAlturaChange?: (altura: number) => void;
}

const ICONE_PAGAMENTO: Record<
  string,
  {
    nome: React.ComponentProps<typeof Ionicons>["name"];
    cor: string;
    rotulo: string;
  }
> = {
  dinheiro: { nome: "cash-outline", cor: "#21C987", rotulo: "Dinheiro" },
  pix: { nome: "qr-code-outline", cor: "#32BCAD", rotulo: "Pix" },
  cartao: { nome: "card-outline", cor: "#3488E8", rotulo: "Cartão" },
  // compartilhada: cada passageiro paga do seu jeito
  varios: { nome: "wallet-outline", cor: "#9CA3AF", rotulo: "Vários" },
};

const DURACAO_OFERTA_MS = 20_000;
const VIRADA_MS = 180;
const CONFIRMACAO_MS = 260;

const silenciar = (player: AudioPlayer | null) => {
  if (!player) return;

  try {
    player.loop = false;
  } catch {}

  try {
    player.pause();
  } catch {}

  try {
    player.remove();
  } catch {}
};

export default function RecebendoChamadas({
  onAceitar,
  onRecusar,
  onExpirar,
  negociavel = false,
  onPropor,
  valor = 8.2,
  distanciaAteOrigem,
  distanciaDaCorrida,
  origem,
  destino,
  paradas = 0,
  paraOutraPessoa = false,
  categoria,
  metodoPagamento,
  notaPassageiro,
  corridasPassageiro = 0,
  compartilhada,
  onEditarValor,
  onAlturaChange,
}: RecebendoChamadaProps) {
  const insets = useSafeAreaInsets();
  const pagamento =
    ICONE_PAGAMENTO[metodoPagamento ?? "dinheiro"] ?? ICONE_PAGAMENTO.dinheiro;
  const playerRef = useRef<AudioPlayer | null>(null);
  const onExpirarRef = useRef(onExpirar ?? onRecusar);

  useEffect(() => {
    onExpirarRef.current = onExpirar ?? onRecusar;
  }, [onExpirar, onRecusar]);
  const [progress] = useState(() => new Animated.Value(1));
  const entrada = useSharedValue(0);
  const virada = useSharedValue(0);
  const confirmacao = useSharedValue(0);
  const confirmando = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    entrada.set(withSpring(1, { damping: 15, stiffness: 120, mass: 0.9 }));
  }, [entrada]);

  const estiloDoCartao = useAnimatedStyle(() => ({
    opacity: interpolate(entrada.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [
      { perspective: 900 },
      { translateY: (1 - entrada.value) * 70 },
      { rotateX: `${(1 - entrada.value) * 50}deg` },
      { rotateY: `${virada.value * 90}deg` },
    ],
  }));

  const estiloDoVerso = useAnimatedStyle(() => ({
    opacity: confirmacao.value > 0 ? 1 : 0,
    transform: [
      { perspective: 900 },
      { rotateY: `${(1 - confirmacao.value) * -90}deg` },
      { scale: 0.94 + confirmacao.value * 0.06 },
    ],
  }));
  const closedRef = useRef(false); // evita múltiplas chamadas de fechamento

  useEffect(() => {
    // O React remonta efeitos em desenvolvimento. Reiniciar estas refs evita
    // que a limpeza da primeira montagem deixe a oferta aberta para sempre.
    closedRef.current = false;
    progress.stopAnimation();
    progress.setValue(1);

    // anima barra
    const animacao = Animated.timing(progress, {
      toValue: 0,
      duration: DURACAO_OFERTA_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animacao.start();

    // 🔹 O loop de pulsação agora é gerido pelo componente PulseOverlay,
    // então removemos a lógica de `pulseAnimationRef` daqui.

    let player: AudioPlayer | null = null;

    try {
      player = createAudioPlayer(require("../../assets/toque-chamada.mp3"));
      playerRef.current = player;

      // o toque é curto: repete enquanto a chamada estiver na tela
      player.loop = true;
      player.play();
    } catch {}

    // quem fecha a chamada é o tempo da barra, não o fim do som
    const expiracao = setTimeout(() => {
      if (closedRef.current) return;

      closedRef.current = true;

      silenciar(player);
      if (playerRef.current === player) playerRef.current = null;

      try {
        onExpirarRef.current();
      } catch {}
    }, DURACAO_OFERTA_MS);

    // cleanup do effect
    return () => {
      closedRef.current = true;
      clearTimeout(expiracao);
      if (confirmando.current) clearTimeout(confirmando.current);
      animacao.stop();

      silenciar(player); // para e descarrega o player
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [progress]);

  const pararSom = () => {
    silenciar(playerRef.current);
    playerRef.current = null;
  };

  // função centralizada para fechar + parar/descarregar com proteção
  const closeAndUnload = () => {
    if (closedRef.current) return;
    closedRef.current = true;

    try {
      onRecusar(); // fecha o card
    } catch {
      // ignore callback errors
    }

    pararSom();
  };

  const acceptAndUnload = (valorProposto?: number) => {
    if (closedRef.current) return;
    closedRef.current = true;

    pararSom();
    progress.stopAnimation();

    virada.set(withTiming(1, { duration: VIRADA_MS }));
    confirmacao.set(
      withDelay(VIRADA_MS, withTiming(1, { duration: CONFIRMACAO_MS })),
    );

    confirmando.current = setTimeout(
      () => {
        try {
          if (negociavel && onPropor) onPropor(valorProposto);
          else onAceitar();
        } catch {
          // swallow
        }
      },
      VIRADA_MS + CONFIRMACAO_MS + 120,
    );
  };

  // o X da tela: no Negocia só some (não conta como recusa); na corrida
  // normal é a recusa de sempre
  const dispensar = () => {
    if (closedRef.current) return;
    closedRef.current = true;

    try {
      onExpirarRef.current();
    } catch {}

    pararSom();
  };

  // o tempo da chamada: a parte clara do topo e a barra encolhem juntas
  const larguraDoTempo = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const emReais = (valorEmReais: number) =>
    `R$${valorEmReais.toFixed(2).replace(".", ",")}`;

  const valorPorKm =
    typeof distanciaDaCorrida === "number" && distanciaDaCorrida > 0
      ? `${emReais(valor / distanciaDaCorrida)}/km`
      : null;
  const ateEmbarque =
    typeof distanciaAteOrigem === "number"
      ? `${minutosEstimados(distanciaAteOrigem)} min (${emDistancia(distanciaAteOrigem)})`
      : "Embarque";
  const viagem =
    typeof distanciaDaCorrida === "number"
      ? `${minutosEstimados(distanciaDaCorrida)} min (${emDistancia(distanciaDaCorrida)})`
      : "Destino";
  const enderecoPartida = origem
    ? enderecoCurto(origem)
    : "Endereço de partida";
  const enderecoDestino = destino
    ? enderecoCurto(destino)
    : "Endereço de destino";
  const reputacao = [
    typeof notaPassageiro === "number"
      ? notaPassageiro.toFixed(2).replace(".", ",")
      : null,
    corridasPassageiro === 0
      ? "Passageiro novo"
      : `${corridasPassageiro} ${corridasPassageiro === 1 ? "corrida" : "corridas"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const sugestoes = negociavel ? valoresSugeridos(valor) : [];
  const titulo = [categoria ?? (negociavel ? "Negocia" : "Corrida")]
    .concat(negociavel ? [pagamento.rotulo] : [])
    .join(" · ");

  const conteudo = (
    <>
      <View style={[styles.topo, !negociavel && styles.topoCentralizado]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.tempoFundo, { width: larguraDoTempo }]}
        />
        {negociavel ? (
          <View style={styles.chip}>
            <Text style={styles.chipTexto}>{titulo}</Text>
          </View>
        ) : (
          <Text style={styles.tituloCentral}>{titulo}</Text>
        )}
        <Text style={styles.valor}>{emReais(valor)}</Text>
        {valorPorKm ? (
          <Text style={[styles.valorKm, !negociavel && styles.valorKmDestaque]}>
            {/* no grupo o valor é da viagem inteira, não de um passageiro */}
            {compartilhada ? `pela viagem toda · ${valorPorKm}` : valorPorKm}
          </Text>
        ) : null}
        {!negociavel ? (
          <View style={styles.chipsLinha}>
            {compartilhada ? (
              <View style={styles.chipCompartilhada}>
                <Ionicons name="people" size={15} color="#111" />
                <Text style={styles.chipCompartilhadaTexto}>
                  {`${compartilhada.embarques} embarques`}
                  {compartilhada.bonus_percentual > 0
                    ? ` · +${compartilhada.bonus_percentual}% bônus`
                    : ""}
                </Text>
              </View>
            ) : null}
            <View style={styles.chipPagamento}>
              <Ionicons name={pagamento.nome} size={15} color={pagamento.cor} />
              <Text style={styles.chipPagamentoTexto}>{pagamento.rotulo}</Text>
            </View>
          </View>
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tempoBarra,
            negociavel ? styles.tempoBarraNegocia : styles.tempoBarraNormal,
            { width: larguraDoTempo },
          ]}
        />
      </View>

      <View style={styles.corpo}>
        <View style={styles.reputacao}>
          <Ionicons name="person-circle" size={18} color="#E8E8E8" />
          <Text style={styles.reputacaoTexto}>{reputacao}</Text>
        </View>

        <View style={styles.separador} />

        <View style={styles.ponto}>
          <View style={[styles.icone, styles.iconeEmbarque]}>
            <Ionicons name="arrow-up" size={13} color="#FFF" />
          </View>
          <View style={styles.pontoTextos}>
            <Text style={styles.pontoTempo}>{ateEmbarque}</Text>
            <Text style={styles.pontoEndereco} numberOfLines={2}>
              {enderecoPartida}
            </Text>
          </View>
        </View>

        <View style={styles.ponto}>
          <View style={[styles.icone, styles.iconeDestino]}>
            <Ionicons name="arrow-down" size={13} color="#FFF" />
          </View>
          <View style={styles.pontoTextos}>
            <Text style={styles.pontoTempo}>
              {viagem}
              {compartilhada
                ? ` · ${compartilhada.passageiros} passageiros`
                : paradas > 0
                  ? ` · ${paradas} ${paradas === 1 ? "parada" : "paradas"}`
                  : ""}
            </Text>
            <Text style={styles.pontoEndereco} numberOfLines={2}>
              {enderecoDestino}
            </Text>
            {paraOutraPessoa ? (
              <Text style={styles.paraOutraPessoa}>
                Corrida para outra pessoa
              </Text>
            ) : null}
          </View>
        </View>

        {negociavel ? (
          <>
            <TouchableOpacity
              style={styles.aceitar}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() => acceptAndUnload()}
            >
              <Text style={styles.aceitarTexto}>
                {`Aceitar por ${emReais(valor)}`}
              </Text>
            </TouchableOpacity>
            <View style={styles.sugestoes}>
              {sugestoes.map((sugerido) => (
                <TouchableOpacity
                  key={sugerido}
                  style={styles.sugestao}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Propor ${emReais(sugerido)}`}
                  onPress={() => acceptAndUnload(sugerido)}
                >
                  <Text style={styles.sugestaoTexto}>{emReais(sugerido)}</Text>
                </TouchableOpacity>
              ))}
              {onEditarValor ? (
                <TouchableOpacity
                  style={[styles.sugestao, styles.editar]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Propor outro valor"
                  onPress={onEditarValor}
                >
                  <Ionicons name="pencil" size={20} color="#FFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.overlay,
        // o cartão não encosta na barra de gestos do Android
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[
          styles.fechar,
          negociavel ? styles.fecharNegocia : styles.fecharNormal,
          { top: insets.top + 12 },
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          negociavel
            ? "Fechar a chamada, não afeta a taxa de aceitação"
            : "Recusar a chamada"
        }
        onPress={negociavel ? dispensar : closeAndUnload}
      >
        <Ionicons name="close" size={negociavel ? 20 : 26} color="#FFF" />
        {negociavel ? (
          <Text style={styles.fecharTexto}>Não afeta a TA</Text>
        ) : null}
      </TouchableOpacity>

      <View
        style={styles.cardArea}
        onLayout={({ nativeEvent }) =>
          onAlturaChange?.(
            nativeEvent.layout.height + Math.max(insets.bottom, 12) + 8,
          )
        }
      >
        <View>
          <Reanimated.View style={estiloDoCartao}>
            {negociavel ? (
              <View style={styles.card}>{conteudo}</View>
            ) : (
              // corrida normal: o card inteiro é o botão de aceitar, como no 99
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={`Aceitar corrida de ${emReais(valor)}`}
                accessibilityHint="Toque no cartão para aceitar"
                onPress={() => acceptAndUnload()}
              >
                {conteudo}
              </TouchableOpacity>
            )}
          </Reanimated.View>
          <Reanimated.View
            pointerEvents="none"
            style={[styles.verso, estiloDoVerso]}
          >
            <View style={styles.versoIcone}>
              <Ionicons name="checkmark" size={38} color="#111" />
            </View>
            <Text style={styles.versoTexto}>
              {negociavel ? "Proposta enviada" : "Corrida aceita"}
            </Text>
          </Reanimated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 9999,
  },
  fechar: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1F1F1F",
    elevation: 6,
  },
  fecharNormal: { width: 52, height: 52, borderRadius: 26 },
  fecharNegocia: { height: 44, borderRadius: 22, paddingHorizontal: 16 },
  fecharTexto: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  cardArea: { paddingHorizontal: 12 },
  verso: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#FFD400",
  },
  versoIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  versoTexto: { color: "#111", fontSize: 22, fontWeight: "800" },
  card: {
    backgroundColor: "#1F1F1F",
    borderRadius: 16,
    overflow: "hidden",
  },
  topo: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: "flex-start",
    backgroundColor: "#1F1F1F",
  },
  topoCentralizado: { alignItems: "center" },
  tempoFundo: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#353535",
  },
  tempoBarra: { position: "absolute", left: 0, bottom: 0, height: 5 },
  tempoBarraNormal: { backgroundColor: "#FFD400" },
  tempoBarraNegocia: { backgroundColor: "#12A150" },
  chip: {
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  chipTexto: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  tituloCentral: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 2,
  },
  valor: { color: "#FFF", fontSize: 44, fontWeight: "700", lineHeight: 52 },
  valorKm: { color: "#BDBDBD", fontSize: 15, marginTop: 2 },
  valorKmDestaque: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  chipPagamento: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  chipPagamentoTexto: { color: "#F5C542", fontSize: 14, fontWeight: "600" },
  chipsLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chipCompartilhada: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#F5C542",
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  chipCompartilhadaTexto: { color: "#111", fontSize: 14, fontWeight: "700" },
  corpo: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  reputacao: { flexDirection: "row", alignItems: "center", gap: 8 },
  reputacaoTexto: { color: "#FFF", fontSize: 16 },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#4A4A4A",
    marginVertical: 12,
  },
  ponto: { flexDirection: "row", gap: 10, marginBottom: 10 },
  icone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  iconeEmbarque: { backgroundColor: "#17C08A" },
  iconeDestino: { backgroundColor: "#F2662F" },
  pontoTextos: { flex: 1 },
  pontoTempo: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  pontoEndereco: { color: "#DADADA", fontSize: 16, lineHeight: 21 },
  paraOutraPessoa: {
    color: "#FBC02D",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  aceitar: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#FFD400",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  aceitarTexto: { color: "#111", fontSize: 17, fontWeight: "600" },
  sugestoes: { flexDirection: "row", gap: 8, marginTop: 10 },
  sugestao: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#3A3A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  sugestaoTexto: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  editar: { flex: 0, width: 64 },
});
