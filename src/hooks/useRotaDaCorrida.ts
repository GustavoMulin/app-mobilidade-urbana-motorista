import { api } from "@/Services/api";
import { alvoDaCorrida, type Coordenada } from "@/domain/rotaDaCorrida";
import type { CorridaEmCurso } from "@/hooks/useDespachoMotorista";
import { useEffect, useRef, useState } from "react";

export type { Coordenada } from "@/domain/rotaDaCorrida";

interface RotaCalculada {
  chave: string;
  coordinates: Coordenada[];
  origem: Coordenada;
}

// só refaz o traçado se o motorista andou o bastante pra mudar o desenho.
// sem isso cada envio de posição (8s) viraria uma chamada de Directions
const DISTANCIA_PARA_REFAZER_KM = 0.25;

const distanciaKm = (a: Coordenada, b: Coordenada) => {
  const raio = 6371;
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * raio * Math.asin(Math.min(1, Math.sqrt(h)));
};

export function useRotaDaCorrida(
  corrida: CorridaEmCurso | null,
  posicao: Coordenada | null,
) {
  const [rotaCalculada, setRotaCalculada] = useState<RotaCalculada | null>(
    null,
  );

  const alvo = alvoDaCorrida(corrida);
  const chaveAlvo = alvo
    ? `${corrida?.status_corrida}:${alvo.latitude},${alvo.longitude}`
    : "";
  const rota =
    rotaCalculada?.chave === chaveAlvo ? rotaCalculada.coordinates : [];
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

  // o traçado é refeito quando muda o alvo ou quando o motorista se afastou
  const precisaRefazer =
    origemDoTracado === null ||
    (posicao !== null &&
      distanciaKm(origemDoTracado, posicao) > DISTANCIA_PARA_REFAZER_KM);

  useEffect(() => {
    if (chaveAlvo === "" || posicao === null || !precisaRefazer) return;

    if (requisicaoAtual.current === chaveAlvo) return;
    requisicaoAtual.current = chaveAlvo;
    const partida = posicao;

    api
      .post<{ coordinates: Coordenada[] }>(
        "/tracado-rota",
        {
          pontos: [
            partida,
            { latitude: alvo!.latitude, longitude: alvo!.longitude },
          ],
        },
        { timeout: 10000 },
      )
      .then(({ data }) => {
        if (!ativo.current || alvoAtual.current !== chaveAlvo) return;

        const coordenadas = data?.coordinates ?? [];

        if (coordenadas.length === 0) return;

        setRotaCalculada({
          chave: chaveAlvo,
          coordinates: coordenadas,
          origem: partida,
        });
      })
      .catch(() => {
        // sem traçado o mapa continua útil: some a linha, não a corrida
      })
      .finally(() => {
        if (requisicaoAtual.current === chaveAlvo)
          requisicaoAtual.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAlvo, posicao, precisaRefazer]);

  return { rota, alvo };
}
