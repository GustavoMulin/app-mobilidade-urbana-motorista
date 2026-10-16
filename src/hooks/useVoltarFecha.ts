import { useEffect } from "react";
import { BackHandler } from "react-native";

// Botão voltar do Android em telas que abrem por cima de outra (painéis,
// folhas, cartões). Enquanto `aberto`, o voltar só fecha esta tela. O
// registro acontece na abertura: o React Native chama o handler mais recente
// primeiro, então a última tela aberta é a primeira a fechar.
export function useVoltarFecha(aberto: boolean, fechar: () => void) {
  useEffect(() => {
    if (!aberto) return;

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      fechar();
      return true;
    });

    return () => assinatura.remove();
  }, [aberto, fechar]);
}
