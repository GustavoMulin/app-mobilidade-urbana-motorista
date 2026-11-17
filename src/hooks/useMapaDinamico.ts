import { api } from "@/Services/api";
import type { MapaDinamico } from "@/domain/dinamica";
import { useEffect, useState } from "react";

// o servidor recalcula a cada minuto: olhar mais de uma vez por minuto não ajuda
const INTERVALO_MS = 30_000;

/**
 * Mapa de calor do preço dinâmico da cidade do motorista. Só consulta quando
 * `habilitado` (motorista online); a cidade desligada na gestão devolve
 * `ativa: false` e o mapa não pinta nada.
 */
export function useMapaDinamico(habilitado: boolean): MapaDinamico | null {
  const [mapa, setMapa] = useState<MapaDinamico | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    let cancelado = false;

    const buscar = async () => {
      try {
        const { data } = await api.get<MapaDinamico>("/motorista/me/dinamica");

        if (!cancelado) setMapa(data);
      } catch {
        // sem rede ou sem acesso, fica o último mapa (ou nenhum)
      }
    };

    void buscar();
    const intervalo = setInterval(() => void buscar(), INTERVALO_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [habilitado]);

  return habilitado && mapa?.ativa ? mapa : null;
}
