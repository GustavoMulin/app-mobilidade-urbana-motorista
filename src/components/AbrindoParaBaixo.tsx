import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Props {
  aberto: boolean;
  children: ReactNode;
  duracao?: number;
}

/**
 * Parte de um cartão que abre para baixo: a altura cresce de zero até a do
 * conteúdo (e fecha do mesmo jeito) enquanto ele aparece com fade. O conteúdo é
 * medido fora do fluxo, então o cartão acompanha a altura que a animação dá.
 */
export default function AbrindoParaBaixo({
  aberto,
  children,
  duracao = 480,
}: Props) {
  const [medido, setMedido] = useState(0);
  const progresso = useSharedValue(0);
  const altura = useSharedValue(0);

  useEffect(() => {
    // só anima depois de medir: antes disso não há altura para abrir
    if (medido <= 0) return;

    altura.set(medido);
    progresso.set(
      withTiming(aberto ? 1 : 0, {
        duration: duracao,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [aberto, medido, duracao, altura, progresso]);

  const estilo = useAnimatedStyle(() => ({
    height: altura.value * progresso.value,
    opacity: progresso.value,
  }));

  return (
    <Animated.View style={[{ overflow: "hidden" }, estilo]}>
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        onLayout={({ nativeEvent }) =>
          setMedido(Math.ceil(nativeEvent.layout.height))
        }
      >
        {children}
      </View>
    </Animated.View>
  );
}
