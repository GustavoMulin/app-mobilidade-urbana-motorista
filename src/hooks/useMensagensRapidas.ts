import { useAuth } from "@/context/AuthProvider";
import {
  carregarMensagensPorEtapa,
  limparMensagem,
  mensagensPadrao,
  motivoParaNaoSalvar,
  salvarMensagensPorEtapa,
  type EtapaDaMensagem,
  type MensagensPorEtapa,
} from "@/domain/mensagensRapidas";
import { useCallback, useEffect, useSyncExternalStore } from "react";

// As frases de cada etapa da corrida ficam no aparelho, por conta. O estado é
// compartilhado entre a tela de preferências e a home: editar lá vale na hora
// no painel e no chat.
const PADRAO: MensagensPorEtapa = mensagensPadrao();
const estados = new Map<number, MensagensPorEtapa>();
const carregando = new Set<number>();
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());
const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
};

const guardar = (userId: number, mensagens: MensagensPorEtapa) => {
  estados.set(userId, mensagens);
  avisar();
  void salvarMensagensPorEtapa(userId, mensagens).catch(() => undefined);
};

export function useMensagensRapidas() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;
  const porEtapa = useSyncExternalStore(
    assinar,
    () => (userId !== null ? (estados.get(userId) ?? PADRAO) : PADRAO),
    () => PADRAO,
  );

  useEffect(() => {
    if (userId === null || estados.has(userId) || carregando.has(userId))
      return;
    carregando.add(userId);
    void carregarMensagensPorEtapa(userId).then((mensagens) => {
      carregando.delete(userId);
      // uma edição feita durante a leitura vale mais que o que estava salvo
      if (!estados.has(userId)) {
        estados.set(userId, mensagens);
        avisar();
      }
    });
  }, [userId]);

  const daEtapa = useCallback(
    (etapa: string | null | undefined): string[] =>
      etapa && etapa in porEtapa ? porEtapa[etapa as EtapaDaMensagem] : [],
    [porEtapa],
  );

  const alterar = useCallback(
    (etapa: EtapaDaMensagem, lista: string[]) => {
      if (userId === null) return;
      guardar(userId, { ...porEtapa, [etapa]: lista });
    },
    [userId, porEtapa],
  );

  const adicionar = useCallback(
    (etapa: EtapaDaMensagem, texto: string): string | null => {
      const motivo = motivoParaNaoSalvar(texto, porEtapa[etapa]);
      if (motivo !== null) return motivo;
      alterar(etapa, [...porEtapa[etapa], limparMensagem(texto)]);
      return null;
    },
    [porEtapa, alterar],
  );

  const editar = useCallback(
    (etapa: EtapaDaMensagem, indice: number, texto: string): string | null => {
      const motivo = motivoParaNaoSalvar(texto, porEtapa[etapa], indice);
      if (motivo !== null) return motivo;
      alterar(
        etapa,
        porEtapa[etapa].map((item, posicao) =>
          posicao === indice ? limparMensagem(texto) : item,
        ),
      );
      return null;
    },
    [porEtapa, alterar],
  );

  const remover = useCallback(
    (etapa: EtapaDaMensagem, indice: number) =>
      alterar(
        etapa,
        porEtapa[etapa].filter((_, posicao) => posicao !== indice),
      ),
    [porEtapa, alterar],
  );

  const reordenar = useCallback(
    (etapa: EtapaDaMensagem, lista: string[]) => alterar(etapa, lista),
    [alterar],
  );

  const restaurar = useCallback(
    (etapa: EtapaDaMensagem) => alterar(etapa, mensagensPadrao()[etapa]),
    [alterar],
  );

  return {
    porEtapa,
    daEtapa,
    adicionar,
    editar,
    remover,
    reordenar,
    restaurar,
  };
}
