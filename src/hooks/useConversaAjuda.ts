import { api } from "@/Services/api";
import { obterEcho } from "@/Services/echo";
import {
  MensagemDeAjuda,
  PedidoDeAjuda,
  novoIdDeMensagem,
} from "@/domain/ajuda";
import { useCallback, useEffect, useRef, useState } from "react";

// sem socket, a conversa se atualiza por aqui
const INTERVALO_CONSULTA_MS = 6000;

interface RespostaMensagens {
  data: MensagemDeAjuda[];
  atualizadas?: MensagemDeAjuda[];
}

const mesmaMensagem = (a: MensagemDeAjuda, b: MensagemDeAjuda) =>
  (a.id !== null && a.id === b.id) ||
  (!!a.client_message_id && a.client_message_id === b.client_message_id);

// junta o que chegou com o que já está na tela, sem repetir e em ordem
const mesclar = (atuais: MensagemDeAjuda[], novas: MensagemDeAjuda[]) => {
  const lista = [...atuais];

  novas.forEach((nova) => {
    const indice = lista.findIndex((item) => mesmaMensagem(item, nova));
    if (indice === -1) lista.push(nova);
    else lista[indice] = { ...nova, enviando: false, falhou: false };
  });

  return lista.sort((a, b) => {
    if (a.id === null || b.id === null) return a.id === null ? 1 : -1;
    return a.id - b.id;
  });
};

// conversa de um pedido da Central de Ajuda com o atendimento (painel de
// gestão): tempo real pelo canal do cliente e consulta periódica de reserva
export function useConversaAjuda(pedidoId: number) {
  const [pedido, setPedido] = useState<PedidoDeAjuda | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDeAjuda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const ultimoId = useRef(0);

  const guardar = useCallback((novas: MensagemDeAjuda[]) => {
    novas.forEach((item) => {
      if (item.id !== null && item.id > ultimoId.current) {
        ultimoId.current = item.id;
      }
    });
    setMensagens((atuais) => mesclar(atuais, novas));
  }, []);

  const carregarPedido = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: PedidoDeAjuda }>(
        `/ajuda/tickets/${pedidoId}`,
      );
      setPedido(data.data);
    } catch {
      // a próxima rodada tenta de novo
    }
  }, [pedidoId]);

  const buscarNovas = useCallback(async () => {
    try {
      const { data } = await api.get<RespostaMensagens>(
        `/ajuda/tickets/${pedidoId}/mensagens`,
        { params: { after_id: ultimoId.current, limit: 100 } },
      );
      guardar([...(data.atualizadas ?? []), ...data.data]);
    } catch {
      // a próxima rodada tenta de novo
    }
  }, [pedidoId, guardar]);

  useEffect(() => {
    let ativo = true;
    ultimoId.current = 0;

    const inicio = async () => {
      try {
        const [respostaPedido, respostaMensagens] = await Promise.all([
          api.get<{ data: PedidoDeAjuda }>(`/ajuda/tickets/${pedidoId}`),
          api.get<RespostaMensagens>(`/ajuda/tickets/${pedidoId}/mensagens`, {
            params: { limit: 100 },
          }),
        ]);
        if (!ativo) return;
        setPedido(respostaPedido.data.data);
        guardar(respostaMensagens.data.data);
        setErro(null);
      } catch {
        if (ativo) setErro("Não foi possível abrir a conversa agora.");
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void inicio();

    const relogio = setInterval(() => {
      void buscarNovas();
      void carregarPedido();
    }, INTERVALO_CONSULTA_MS);

    const canal = (() => {
      try {
        return obterEcho()?.private(`ajuda.ticket.${pedidoId}.cliente`) ?? null;
      } catch {
        return null;
      }
    })();
    const aoReceber = (evento: { mensagem?: MensagemDeAjuda }) => {
      if (evento?.mensagem) guardar([evento.mensagem]);
    };
    const aoAtualizar = () => void carregarPedido();
    canal?.listen(".ticket.mensagem", aoReceber);
    canal?.listen(".ticket.atualizado", aoAtualizar);

    return () => {
      ativo = false;
      clearInterval(relogio);
      try {
        canal?.stopListening(".ticket.mensagem", aoReceber);
        canal?.stopListening(".ticket.atualizado", aoAtualizar);
      } catch {}
    };
  }, [pedidoId, guardar, buscarNovas, carregarPedido]);

  const mandar = useCallback(
    async (mensagem: MensagemDeAjuda) => {
      // aparece na hora, no fim da conversa, até o servidor confirmar
      setMensagens((atuais) => [
        ...atuais.filter((item) => !mesmaMensagem(item, mensagem)),
        { ...mensagem, enviando: true, falhou: false },
      ]);

      try {
        const imagem = mensagem.anexos?.[0]?.uri_local;
        // com imagem vai em multipart; o mesmo uuid evita duplicar no reenvio
        const corpo = imagem
          ? (() => {
              const formulario = new FormData();
              formulario.append(
                "client_message_id",
                mensagem.client_message_id ?? "",
              );
              if (mensagem.conteudo) {
                formulario.append("conteudo", mensagem.conteudo);
              }
              formulario.append("imagens[]", {
                uri: imagem,
                name: mensagem.anexos?.[0]?.nome ?? "imagem.jpg",
                type: mensagem.anexos?.[0]?.mime_type ?? "image/jpeg",
              } as unknown as Blob);
              return formulario;
            })()
          : {
              conteudo: mensagem.conteudo,
              client_message_id: mensagem.client_message_id,
            };
        const { data } = await api.post<{ data: MensagemDeAjuda }>(
          `/ajuda/tickets/${pedidoId}/mensagens`,
          corpo,
          imagem
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : undefined,
        );
        guardar([data.data]);
        void carregarPedido();
        return true;
      } catch (falha) {
        setMensagens((atuais) =>
          atuais.map((item) =>
            mesmaMensagem(item, mensagem)
              ? { ...item, enviando: false, falhou: true }
              : item,
          ),
        );
        const resposta = (
          falha as {
            response?: { status?: number; data?: { message?: string } };
          }
        )?.response;
        if (resposta?.status === 409 && resposta.data?.message) {
          setErro(resposta.data.message);
        }
        return false;
      }
    },
    [pedidoId, guardar, carregarPedido],
  );

  const enviar = useCallback(
    (
      texto: string,
      imagem?: { uri: string; nome: string; tipo: string } | null,
    ) =>
      mandar({
        id: null,
        autor_tipo: "usuario",
        autor_nome: null,
        conteudo: texto.trim(),
        client_message_id: novoIdDeMensagem(),
        created_at: new Date().toISOString(),
        anexos: imagem
          ? [
              {
                id: null,
                nome: imagem.nome,
                mime_type: imagem.tipo,
                url: "",
                uri_local: imagem.uri,
              },
            ]
          : undefined,
      }),
    [mandar],
  );

  return {
    pedido,
    mensagens,
    carregando,
    erro,
    enviar,
    reenviar: mandar,
  };
}
