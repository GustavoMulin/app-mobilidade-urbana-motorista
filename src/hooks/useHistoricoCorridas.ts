import { api } from "@/Services/api";
import {
  CorridaHistoricoApi,
  ItemHistorico,
  paraItemHistorico,
} from "@/domain/historicoCorridas";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaginaCorridas {
  data?: CorridaHistoricoApi[];
  current_page?: number;
  last_page?: number;
}

export type { ItemHistorico } from "@/domain/historicoCorridas";

export function useHistoricoCorridas(ativo: boolean) {
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const paginaAtual = useRef(0);
  const ultimaPagina = useRef(1);
  const requisicaoEmAndamento = useRef(false);

  const buscarPagina = useCallback(
    async (pagina: number, substituir: boolean) => {
      if (requisicaoEmAndamento.current) return;

      requisicaoEmAndamento.current = true;
      if (substituir) {
        setCarregando(true);
        setErro("");
      } else {
        setCarregandoMais(true);
      }

      try {
        const { data } = await api.get<PaginaCorridas>("/corridas", {
          params: { page: pagina, per_page: 50 },
        });
        const novosItens = (data?.data ?? []).map((corrida) =>
          paraItemHistorico(corrida, "motorista"),
        );

        setItens((atuais) => {
          if (substituir) return novosItens;
          const unicos = new Map(atuais.map((item) => [item.id, item]));
          novosItens.forEach((item) => unicos.set(item.id, item));
          return [...unicos.values()];
        });
        paginaAtual.current = data.current_page ?? pagina;
        ultimaPagina.current = data.last_page ?? pagina;
      } catch {
        if (substituir) {
          setItens([]);
          setErro("Não foi possível carregar seu histórico.");
        }
      } finally {
        requisicaoEmAndamento.current = false;
        setCarregando(false);
        setCarregandoMais(false);
      }
    },
    [],
  );

  const recarregar = useCallback(() => buscarPagina(1, true), [buscarPagina]);

  const carregarMais = useCallback(() => {
    if (paginaAtual.current >= ultimaPagina.current) return;
    void buscarPagina(paginaAtual.current + 1, false);
  }, [buscarPagina]);

  useEffect(() => {
    if (!ativo) return;
    const timer = setTimeout(() => void recarregar(), 0);
    return () => clearTimeout(timer);
  }, [ativo, recarregar]);

  return {
    itens,
    carregando,
    carregandoMais,
    erro,
    recarregar,
    carregarMais,
  };
}
