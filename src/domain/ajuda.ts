// Central de Ajuda: os pedidos são os tickets do backend (TicketsController),
// atendidos pelo painel de gestão

// motivos aceitos pelo backend (ChamadosAjudaController::MOTIVOS)
export type Motivo =
  | "corrida_com_problema"
  | "tarifa_incorreta"
  | "objeto_esquecido"
  | "motorista_ou_passageiro"
  | "outro";

export const ROTULO_MOTIVO: Record<Motivo, string> = {
  corrida_com_problema: "Problema com uma corrida",
  tarifa_incorreta: "Revisar o valor recebido",
  objeto_esquecido: "Objeto esquecido no carro",
  motorista_ou_passageiro: "Problema com o passageiro",
  outro: "Outro assunto",
};

export type StatusPedido =
  | "open"
  | "waiting"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed";

export const SITUACAO_DO_PEDIDO: Record<
  StatusPedido,
  { texto: string; cor: string; fundo: string }
> = {
  open: {
    texto: "Recebido · aguardando atendimento",
    cor: "#8A6100",
    fundo: "#FFF6DB",
  },
  waiting: {
    texto: "Na fila de atendimento",
    cor: "#8A6100",
    fundo: "#FFF6DB",
  },
  in_progress: { texto: "Em atendimento", cor: "#1C6FD1", fundo: "#E8F1FD" },
  pending: {
    texto: "Aguardando sua resposta",
    cor: "#B45309",
    fundo: "#FFF1E6",
  },
  resolved: { texto: "Resolvido", cor: "#18794E", fundo: "#E7F6EE" },
  closed: { texto: "Encerrado", cor: "#5F6368", fundo: "#F1F3F4" },
};

export const situacaoDoPedido = (status: string) =>
  SITUACAO_DO_PEDIDO[status as StatusPedido] ?? SITUACAO_DO_PEDIDO.open;

export interface PedidoDeAjuda {
  id: number;
  protocolo: string;
  motivo: Motivo;
  descricao: string;
  status: StatusPedido;
  ultima_mensagem_em: string | null;
  created_at: string;
  gestor_responsavel: { id: number; name: string } | null;
  fila?: { mensagem: string | null } | null;
}

// imagem do atendimento (TicketAnexosService): a url é relativa à API e
// exige o token da sessão
export interface AnexoDeAjuda {
  id: number | null;
  nome: string | null;
  mime_type?: string;
  largura?: number | null;
  altura?: number | null;
  url: string;
  // só no app: a foto escolhida, enquanto o envio não termina
  uri_local?: string;
}

export interface MensagemDeAjuda {
  id: number | null;
  autor_tipo: "usuario" | "gestor" | "sistema";
  autor_nome: string | null;
  conteudo: string;
  client_message_id: string | null;
  // "fila_atendimento": aviso da fila, que o servidor atualiza no lugar
  tipo_sistema?: string | null;
  anexos?: AnexoDeAjuda[];
  created_at: string;
  // só no app: enviada e ainda sem resposta do servidor, ou que falhou
  enviando?: boolean;
  falhou?: boolean;
}

// o servidor exige um uuid por mensagem: reenviar a mesma não a duplica
export const novoIdDeMensagem = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letra) => {
    const aleatorio = Math.floor(Math.random() * 16);
    return (letra === "x" ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
  });
