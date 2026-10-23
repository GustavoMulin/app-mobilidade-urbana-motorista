import { api } from "@/Services/api";
import { obterEcho } from "@/Services/echo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

// Chat entre motorista e passageiro durante a corrida (backend do Gustavo:
// ChatCorridaController). O evento em tempo real traz só o id da mensagem;
// o app busca o que chegou pela API.
export interface MensagemDaCorrida {
  id: number | null;
  autor_tipo: "passageiro" | "motorista";
  autor_nome: string | null;
  conteudo: string;
  client_message_id: string | null;
  created_at: string;
  // só no app: enviada e ainda sem resposta do servidor, ou que falhou
  enviando?: boolean;
  falhou?: boolean;
}

interface RespostaDoChat {
  data: MensagemDaCorrida[];
  pode_enviar: boolean;
}

const MEU_PERFIL = "motorista";
const CONSULTA_ABERTO_MS = 6000;
const CONSULTA_FECHADO_MS = 20000;

const chaveVisto = (corridaId: number) => `@chat_corrida_visto:${corridaId}`;

export const novoIdDeMensagem = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letra) => {
    const aleatorio = Math.floor(Math.random() * 16);
    return (letra === "x" ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
  });

const mesma = (a: MensagemDaCorrida, b: MensagemDaCorrida) =>
  (a.id !== null && a.id === b.id) ||
  (!!a.client_message_id && a.client_message_id === b.client_message_id);

const mesclar = (atuais: MensagemDaCorrida[], novas: MensagemDaCorrida[]) => {
  const lista = [...atuais];
  novas.forEach((nova) => {
    const indice = lista.findIndex((item) => mesma(item, nova));
    if (indice === -1) lista.push(nova);
    else lista[indice] = { ...nova, enviando: false, falhou: false };
  });

  return lista.sort((a, b) => {
    if (a.id === null || b.id === null) return a.id === null ? 1 : -1;
    return a.id - b.id;
  });
};

export const ehMinha = (mensagem: MensagemDaCorrida) =>
  mensagem.autor_tipo === MEU_PERFIL;

export function useChatDaCorrida(corridaId: number | null, aberto: boolean) {
  // as mensagens ficam marcadas com a corrida: trocar de corrida não mostra
  // a conversa anterior
  const [conversa, setConversa] = useState<{
    corridaId: number | null;
    mensagens: MensagemDaCorrida[];
  }>({ corridaId: null, mensagens: [] });
  const mensagens = conversa.corridaId === corridaId ? conversa.mensagens : [];
  const setMensagens = useCallback(
    (mudar: (atuais: MensagemDaCorrida[]) => MensagemDaCorrida[]) =>
      setConversa((atual) => ({
        corridaId,
        mensagens: mudar(atual.corridaId === corridaId ? atual.mensagens : []),
      })),
    [corridaId],
  );
  const [podeEnviar, setPodeEnviar] = useState(false);
  const [vistoAte, setVistoAte] = useState(0);
  // primeira busca da corrida feita: o que veio nela é histórico, não aviso
  const [carregadaDe, setCarregadaDe] = useState<number | null>(null);
  const ultimoId = useRef(0);

  const guardar = useCallback(
    (novas: MensagemDaCorrida[], atualizarCursor = true) => {
      // A resposta do POST pode ter um id maior que uma mensagem do outro
      // participante que ainda não foi consultada. Avançar o cursor nesse
      // ponto faria a próxima busca pular essa mensagem.
      if (atualizarCursor) {
        novas.forEach((item) => {
          if (item.id !== null && item.id > ultimoId.current) {
            ultimoId.current = item.id;
          }
        });
      }
      setMensagens((atuais) => mesclar(atuais, novas));
    },
    [setMensagens],
  );

  const buscar = useCallback(async () => {
    if (corridaId === null) return;
    try {
      const { data } = await api.get<RespostaDoChat>(
        `/corridas/${corridaId}/mensagens`,
        {
          params:
            ultimoId.current > 0
              ? { after_id: ultimoId.current, limit: 100 }
              : { limit: 100 },
        },
      );
      setPodeEnviar(data.pode_enviar);
      guardar(data.data);
      setCarregadaDe(corridaId);
    } catch {
      // a próxima rodada tenta de novo
    }
  }, [corridaId, guardar]);

  useEffect(() => {
    ultimoId.current = 0;
    if (corridaId === null) return;

    let ativo = true;
    void AsyncStorage.getItem(chaveVisto(corridaId))
      .then((salvo) => {
        if (ativo) setVistoAte(Number(salvo) || 0);
      })
      .catch(() => {});
    void buscar();

    const canal = (() => {
      try {
        return obterEcho()?.private(`corrida.${corridaId}.chat`) ?? null;
      } catch {
        return null;
      }
    })();
    const aoAvisar = () => void buscar();
    canal?.listen(".corrida.mensagem", aoAvisar);

    return () => {
      ativo = false;
      try {
        canal?.stopListening(".corrida.mensagem", aoAvisar);
      } catch {}
    };
  }, [corridaId, buscar]);

  // sem o socket a conversa ainda chega: aberta, consulta mais vezes
  useEffect(() => {
    if (corridaId === null) return;
    const relogio = setInterval(
      () => void buscar(),
      aberto ? CONSULTA_ABERTO_MS : CONSULTA_FECHADO_MS,
    );
    return () => clearInterval(relogio);
  }, [corridaId, aberto, buscar]);

  const ultimaRecebida = mensagens
    .filter((item) => !ehMinha(item) && item.id !== null)
    .reduce((maior, item) => Math.max(maior, item.id ?? 0), 0);

  // quem abre ou fecha a conversa marca o que chegou como visto
  const marcarLidas = useCallback(() => {
    if (corridaId === null || ultimaRecebida <= vistoAte) return;
    setVistoAte(ultimaRecebida);
    void AsyncStorage.setItem(
      chaveVisto(corridaId),
      String(ultimaRecebida),
    ).catch(() => {});
  }, [corridaId, ultimaRecebida, vistoAte]);

  const recebidasNaoLidas = aberto
    ? []
    : mensagens.filter(
        (item) => !ehMinha(item) && item.id !== null && item.id > vistoAte,
      );
  const naoLidas = recebidasNaoLidas.length;

  const mandar = useCallback(
    async (mensagem: MensagemDaCorrida) => {
      if (corridaId === null) return false;
      setMensagens((atuais) => [
        ...atuais.filter((item) => !mesma(item, mensagem)),
        { ...mensagem, enviando: true, falhou: false },
      ]);
      try {
        const { data } = await api.post<{ data: MensagemDaCorrida }>(
          `/corridas/${corridaId}/mensagens`,
          {
            conteudo: mensagem.conteudo,
            client_message_id: mensagem.client_message_id,
          },
        );
        // O cursor é atualizado apenas pelo GET, que devolve todas as
        // mensagens posteriores em ordem e não deixa lacunas na conversa.
        guardar([data.data], false);
        return true;
      } catch {
        setMensagens((atuais) =>
          atuais.map((item) =>
            mesma(item, mensagem)
              ? { ...item, enviando: false, falhou: true }
              : item,
          ),
        );
        return false;
      }
    },
    [corridaId, guardar, setMensagens],
  );

  const enviar = useCallback(
    (texto: string) =>
      mandar({
        id: null,
        autor_tipo: MEU_PERFIL,
        autor_nome: null,
        conteudo: texto.trim(),
        client_message_id: novoIdDeMensagem(),
        created_at: new Date().toISOString(),
      }),
    [mandar],
  );

  return {
    corridaId,
    mensagens,
    podeEnviar,
    naoLidas,
    recebidasNaoLidas,
    carregada: corridaId !== null && carregadaDe === corridaId,
    enviar,
    reenviar: mandar,
    marcarLidas,
  };
}
