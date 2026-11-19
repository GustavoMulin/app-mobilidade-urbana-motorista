import type { PerfilPublicoPassageiro } from "@/domain/perfilPassageiro";
import { api } from "@/Services/api";
import { useEffect, useState } from "react";

/**
 * Perfil público do passageiro da corrida. Busca de novo toda vez que a tela
 * abre: a nota e os selos mudam a cada corrida.
 */
export function usePerfilDoPassageiro(
  corridaId: number | null,
  ativo: boolean,
) {
  const [perfil, setPerfil] = useState<PerfilPublicoPassageiro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!ativo || corridaId === null) return;

    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setErro(false);

    api
      .get<PerfilPublicoPassageiro>(`/corridas/${corridaId}/passageiro/perfil`)
      .then(({ data }) => {
        if (vivo) setPerfil(data);
      })
      .catch(() => {
        if (vivo) setErro(true);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [ativo, corridaId]);

  return { perfil, carregando, erro };
}
