import { api } from "@/Services/api";
import type { SeloDeAvaliacao } from "@/domain/avaliacao";
import { useEffect, useState } from "react";

/**
 * Selos que o motorista pode dar ao passageiro (gerenciados na gestão). A lista
 * muda pouco: fica guardada enquanto o app está aberto.
 */
let guardados: SeloDeAvaliacao[] | null = null;

export function useSelosAvaliacao(ativo: boolean) {
  const [selos, setSelos] = useState<SeloDeAvaliacao[]>(guardados ?? []);

  useEffect(() => {
    if (!ativo) return;

    let vivo = true;
    api
      .get<{ data: SeloDeAvaliacao[] }>("/selos-avaliacao", {
        // o motorista elogia o passageiro: os selos são os de quem recebe
        params: { perfil: "passageiro" },
      })
      .then(({ data }) => {
        guardados = data.data;
        if (vivo) setSelos(data.data);
      })
      .catch(() => {
        // sem a lista, a avaliação segue só com a nota
      });

    return () => {
      vivo = false;
    };
  }, [ativo]);

  return selos;
}
