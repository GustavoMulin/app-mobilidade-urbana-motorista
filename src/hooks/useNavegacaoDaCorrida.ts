// CODEX: 15 linhas adicionadas e 5 removidas no diff atual; usa rota local sem consultar a API durante a simulação. Remover após validação/commit.
import { api } from "@/Services/api";
import type { Coordenada } from "@/domain/rotaDaCorrida";
import {
  distanciaMetros,
  indiceDoPassoAtual,
  type RotaNavegacao,
} from "@/domain/navegacao";
import { useEffect, useRef, useState } from "react";

// só refaz a rota se o motorista se afastou o bastante do traçado — sem
// isso, cada atualização de posição viraria uma chamada de Directions
const DISTANCIA_PARA_REFAZER_M = 60;

interface RotaCalculada {
  chave: string;
  rota: RotaNavegacao;
  origem: Coordenada;
}

export function useNavegacaoDaCorrida(
  alvo: Coordenada | null,
  posicao: Coordenada | null,
  rotaForcada: RotaNavegacao | null = null,
) {
  const [rotaCalculada, setRotaCalculada] = useState<RotaCalculada | null>(
    null,
  );
  const [indicePasso, setIndicePasso] = useState(0);

  const chaveAlvo = alvo ? `${alvo.latitude},${alvo.longitude}` : "";
  const rota =
    rotaForcada ??
    (rotaCalculada?.chave === chaveAlvo ? rotaCalculada.rota : null);
  const origemDoTracado =
    rotaCalculada?.chave === chaveAlvo ? rotaCalculada.origem : null;

  const alvoAtual = useRef(chaveAlvo);
  const requisicaoAtual = useRef<string | null>(null);
  const ativo = useRef(true);

  useEffect(() => {
    alvoAtual.current = chaveAlvo;
  }, [chaveAlvo]);

  useEffect(() => {
    ativo.current = true;
    return () => {
      ativo.current = false;
    };
  }, []);

  useEffect(() => {
    // redefinir a etapa é necessário quando o alvo da navegação muda
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndicePasso(0);
  }, [chaveAlvo]);

  const precisaRefazer =
    rotaForcada === null &&
    (origemDoTracado === null ||
      (posicao !== null &&
        distanciaMetros(origemDoTracado, posicao) > DISTANCIA_PARA_REFAZER_M));

  useEffect(() => {
    if (rotaForcada !== null) return;
    if (chaveAlvo === "" || posicao === null || !precisaRefazer) return;
    if (requisicaoAtual.current === chaveAlvo) return;

    requisicaoAtual.current = chaveAlvo;
    const partida = posicao;

    api
      .post<RotaNavegacao>(
        "/navegacao-rota",
        {
          origem_latitude: partida.latitude,
          origem_longitude: partida.longitude,
          destino_latitude: alvo!.latitude,
          destino_longitude: alvo!.longitude,
        },
        { timeout: 10000 },
      )
      .then(({ data }) => {
        if (!ativo.current || alvoAtual.current !== chaveAlvo) return;
        if (!data?.passos?.length) return;

        setRotaCalculada({ chave: chaveAlvo, rota: data, origem: partida });
        setIndicePasso(0);
      })
      .catch(() => {
        // sem passos novos a navegação continua com o traçado anterior
      })
      .finally(() => {
        if (requisicaoAtual.current === chaveAlvo) {
          requisicaoAtual.current = null;
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAlvo, posicao, precisaRefazer, rotaForcada]);

  useEffect(() => {
    if (!rota) return;
    // a posição externa determina a etapa atual da instrução de navegação
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndicePasso((atual) => indiceDoPassoAtual(rota.passos, posicao, atual));
  }, [rota, posicao]);

  const passoAtual = rota?.passos[indicePasso] ?? null;
  const distanciaAteManobra =
    passoAtual && posicao ? distanciaMetros(posicao, passoAtual.fim) : null;

  return { rota, passoAtual, distanciaAteManobra, indicePasso };
}
