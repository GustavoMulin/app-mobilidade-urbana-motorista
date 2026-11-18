import { api } from "@/Services/api";
import { obterEcho } from "@/Services/echo";
import type { MapaDinamico } from "@/domain/dinamica";
import { useEffect, useState } from "react";

// Rede de segurança: o servidor avisa pelo socket a cada mudança do mapa, mas
// sem socket (ou se um aviso se perder) a consulta periódica mantém o mapa.
const INTERVALO_MS = 15_000;

// vários avisos seguidos (uma rodada de pedidos) viram uma consulta só
const ESPERA_DO_AVISO_MS = 600;

/**
 * Mapa de calor do preço dinâmico (demanda e tarifas) da cidade do motorista.
 * Só consulta quando `habilitado`, online ou não; a cidade desligada na gestão
 * devolve `ativa: false` e o mapa não pinta nada. Atualiza na hora em que o
 * servidor avisa que o mapa mudou.
 */
export function useMapaDinamico(habilitado: boolean): MapaDinamico | null {
  const [mapa, setMapa] = useState<MapaDinamico | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    let cancelado = false;
    let espera: ReturnType<typeof setTimeout> | null = null;

    const buscar = async () => {
      try {
        const { data } = await api.get<MapaDinamico>("/motorista/me/dinamica");

        if (!cancelado) setMapa(data);
      } catch {
        // sem rede ou sem acesso, fica o último mapa (ou nenhum)
      }
    };

    const aoAvisar = () => {
      if (espera !== null) clearTimeout(espera);
      espera = setTimeout(() => void buscar(), ESPERA_DO_AVISO_MS);
    };

    void buscar();
    const intervalo = setInterval(() => void buscar(), INTERVALO_MS);

    // canal próprio: o do despacho é encerrado quando o motorista fica offline
    const echo = obterEcho();
    let canalAberto = false;

    if (echo !== null) {
      try {
        echo.private("dinamica-mapa").listen(".dinamica.atualizada", aoAvisar);
        canalAberto = true;
      } catch {
        // sem socket, vale a consulta periódica
      }
    }

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      if (espera !== null) clearTimeout(espera);

      if (echo !== null && canalAberto) {
        try {
          echo.leave("dinamica-mapa");
        } catch {
          /* canal já encerrado */
        }
      }
    };
  }, [habilitado]);

  return habilitado && mapa?.ativa ? mapa : null;
}
