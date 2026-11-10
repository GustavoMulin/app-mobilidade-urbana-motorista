import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

type Estado = { granted: boolean; canAskAgain: boolean };

// o que o app usa: fotos dos documentos, a posição para receber corridas e o microfone
const PERMISSOES: {
  nome: string;
  ver: () => Promise<Estado>;
  pedir: () => Promise<Estado>;
}[] = [
  {
    nome: "câmera",
    ver: ImagePicker.getCameraPermissionsAsync,
    pedir: ImagePicker.requestCameraPermissionsAsync,
  },
  {
    nome: "galeria",
    ver: () => ImagePicker.getMediaLibraryPermissionsAsync(),
    pedir: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
  },
  {
    nome: "localização",
    ver: Location.getForegroundPermissionsAsync,
    pedir: Location.requestForegroundPermissionsAsync,
  },
  {
    nome: "microfone",
    ver: getRecordingPermissionsAsync,
    pedir: requestRecordingPermissionsAsync,
  },
];

export function usePermissoesPendentes() {
  const [faltando, setFaltando] = useState<string[]>([]);

  const verificar = useCallback(async () => {
    const estados = await Promise.all(PERMISSOES.map((p) => p.ver()));
    setFaltando(
      PERMISSOES.filter((_, i) => !estados[i].granted).map((p) => p.nome),
    );
  }, []);

  // volta das configurações do aparelho com a permissão já dada
  useEffect(() => {
    const inicio = setTimeout(() => void verificar(), 0);
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void verificar();
    });
    return () => {
      clearTimeout(inicio);
      assinatura.remove();
    };
  }, [verificar]);

  // pede pelo app; o que o aparelho não deixa mais pedir só nas configurações
  const ativar = useCallback(async () => {
    let soNasConfiguracoes = false;
    for (const permissao of PERMISSOES) {
      if ((await permissao.ver()).granted) continue;
      // pede mesmo sem canAskAgain: o Android responde na hora, e no Expo Go a
      // permissão liberada nas configurações ainda precisa do aceite dentro do app
      const pedido = await permissao.pedir();
      if (!pedido.granted && !pedido.canAskAgain) soNasConfiguracoes = true;
    }
    if (soNasConfiguracoes) await Linking.openSettings();
    await verificar();
  }, [verificar]);

  return { faltando, ativar };
}
