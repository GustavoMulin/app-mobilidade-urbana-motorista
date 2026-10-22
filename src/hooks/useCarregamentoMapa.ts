// CODEX: contagem pendente; recuperação do mapa sem confundir GPS com ruas carregadas. Remover após validação/commit.
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// onMapReady informa que o objeto nativo existe; somente onMapLoaded confirma
// o desenho das ruas. O aviso é dispensável porque esse evento pode não chegar.
export function useCarregamentoMapa(ativo = true) {
  const [tentativa, setTentativa] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [demorando, setDemorando] = useState(false);
  const carregado = useRef(false);
  const dispensado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpar = useCallback(() => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = null;
  }, []);

  useEffect(() => {
    if (!ativo || Platform.OS !== "android" || carregado.current) return;
    temporizador.current = setTimeout(() => {
      if (!carregado.current && !dispensado.current) setDemorando(true);
    }, 12_000);
    return limpar;
  }, [ativo, tentativa, limpar]);

  const aoPronto = useCallback(() => setPronto(true), []);
  const aoCarregar = useCallback(() => {
    carregado.current = true;
    limpar();
    setDemorando(false);
  }, [limpar]);

  const dispensar = useCallback(() => {
    dispensado.current = true;
    limpar();
    setDemorando(false);
  }, [limpar]);

  const tentarNovamente = useCallback(() => {
    limpar();
    carregado.current = false;
    dispensado.current = false;
    setPronto(false);
    setDemorando(false);
    setTentativa((atual) => atual + 1);
  }, [limpar]);

  return { tentativa, pronto, demorando, aoPronto, aoCarregar, dispensar, tentarNovamente };
}
