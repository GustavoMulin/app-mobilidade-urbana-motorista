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
import NegociarChamada from "./NegociarChamada";

interface RecebendoChamadaProps {
  onAceitar: () => void;
  onRecusar: () => void;
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
};

const DURACAO_OFERTA_MS = 20_000;

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
}: RecebendoChamadaProps) {
  const pagamento =
    ICONE_PAGAMENTO[metodoPagamento ?? "dinheiro"] ?? ICONE_PAGAMENTO.dinheiro;
  const playerRef = useRef<AudioPlayer | null>(null);
  const onRecusarRef = useRef(onRecusar);

  useEffect(() => {
    onRecusarRef.current = onRecusar;
  }, [onRecusar]);
  const [progress] = useState(() => new Animated.Value(1));
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
        onRecusarRef.current();
      } catch {}
    }, DURACAO_OFERTA_MS);

    // cleanup do effect
    return () => {
      closedRef.current = true;
      clearTimeout(expiracao);
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
    // chamado ao aceitar
    if (!closedRef.current) closedRef.current = true;

    try {
      if (negociavel && onPropor) onPropor(valorProposto);
      else onAceitar();
    } catch {
      // swallow
    }

    pararSom();
  };

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const emKm = (valorEmKm?: number) =>
    typeof valorEmKm === "number"
      ? `${valorEmKm.toFixed(1).replace(".", ",")} km`
      : "—";

  const emReais = (valorEmReais: number) =>
    `R$ ${valorEmReais.toFixed(2).replace(".", ",")}`;

  const distanciaAteVoce = emKm(distanciaAteOrigem);
  const distanciaViagem = emKm(distanciaDaCorrida);
  const enderecoPartida = origem
    ? enderecoCurto(origem)
    : "Endereço de partida";
  const enderecoDestino = destino
    ? enderecoCurto(destino)
    : "Endereço de destino";

  return (
    <View style={styles.overlay}>
      {/* O card é um View normal, o pulso será um overlay interno */}
      <View style={styles.card}>
        <View style={styles.progressContainer}>
          <Animated.View
            style={[styles.progressBar, { width: widthInterpolated }]}
          />
        </View>

        {categoria ? (
          <View style={styles.categoriaChip}>
            <Text style={styles.categoriaTexto}>{categoria}</Text>
          </View>
        ) : null}

        <View style={styles.valorContainer}>
          <Text style={styles.valorText}>{emReais(valor)}</Text>
        </View>

        <View style={styles.infoPagamento}>
          <View
            style={[styles.iconPagamento, { backgroundColor: pagamento.cor }]}
            accessibilityLabel={`Pagamento: ${pagamento.rotulo}`}
          >
            <Ionicons name={pagamento.nome} size={18} color="#fff" />
          </View>
          <Text className="ml-2 mt-1" style={styles.topText}>
            {pagamento.rotulo}
          </Text>
        </View>

        <View style={styles.perfilInfoContainer}>
          {typeof notaPassageiro === "number" ? (
            <>
              <View style={styles.infoItem}>
                <Ionicons
                  className="ml-4"
                  name="star"
                  size={20}
                  color="#FFD700"
                />
                <Text className="ml-2 font-bold" style={styles.infoText}>
                  {notaPassageiro.toFixed(2).replace(".", ",")}
                </Text>
              </View>

              <Text style={styles.dot}>•</Text>
            </>
          ) : null}

          <View style={styles.infoItem}>
            <Text className="font-bold" style={styles.infoText}>
              {corridasPassageiro === 0
                ? "Passageiro novo"
                : `${corridasPassageiro} ${corridasPassageiro === 1 ? "corrida" : "corridas"}`}
            </Text>
          </View>
        </View>

        <View style={styles.separador} />

        {/* INFO: tempo / distância / endereços */}
        <View style={styles.infoContainer}>
          {/* ✅ Row com o badge ao lado do tempo */}
          <View style={styles.infoRow}>
            <View style={[styles.badge, styles.badgeCorInicial]}>
              <Text style={styles.badgeText}>A</Text>
            </View>
            <Text style={styles.infoTempoKm}>{distanciaAteVoce} até você</Text>
          </View>

          {/* Endereço de partida (linha abaixo do tempo) */}
          <View style={styles.infoRow}>
            <Ionicons name="arrow-down-outline" size={18} color="white" />
            <Text className="ml-3" style={styles.infoText}>
              {enderecoPartida}
            </Text>
          </View>

          {/* espaço entre os dois blocos de tempo/endereço */}
          <View style={{ height: 2 }} />

          {/* Segundo tempo/distância + destino */}
          <View style={styles.infoRow}>
            <View style={[styles.badge, styles.badgeCorFinal]}>
              <Text style={styles.badgeText}>B</Text>
            </View>
            <Text style={[styles.infoTempoKm, { marginTop: 0 }]}>
              {distanciaViagem} de viagem
              {paradas > 0
                ? ` · ${paradas} ${paradas === 1 ? "parada" : "paradas"}`
                : ""}
            </Text>
          </View>
          <Text className="ml-8" style={styles.infoText}>
            {enderecoDestino}
          </Text>
          {paraOutraPessoa && (
            <Text className="ml-8" style={styles.paraOutraPessoa}>
              Corrida para outra pessoa
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.btnAceitar}
          onPress={() => {
            // aceita e para o som
            acceptAndUnload();
          }}
        >
          <Text style={styles.btnAceitarText}>
            {`Aceitar por ${emReais(valor)}`}
          </Text>
        </TouchableOpacity>

        {/* No Negocia o passageiro escolhe entre quem aceitou sua oferta e as
            contrapropostas recebidas. */}
        {negociavel ? (
          <>
            <Text style={styles.avisoNegocia}>
              O passageiro escolhe entre as propostas recebidas.
            </Text>
            <NegociarChamada
              valorBase={valor}
              onValorEscolhido={(novoValor) => acceptAndUnload(novoValor)}
            />
          </>
        ) : null}

        <TouchableOpacity
          style={styles.recusarBtn}
          onPress={() => {
            closeAndUnload();
          }}
        >
          <Text style={styles.recusarText}>Recusar</Text>
        </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    width: "94%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    // Adicionar position: 'relative' para que o PulseOverlay use absoluteFillObject corretamente
    position: "relative",
  },
  progressContainer: {
    height: 3,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    // Garante que a barra de progresso esteja acima do pulso
    zIndex: 2,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fbc02d",
  },
  topText: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
    // Garante que o texto esteja acima do pulso
    zIndex: 2,
  },
  categoriaChip: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 2,
    zIndex: 2,
  },
  categoriaTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },
  avisoNegocia: {
    color: "#bbb",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },
  valorContainer: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    // Garante que o valor esteja acima do pulso
    zIndex: 2,
  },
  valorText: {
    color: "#fff",
    fontSize: 50,
    fontWeight: "600",
    // Garante que o valor esteja acima do pulso
    zIndex: 2,
  },
  valorKm: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 2,
    // Garante que o texto esteja acima do pulso
    zIndex: 2,
  },
  infoContainer: {
    marginVertical: 14,
    flexDirection: "column",
    paddingHorizontal: 12,
    // Garante que o bloco de informações esteja acima do pulso
    zIndex: 2,
  },
  infoTempoKm: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "bold",
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 20,
  },
  paraOutraPessoa: {
    color: "#FBC02D",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  btnAceitar: {
    backgroundColor: "#fbc02d",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 14,
    // Garante que o botão Aceitar esteja acima do pulso
    zIndex: 2,
  },
  btnAceitarText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 16,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    // Garante que os botões de rodapé estejam acima do pulso
    zIndex: 2,
  },
  footerButton: {
    flex: 1,
    backgroundColor: "#3b3b3b",
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 8,
  },
  footerButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  recusarBtn: {
    alignItems: "center",
    marginTop: 10,
    // Garante que o botão Recusar esteja acima do pulso
    zIndex: 2,
  },
  recusarText: {
    color: "#ccc",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11, // metade do tamanho = círculo perfeito
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  badgeCorInicial: {
    backgroundColor: "#4CAF50",
  },
  badgeCorFinal: {
    backgroundColor: "red",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  infoPagamento: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Garante que o info de pagamento esteja acima do pulso
    zIndex: 2,
  },
  iconPagamento: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 6, // deixa mais largo
    height: 20, // um pouco mais alto
    borderRadius: 6, // arredondamento suave
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  perfilInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    justifyContent: "center",
    // Garante que o info de perfil esteja acima do pulso
    zIndex: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    color: "#aaa",
    marginHorizontal: 6,
  },
  badgePerfil: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2979ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  separador: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 1,
    opacity: 0.6,
    // Garante que o separador esteja acima do pulso
    zIndex: 2,
  },
});
