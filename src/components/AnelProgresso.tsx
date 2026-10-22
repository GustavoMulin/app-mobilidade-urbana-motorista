import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  tamanho: number;
  espessura: number;
  progresso: number;
  cor: string;
  corFundo?: string;
  children?: ReactNode;
}

// anel de progresso só com View (o app não tem react-native-svg): cada metade
// do anel é um círculo com duas bordas coloridas (um arco de 180°) girado
// dentro de uma caixa que mostra só aquela metade. Preenche no sentido
// horário a partir do topo.
export default function AnelProgresso({
  tamanho,
  espessura,
  progresso,
  cor,
  corFundo = "#E6ECF5",
  children,
}: Props) {
  const angulo = Math.min(Math.max(progresso, 0), 1) * 360;
  const anguloDireita = Math.min(angulo, 180);
  const anguloEsquerda = Math.max(angulo - 180, 0);
  const metade = tamanho / 2;
  const circulo = {
    width: tamanho,
    height: tamanho,
    borderRadius: metade,
    borderWidth: espessura,
  };

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <View
        style={[StyleSheet.absoluteFill, circulo, { borderColor: corFundo }]}
      />

      {anguloDireita > 0 && (
        <View
          style={[
            styles.metade,
            { left: metade, width: metade, height: tamanho },
          ]}
        >
          <View
            style={[
              circulo,
              styles.arcoDireito,
              {
                left: -metade,
                borderTopColor: cor,
                borderRightColor: cor,
                transform: [{ rotate: `${anguloDireita - 135}deg` }],
              },
            ]}
          />
        </View>
      )}

      {anguloEsquerda > 0 && (
        <View
          style={[styles.metade, { left: 0, width: metade, height: tamanho }]}
        >
          <View
            style={[
              circulo,
              styles.arcoEsquerdo,
              {
                borderBottomColor: cor,
                borderLeftColor: cor,
                transform: [{ rotate: `${anguloEsquerda - 135}deg` }],
              },
            ]}
          />
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.centro]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  metade: { position: "absolute", top: 0, overflow: "hidden" },
  arcoDireito: {
    position: "absolute",
    top: 0,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  arcoEsquerdo: {
    position: "absolute",
    top: 0,
    left: 0,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  centro: { alignItems: "center", justifyContent: "center" },
});
