import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const CHAVE = "@motorista_empilhar_negociadas";

// Negocia: ligado, quem mandou proposta continua recebendo chamadas e as
// propostas esperando o passageiro ficam empilhadas atrás da chamada da vez;
// desligado, a próxima chamada só toca depois da resposta do passageiro
export function useEmpilharNegociadas() {
  const [empilhar, setEmpilhar] = useState(true);

  useEffect(() => {
    let cancelado = false;

    AsyncStorage.getItem(CHAVE)
      .then((salvo) => {
        if (!cancelado && salvo !== null) setEmpilhar(salvo === "1");
      })
      .catch(() => undefined);

    return () => {
      cancelado = true;
    };
  }, []);

  const alternar = useCallback(() => {
    setEmpilhar((atual) => {
      const novo = !atual;
      void AsyncStorage.setItem(CHAVE, novo ? "1" : "0").catch(() => undefined);

      return novo;
    });
  }, []);

  return { empilhar, alternar };
}
