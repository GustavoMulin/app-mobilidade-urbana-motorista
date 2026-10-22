// CODEX: 0 linhas alteradas; evita compensar duas vezes o teclado no iOS. Remover após validação ou commit.
import { espacoCobertoPeloTeclado } from "@/domain/espacoDoTeclado";
import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

/**
 * Quanto o teclado cobre da área útil do app, em dp.
 *
 * No Android de ponta a ponta o teclado fica por cima do app (a janela não
 * encolhe), então o rodapé precisa subir exatamente a parte coberta — ver
 * espacoCobertoPeloTeclado.
 */
export function useEspacoDoTeclado(compensarIos = true) {
  const [espaco, setEspaco] = useState(0);

  useEffect(() => {
    if (Platform.OS === "ios" && !compensarIos) return;

    const aoMostrar = Keyboard.addListener("keyboardDidShow", (evento) => {
      setEspaco(
        espacoCobertoPeloTeclado(
          Dimensions.get("screen").height,
          evento.endCoordinates.screenY,
        ),
      );
    });

    const aoEsconder = Keyboard.addListener("keyboardDidHide", () =>
      setEspaco(0),
    );

    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, [compensarIos]);

  return espaco;
}
