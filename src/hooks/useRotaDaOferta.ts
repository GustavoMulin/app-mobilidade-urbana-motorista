import { api } from "@/Services/api";
import type { Coordenada } from "@/domain/rotaDaCorrida";
import type { OfertaCorrida } from "@/hooks/useDespachoMotorista";
import { useEffect, useState } from "react";

export interface PontoDaOferta extends Coordenada {
  tipo: "origem" | "parada" | "destino";
}

const valido = (ponto: Coordenada) =>
  Number.isFinite(ponto.latitude) &&
  Number.isFinite(ponto.longitude) &&
  !(ponto.latitude === 0 && ponto.longitude === 0);

// enquanto a chamada toca, o mapa mostra o trajeto da corrida (embarque,
// paradas e destino), como no 99. O traçado de cada corrida é pedido uma vez.
export function useRotaDaOferta(oferta: OfertaCorrida | null) {
  const [tracados, setTracados] = useState<Record<number, Coordenada[]>>({});

  const corridaId = oferta?.corrida_id ?? null;
  const pontos: PontoDaOferta[] = (oferta?.trajeto ?? []).filter(valido);
  const chavePontos = pontos
    .map((ponto) => `${ponto.latitude},${ponto.longitude}`)
    .join(";");

  useEffect(() => {
    if (corridaId === null || tracados[corridaId] || pontos.length < 2) return;

    let ativo = true;
    api
      .post<{ coordinates: Coordenada[] }>(
        "/tracado-rota",
        {
          pontos: pontos.slice(0, 6).map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        },
        { timeout: 10000 },
      )
      .then(({ data }) => {
        const coordenadas = data?.coordinates ?? [];
        if (!ativo || coordenadas.length < 2) return;
        setTracados((atuais) => ({ ...atuais, [corridaId]: coordenadas }));
      })
      .catch(() => {
        // sem traçado, os pontos ligados em linha reta ainda mostram o caminho
        if (!ativo) return;
        setTracados((atuais) => ({
          ...atuais,
          [corridaId]: pontos.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        }));
      });

    return () => {
      ativo = false;
    };
    // os pontos entram pela chave: o array é recriado a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corridaId, chavePontos]);

  const rota = corridaId === null ? [] : (tracados[corridaId] ?? []);

  return { rota, pontos: corridaId === null ? [] : pontos };
}
