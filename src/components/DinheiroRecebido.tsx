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

// fim de corrida: "cha-ching" e o valor rolando como caça-níquel no meio da
// tela; some sozinho e não bloqueia o toque no que está por baixo
interface Props {
  valor: number;
  onFim: () => void;
}

const ALTURA_DIGITO = 46;
const VOLTAS = 3;
const DIGITOS = Array.from({ length: 10 * VOLTAS }, (_, i) => i % 10);
const GIRO_MS = 650;
const ATRASO_ENTRE_ROLOS_MS = 110;
const EXIBIR_MS = 2100;

function Rolo({ digito, ordem }: { digito: number; ordem: number }) {
  const [deslocamento] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // para na última volta, cada rolo um pouco depois do anterior
    const animacao = Animated.timing(deslocamento, {
      toValue: -(10 * (VOLTAS - 1) + digito) * ALTURA_DIGITO,
      duration: GIRO_MS + ordem * ATRASO_ENTRE_ROLOS_MS,
      delay: 120,
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
            style={styles.digito}
          >
            {numero}
          </TextoFixo>
        ))}
      </Animated.View>
    </View>
  );
}

export default function DinheiroRecebido({ valor, onFim }: Props) {
  const [entrada] = useState(() => new Animated.Value(0));
  const [giroMoeda] = useState(() => new Animated.Value(0));
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

    Animated.spring(entrada, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
    Animated.timing(giroMoeda, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const ultimoRolo =
      120 + GIRO_MS + (quantidadeDeRolos - 1) * ATRASO_ENTRE_ROLOS_MS;
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
        duration: 220,
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
  }, [entrada, giroMoeda, quantidadeDeRolos]);

  let ordem = 0;

  return (
    <View pointerEvents="none" style={styles.sobreposicao}>
      <Animated.View
        style={[
          styles.cartao,
          {
            opacity: entrada,
            transform: [
              {
                scale: entrada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.moeda,
            {
              transform: [
                { perspective: 400 },
                {
                  rotateY: giroMoeda.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "1080deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="cash" size={30} color="#111111" />
        </Animated.View>

        <View style={styles.placar}>
          <Text style={styles.moedaSimbolo}>R$</Text>
          {texto.split("").map((caractere, indice) =>
            /\d/.test(caractere) ? (
              <Rolo key={indice} digito={Number(caractere)} ordem={ordem++} />
            ) : (
              <TextoFixo
                key={indice}
                allowFontScaling={false}
                style={styles.separador}
              >
                {caractere}
              </TextoFixo>
            ),
          )}
        </View>

        <Text style={styles.legenda}>Ganho da corrida</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    elevation: 60,
  },
  cartao: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "#FFD600",
    borderRadius: 24,
    borderWidth: 3,
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 34,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  moeda: {
    alignItems: "center",
    backgroundColor: "#FFD600",
    borderColor: "#111111",
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    top: -30,
    width: 60,
  },
  placar: {
    alignItems: "center",
    backgroundColor: "#1F1F1F",
    borderRadius: 14,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moedaSimbolo: {
    color: "#FFD600",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 6,
  },
  janela: {
    height: ALTURA_DIGITO,
    overflow: "hidden",
    width: 28,
  },
  digito: {
    color: "#FFFFFF",
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    height: ALTURA_DIGITO,
    lineHeight: ALTURA_DIGITO,
    textAlign: "center",
  },
  separador: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    lineHeight: ALTURA_DIGITO,
  },
  legenda: {
    color: "#BDBDBD",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
});
