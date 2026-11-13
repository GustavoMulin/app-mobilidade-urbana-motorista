import { api } from "@/Services/api";
import { useEffect, useState } from "react";

/**
 * Busca os números de uma tela de taxa toda vez que ela abre. Os dados
 * anteriores ficam na tela enquanto a nova resposta não chega.
 */
export function useDadosDaTela<T>(visible: boolean, rota: string) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!visible) return;

    let ativo = true;
    api
      .get<T>(rota)
      .then(({ data }) => {
        if (!ativo) return;
        setDados(data);
        setErro("");
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar os dados.");
      });

    return () => {
      ativo = false;
    };
  }, [visible, rota]);

  return { dados, erro };
}
