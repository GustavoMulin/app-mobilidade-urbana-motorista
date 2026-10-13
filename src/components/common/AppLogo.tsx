// Logo do app: "69" ladeado por dois carrinhos pequenos, um virado pra cada
// lado, alinhados no pé do texto. Ao montar, os carros "saem de trás" do
// texto: começam pequenos e sobrepostos, depois crescem até a posição final.
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Cor própria do logo (aprovada como está) — não segue a paleta das telas,
// que pode mudar independente disso.
const LOGO_COLOR = "#000";

interface Props {
  size?: number;
}

export default function AppLogo({ size = 48 }: Props) {
  const carSize = Math.round(size * 0.28);
  const deslocamento = size * 0.55;

  const [progresso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progresso, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start();
  }, [progresso]);

  const translateEsquerda = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [deslocamento, 0],
  });

  const translateDireita = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [-deslocamento, 0],
  });

  const escala = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  // compensa o respiro que o Text deixa abaixo da linha de base dos números
  const ajusteBaseline = size * 0.14;

  return (
    <View style={styles.row}>
      <Animated.View
        style={{
          marginBottom: ajusteBaseline,
          transform: [{ translateX: translateEsquerda }, { scale: escala }],
        }}
      >
        <FontAwesome5
          name="car-side"
          size={carSize}
          color={LOGO_COLOR}
          style={styles.carEsquerda}
        />
      </Animated.View>

      <Text
        allowFontScaling={false}
        style={[styles.text, { fontSize: size, lineHeight: size }]}
      >
        69
      </Text>

      <Animated.View
        style={{
          marginBottom: ajusteBaseline,
          transform: [{ translateX: translateDireita }, { scale: escala }],
        }}
      >
        <FontAwesome5 name="car-side" size={carSize} color={LOGO_COLOR} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  text: {
    fontWeight: "900",
    color: LOGO_COLOR,
    marginHorizontal: 3,
  },
  carEsquerda: {
    transform: [{ scaleX: -1 }],
  },
});
