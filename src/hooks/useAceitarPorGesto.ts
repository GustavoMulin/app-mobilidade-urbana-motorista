import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { TurboModuleRegistry } from "react-native";

const CHAVE = "@motorista_aceitar_por_gesto";

// a câmera nativa (VisionCamera, sobre o Nitro) só existe no app compilado: no
// Expo Go o módulo não está lá, a opção nem aparece e os componentes de câmera
// não chegam a ser carregados
export const gestosDisponiveis =
  TurboModuleRegistry.get("NitroModules") != null;

// ligado, a câmera frontal acompanha a mão enquanto a chamada está na tela:
// fechar a mão (pegar) aceita, abrir (soltar) recusa. Começa desligado.
export function useAceitarPorGesto() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    AsyncStorage.getItem(CHAVE)
      .then((salvo) => {
        if (!cancelado && salvo !== null) setAtivo(salvo === "1");
      })
      .catch(() => undefined);

    return () => {
      cancelado = true;
    };
  }, []);

  const definir = useCallback((novo: boolean) => {
    setAtivo(novo);
    void AsyncStorage.setItem(CHAVE, novo ? "1" : "0").catch(() => undefined);
  }, []);

  return { ativo, definir };
}
