// CODEX: 0 linhas alteradas; evita compensar duas vezes o teclado no iOS. Remover após validação ou commit.
import { espacoCobertoPeloTeclado } from "@/domain/espacoDoTeclado";
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaFrame } from "react-native-safe-area-context";

/**
 * Quanto o teclado cobre da área do app, em dp.
 *
 * Mede contra a área real do app, porque cada Android age de um jeito: uns
 * deixam o teclado por cima (a área não muda e o rodapé precisa subir), outros
 * já encolhem a área até o topo do teclado (e subir de novo deixa o rodapé no
 * meio da tela). Ver espacoCobertoPeloTeclado.
 */
export function useEspacoDoTeclado(compensarIos = true) {
  const area = useSafeAreaFrame();
  const [topoDoTeclado, setTopoDoTeclado] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS === "ios" && !compensarIos) return;

    const aoMostrar = Keyboard.addListener("keyboardDidShow", (evento) =>
      setTopoDoTeclado(evento.endCoordinates.screenY),
    );

    const aoEsconder = Keyboard.addListener("keyboardDidHide", () =>
      setTopoDoTeclado(null),
    );

    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, [compensarIos]);

  return topoDoTeclado === null
    ? 0
    : espacoCobertoPeloTeclado(area.y + area.height, topoDoTeclado);
}
