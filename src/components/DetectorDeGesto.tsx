import { Text } from "@/components/common/Texto";
import {
  avancarGesto,
  estadoInicialGesto,
  LADO_IMAGEM,
  LADO_MODELO,
  LADO_PONTOS,
  melhorPalma,
  poseDaMao,
  razoesDosDedos,
  recortarMao,
  regiaoDaMao,
  type Pose,
} from "@/domain/gestoMao";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useFrameOutput } from "react-native-vision-camera";
import { useResizer } from "react-native-vision-camera-resizer";
import { scheduleOnRN } from "react-native-worklets";

interface Props {
  onAceitar: () => void;
  onRecusar: () => void;
}

const DETECTOR = require("../../assets/modelos/detector_palma.tflite");
const PONTOS = require("../../assets/modelos/pontos_mao.tflite");
// abaixo disso não é palma: nem roda o modelo de pontos
const PONTUACAO_PALMA = 0.5;
// o modelo de pontos também diz se há mesmo uma mão no recorte (0 a 1)
const PRESENCA_MINIMA = 0.8;
// a chamada acabou de aparecer: uma mão que já estava ali não conta
const ESPERA_INICIAL_MS = 800;
const AMARELO = "#FFD400";
const VERMELHO = "#FF8A80";

// Montado só enquanto a chamada está na tela e o "aceitar por gesto" está
// ligado: a câmera frontal olha a mão. Fechar a mão aberta (pegar) aceita na
// hora; abrir a mão fechada (soltar) recusa.
export default function DetectorDeGesto({ onAceitar, onRecusar }: Props) {
  const insets = useSafeAreaInsets();
  const carregamentoDetector = useTensorflowModel(DETECTOR, []);
  const carregamentoPontos = useTensorflowModel(PONTOS, []);
  const detector =
    carregamentoDetector.state === "loaded"
      ? carregamentoDetector.model
      : undefined;
  const pontos =
    carregamentoPontos.state === "loaded"
      ? carregamentoPontos.model
      : undefined;
  // o quadro inteiro, reduzido para o detector de palma
  const { resizer: reduzir, error: erroReduzir } = useResizer({
    width: LADO_MODELO,
    height: LADO_MODELO,
    channelOrder: "rgb",
    dataType: "float32",
    // como o MediaPipe: a imagem inteira cabe no quadrado, sem cortar as laterais
    scaleMode: "contain",
    pixelLayout: "interleaved",
  });
  // o mesmo quadro maior, de onde a mão é recortada para o modelo de pontos
  const { resizer: ampliar, error: erroAmpliar } = useResizer({
    width: LADO_IMAGEM,
    height: LADO_IMAGEM,
    channelOrder: "rgb",
    dataType: "uint8",
    scaleMode: "contain",
    pixelLayout: "interleaved",
  });
  // a pose firme de onde o gesto parte: aberta, falta pegar; fechada, soltar
  const [inicio, setInicio] = useState<Pose | null>(null);
  const gesto = useRef(estadoInicialGesto());
  const decidido = useRef(false);
  const montadoEm = useRef(0);
  const acoes = useRef({ onAceitar, onRecusar });

  useEffect(() => {
    montadoEm.current = Date.now();
  }, []);

  useEffect(() => {
    acoes.current = { onAceitar, onRecusar };
  }, [onAceitar, onRecusar]);

  useEffect(() => {
    const falha =
      (carregamentoDetector.state === "error" && carregamentoDetector.error) ||
      (carregamentoPontos.state === "error" && carregamentoPontos.error) ||
      erroReduzir ||
      erroAmpliar;
    if (falha) console.warn("[gesto] detector indisponível", falha);
  }, [carregamentoDetector, carregamentoPontos, erroReduzir, erroAmpliar]);

  // na thread do React, a cada quadro: a pose da mão ("" sem mão ou sem pose)
  const receberQuadro = useCallback((vista: string) => {
    const agora = Date.now();
    if (
      decidido.current ||
      montadoEm.current === 0 ||
      agora - montadoEm.current < ESPERA_INICIAL_MS
    ) {
      return;
    }
    const passo = avancarGesto(
      gesto.current,
      agora,
      vista === "aberta" || vista === "fechada" ? vista : null,
    );
    gesto.current = passo.estado;
    setInicio(passo.estado.inicio);
    if (passo.decisao === null) return;
    decidido.current = true;
    if (passo.decisao === "aceitar") acoes.current.onAceitar();
    else acoes.current.onRecusar();
  }, []);

  const saida = useFrameOutput({
    targetResolution: { width: 480, height: 640 },
    // YUV na CPU: o resizer do iOS só aceita YUV, e no Android o buffer da GPU
    // ("native") não aceita a rotação física abaixo
    pixelFormat: "yuv",
    // o quadro já chega em pé, como o modelo de pontos espera a mão
    enablePhysicalBufferRotation: true,
    onFrame(frame) {
      "worklet";
      try {
        if (!detector || !pontos || !reduzir || !ampliar) return;
        const pequeno = reduzir.resize(frame);
        const [primeira, segunda] = detector.runSync([
          pequeno.getPixelBuffer(),
        ]);
        pequeno.dispose();
        // as caixas (18 valores por âncora) são a saída maior; a outra, as pontuações
        const palma =
          primeira.byteLength > segunda.byteLength
            ? melhorPalma(new Float32Array(primeira), new Float32Array(segunda))
            : melhorPalma(
                new Float32Array(segunda),
                new Float32Array(primeira),
              );
        if (palma.pontuacao < PONTUACAO_PALMA) {
          scheduleOnRN(receberQuadro, "");
          return;
        }
        const grande = ampliar.resize(frame);
        const entrada = new Float32Array(LADO_PONTOS * LADO_PONTOS * 3);
        recortarMao(
          new Uint8Array(grande.getPixelBuffer()),
          LADO_IMAGEM,
          regiaoDaMao(palma),
          entrada,
        );
        grande.dispose();
        // saídas: pontos na imagem, presença da mão, qual mão, pontos 3D
        const saidas = pontos.runSync([entrada.buffer]);
        const presenca = new Float32Array(saidas[1])[0];
        const razoes = razoesDosDedos(new Float32Array(saidas[3]));
        scheduleOnRN(
          receberQuadro,
          presenca >= PRESENCA_MINIMA ? (poseDaMao(razoes) ?? "") : "",
        );
      } finally {
        frame.dispose();
      }
    },
  });

  // a mão aberta pronta para pegar (aceitar) ou fechada pronta para soltar (recusar)
  const cor = inicio === "fechada" ? VERMELHO : AMARELO;

  return (
    <View
      style={[styles.bolha, { top: insets.top + 12 }]}
      pointerEvents="none"
      accessible
      accessibilityLabel="Câmera ligada: feche a mão aberta para aceitar ou abra a mão fechada para recusar"
    >
      <Camera
        style={[
          styles.preview,
          { borderColor: inicio ? cor : "rgba(255,255,255,0.6)" },
        ]}
        device="front"
        outputs={[saida]}
        isActive
        mirrorMode="auto"
      />
      <View style={styles.dica}>
        {inicio ? (
          <Text style={[styles.dicaTexto, { color: cor }]}>
            {inicio === "aberta"
              ? "✊ feche para aceitar"
              : "✋ abra para recusar"}
          </Text>
        ) : (
          <>
            <Text style={styles.dicaTexto}>✋→✊ aceita</Text>
            <View style={styles.dicaDivisor} />
            <Text style={styles.dicaTexto}>✊→✋ recusa</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bolha: {
    position: "absolute",
    left: 14,
    alignItems: "center",
    gap: 6,
  },
  preview: {
    width: 84,
    height: 112,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 3,
    backgroundColor: "#111",
  },
  dica: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  dicaTexto: { fontSize: 11, lineHeight: 14, color: "#FFF", fontWeight: "600" },
  dicaDivisor: {
    width: 1,
    height: 10,
    marginHorizontal: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
