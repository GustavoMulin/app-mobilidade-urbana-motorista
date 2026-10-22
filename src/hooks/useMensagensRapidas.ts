import { useAuth } from "@/context/AuthProvider";
import {
  carregarMensagensRapidas,
  motivoParaNaoAdicionar,
  salvarMensagensRapidas,
} from "@/domain/mensagensRapidas";
import { useCallback, useEffect, useMemo, useState } from "react";

// mensagens rápidas que o motorista criou dentro do chat (só no aparelho)
export function useMensagensRapidas() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;
  const [lista, setLista] = useState<{
    userId: number | null;
    mensagens: string[];
  }>({ userId: null, mensagens: [] });
  const personalizadas = useMemo(
    () => (lista.userId === userId ? lista.mensagens : []),
    [lista, userId],
  );

  useEffect(() => {
    if (userId === null) return;
    let ativo = true;
    void carregarMensagensRapidas(userId).then((mensagens) => {
      if (ativo) setLista({ userId, mensagens });
    });
    return () => {
      ativo = false;
    };
  }, [userId]);

  const guardar = useCallback(
    (mensagens: string[]) => {
      if (userId === null) return;
      setLista({ userId, mensagens });
      void salvarMensagensRapidas(userId, mensagens).catch(() => undefined);
    },
    [userId],
  );

  const adicionar = useCallback(
    (texto: string): string | null => {
      const motivo = motivoParaNaoAdicionar(texto, personalizadas);
      if (motivo !== null) return motivo;
      guardar([...personalizadas, texto.trim().replace(/\s+/g, " ")]);
      return null;
    },
    [personalizadas, guardar],
  );

  const remover = useCallback(
    (texto: string) => guardar(personalizadas.filter((item) => item !== texto)),
    [personalizadas, guardar],
  );

  return { personalizadas, adicionar, remover };
}
