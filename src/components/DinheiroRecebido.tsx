import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text as TextoFixo,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "@/theme/tema";

// fim de corrida: o cartão desce do topo da tela com o valor da corrida (os
// números rolam como caça-níquel) e, do outro lado, notas caindo numa carteira.
// Some sozinho e não bloqueia o toque no que está por baixo
interface Props {
  valor: number;
  onFim: () => void;
}

const ALTURA_DIGITO = 44;
const VOLTAS = 3;
const DIGITOS = Array.from({ length: 10 * VOLTAS }, (_, i) => i % 10);
const GIRO_MS = 650;
const ATRASO_ENTRE_ROLOS_MS = 110;
const EXIBIR_MS = 3000;
const CICLO_NOTAS_MS = 1800;

function Rolo({
  digito,
  ordem,
  cor,
}: {
  digito: number;
  ordem: number;
  cor: string;
}) {
  const [deslocamento] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // para na última volta, cada rolo um pouco depois do anterior
    const animacao = Animated.timing(deslocamento, {
      toValue: -(10 * (VOLTAS - 1) + digito) * ALTURA_DIGITO,
      duration: GIRO_MS + ordem * ATRASO_ENTRE_ROLOS_MS,
      delay: 250,
      easing: Easing.out(Easing.back(0.6)),
      useNativeDriver: true,
    });
    animacao.start();
    return () => animacao.stop();
  }, [deslocamento, digito, ordem]);

  return (
    <View style={styles.janela}>
      <Animated.View style={{ transform: [{ translateY: deslocamento }] }}>
        {DIGITOS.map((numero, indice) => (
          <TextoFixo
            key={indice}
            allowFontScaling={false}
            style={[styles.digito, { color: cor }]}
          >
            {numero}
          </TextoFixo>
        ))}
      </Animated.View>
    </View>
  );
}

// uma nota que cai de cima e some "dentro" da carteira, em laço
function Nota({
  atraso,
  deslocamentoX,
  giro,
}: {
  atraso: number;
  deslocamentoX: number;
  giro: string;
}) {
  const [progresso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const laco = Animated.loop(
      Animated.sequence([
        Animated.delay(atraso),
        Animated.timing(progresso, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(Math.max(CICLO_NOTAS_MS - atraso - 700, 0)),
        Animated.timing(progresso, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    laco.start();

    return () => laco.stop();
  }, [atraso, progresso]);

  return (
    <Animated.View
      style={[
        styles.nota,
        {
          opacity: progresso.interpolate({
            inputRange: [0, 0.15, 0.85, 1],
            outputRange: [0, 1, 1, 0.9],
          }),
          transform: [
            { translateX: deslocamentoX },
            {
              translateY: progresso.interpolate({
                inputRange: [0, 1],
                outputRange: [-34, 18],
              }),
            },
            {
              rotate: progresso.interpolate({
                inputRange: [0, 1],
                outputRange: [giro, "0deg"],
              }),
            },
            {
              scale: progresso.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons name="cash" size={30} color="#16A34A" />
    </Animated.View>
  );
}

function CarteiraRecebendo() {
  const [pulso] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // a carteira "recebe" cada nota com um pulinho
    // as notas chegam a cada 600 ms, a primeira aos 700 ms
    const laco = Animated.sequence([
      Animated.delay(580),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, {
            toValue: 1.08,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(pulso, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.delay(320),
        ]),
      ),
    ]);

    laco.start();

    return () => laco.stop();
  }, [pulso]);

  return (
    <View style={styles.carteiraArea}>
      <Nota atraso={0} deslocamentoX={-8} giro="-18deg" />
      <Nota atraso={600} deslocamentoX={6} giro="14deg" />
      <Nota atraso={1200} deslocamentoX={-2} giro="-8deg" />
      <Animated.View
        style={[styles.carteira, { transform: [{ scale: pulso }] }]}
      >
        <Ionicons name="wallet" size={62} color="#F59E0B" />
      </Animated.View>
    </View>
  );
}

export default function DinheiroRecebido({ valor, onFim }: Props) {
  const insets = useSafeAreaInsets();
  // no modo escuro o cartão acompanha o painel e o texto fica claro
  const { escuro, cores } = useTema();
  const corDoTexto = escuro ? "#FFFFFF" : "#111111";
  const corDaLegenda = escuro ? cores.textoApoio : "#222222";
  const [entrada] = useState(() => new Animated.Value(0));
  const [alturaDoCartao, setAlturaDoCartao] = useState(220);
  const onFimRef = useRef(onFim);

  useEffect(() => {
    onFimRef.current = onFim;
  }, [onFim]);

  const texto = valor.toFixed(2).replace(".", ",");
  const quantidadeDeRolos = texto.replace(/\D/g, "").length;

  useEffect(() => {
    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(require("../../assets/dinheiro-recebido.mp3"));
      player.play();
    } catch {
      player = null;
    }

    Animated.timing(entrada, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.back(0.8)),
      useNativeDriver: true,
    }).start();

    const ultimoRolo =
      250 + GIRO_MS + (quantidadeDeRolos - 1) * ATRASO_ENTRE_ROLOS_MS;
    const vibrar = setTimeout(() => {
      try {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      } catch {
        // aparelho sem vibração
      }
    }, ultimoRolo);
    const sair = setTimeout(() => {
      Animated.timing(entrada, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => onFimRef.current());
    }, EXIBIR_MS);

    return () => {
      clearTimeout(vibrar);
      clearTimeout(sair);
      try {
        player?.remove();
      } catch {
        // o som já terminou
      }
    };
  }, [entrada, quantidadeDeRolos]);

  let ordem = 0;

  return (
    <View pointerEvents="none" style={styles.sobreposicao}>
      <Animated.View
        onLayout={({ nativeEvent }) =>
          setAlturaDoCartao(nativeEvent.layout.height)
        }
        style={[
          styles.cartao,
          {
            backgroundColor: escuro ? cores.painel : "#FFFFFF",
            paddingTop: insets.top + 18,
            transform: [
              {
                translateY: entrada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-(alturaDoCartao + 40), 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.linha}>
          <View style={styles.lado}>
            <Text style={[styles.legenda, { color: corDaLegenda }]}>
              Valor da corrida
            </Text>
            <View style={styles.placar}>
              <Text style={[styles.mais, { color: corDoTexto }]}>+R$</Text>
              {texto.split("").map((caractere, indice) =>
                /\d/.test(caractere) ? (
                  <Rolo
                    key={indice}
                    digito={Number(caractere)}
                    ordem={ordem++}
                    cor={corDoTexto}
                  />
                ) : (
                  <TextoFixo
                    key={indice}
                    allowFontScaling={false}
                    style={[styles.separador, { color: corDoTexto }]}
                  >
                    {caractere}
                  </TextoFixo>
                ),
              )}
            </View>
          </View>

          <CarteiraRecebendo />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-start",
    zIndex: 60,
    elevation: 60,
  },
  cartao: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 22,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },
  linha: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lado: { flex: 1 },
  legenda: {
    color: "#222222",
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 2,
  },
  placar: { alignItems: "center", flexDirection: "row" },
  mais: {
    color: "#111111",
    fontSize: 34,
    fontWeight: "800",
    marginRight: 2,
  },
  janela: {
    height: ALTURA_DIGITO,
    overflow: "hidden",
    width: 23,
  },
  digito: {
    color: "#111111",
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    height: ALTURA_DIGITO,
    lineHeight: ALTURA_DIGITO,
    textAlign: "center",
  },
  separador: {
    color: "#111111",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: ALTURA_DIGITO,
  },
  carteiraArea: {
    alignItems: "center",
    height: 96,
    justifyContent: "flex-end",
    width: 96,
  },
  carteira: { position: "absolute", bottom: 4 },
  nota: { position: "absolute", bottom: 40 },
});
