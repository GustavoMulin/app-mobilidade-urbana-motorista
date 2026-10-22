import { enderecoCurto } from "@/domain/endereco";
export type PerspectivaHistorico = "motorista" | "passageiro";

export interface CorridaHistoricoApi {
  id: number;
  codigo_corrida?: string | null;
  status_corrida: string;
  cancelado_por?: string | null;
  motivo_cancelamento?: string | null;
  tipo_cancelamento?: string | null;
  metodo_pagamento?: string | null;
  tempo_solicitacao?: string | null;
  tempo_inicio?: string | null;
  tempo_final?: string | null;
  created_at?: string | null;
  distancia_total?: string | number | null;
  valor_estimado_inicial?: string | number | null;
  valor_negociado_final?: string | number | null;
  produto?: { nome?: string | null } | null;
  motorista?: {
    foto?: string | null;
    user?: { name?: string | null } | null;
  } | null;
  passageiro?: {
    foto?: string | null;
    user?: { name?: string | null } | null;
  } | null;
  veiculo?: {
    modelo?: string | null;
    cor?: string | null;
    placa?: string | null;
  } | null;
  corrida_financeiro?: {
    valor_pago_passageiro?: string | number | null;
    tarifa_base?: string | number | null;
    taxa_cancelamento?: string | number | null;
    taxa_plataforma_valor?: string | number | null;
    taxa_plataforma_percentual?: string | number | null;
    valor_motorista?: string | number | null;
    valor_liquido_motorista?: string | number | null;
    metodo_pagamento?: string | null;
  } | null;
  corrida_destinos?:
    | {
        tipo: string;
        ordem?: number;
        endereco: string;
      }[]
    | null;
}

export interface ItemHistorico {
  id: string;
  code: string;
  date: string;
  time: string;
  dateTime: string;
  type: string;
  paymentMethod: "cash" | "app";
  paymentLabel: string;
  paymentSummary: string;
  origin: string;
  destination: string;
  value: string;
  valueLabel: string;
  passengerPaid: string;
  driverEarned: string;
  baseFare: string;
  platformFee: string;
  platformPercentage: string;
  status: string;
  statusCode: string;
  counterpartName: string;
  counterpartPhoto: string | null;
  vehicle: string;
  distance: string;
  duration: string;
  cancelledBy: string | null;
  cancellationReason: string | null;
  isCancelled: boolean;
  isNoShow: boolean;
  isFinalized: boolean;
}

const ROTULOS_STATUS: Record<string, string> = {
  solicitada: "Solicitada",
  em_busca: "Procurando motorista",
  aceita: "Motorista a caminho",
  motorista_chegou: "Motorista no local",
  em_andamento: "Em andamento",
  finalizada: "Corrida finalizada",
  cancelada: "Corrida cancelada",
};

const ROTULOS_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix: "Pix",
  carteira: "Carteira",
  saldo_app: "Saldo no app",
};

const ROTULOS_CANCELAMENTO: Record<string, string> = {
  motorista: "Motorista",
  passageiro: "Passageiro",
  sistema: "Sistema",
};

const numero = (valor?: string | number | null) => {
  const convertido = typeof valor === "string" ? Number(valor) : valor;
  return typeof convertido === "number" && Number.isFinite(convertido)
    ? convertido
    : null;
};

export const formatarValorHistorico = (valor?: string | number | null) => {
  const convertido = numero(valor);
  return convertido === null
    ? "—"
    : `R$ ${convertido.toFixed(2).replace(".", ",")}`;
};

const formatarDistancia = (valor?: string | number | null) => {
  const convertido = numero(valor);
  return convertido === null
    ? "—"
    : `${convertido.toFixed(1).replace(".", ",")} km`;
};

const formatarDuracao = (inicio?: string | null, fim?: string | null) => {
  if (!inicio || !fim) return "—";
  const milissegundos = new Date(fim).getTime() - new Date(inicio).getTime();
  if (!Number.isFinite(milissegundos) || milissegundos < 0) return "—";
  const minutos = Math.round(milissegundos / 60000);
  return minutos < 60
    ? `${minutos} min`
    : `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
};

export function paraItemHistorico(
  corrida: CorridaHistoricoApi,
  perspectiva: PerspectivaHistorico,
): ItemHistorico {
  const dataSolicitacao = new Date(
    corrida.tempo_solicitacao ?? corrida.created_at ?? "",
  );
  const dataValida = !Number.isNaN(dataSolicitacao.getTime());
  const financeiro = corrida.corrida_financeiro;
  const pagamento = financeiro?.metodo_pagamento ?? corrida.metodo_pagamento;
  const pagamentoLabel = ROTULOS_PAGAMENTO[pagamento ?? ""] ?? "Não informado";
  const finalizada = corrida.status_corrida === "finalizada";
  const cancelada = corrida.status_corrida === "cancelada";
  const ausencia =
    cancelada && corrida.tipo_cancelamento === "nao_comparecimento";
  const valorPassageiro =
    financeiro?.valor_pago_passageiro ??
    corrida.valor_negociado_final ??
    corrida.valor_estimado_inicial;
  const valorMotorista =
    financeiro?.valor_liquido_motorista ??
    financeiro?.valor_motorista ??
    corrida.valor_negociado_final ??
    corrida.valor_estimado_inicial;
  const perfilContraparte =
    perspectiva === "motorista" ? corrida.passageiro : corrida.motorista;
  const contraparte = perfilContraparte?.user;
  const ponto = (tipo: string) => {
    const endereco = [...(corrida.corrida_destinos ?? [])]
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .find((destino) => destino.tipo === tipo)?.endereco;
    return endereco ? enderecoCurto(endereco) : "Não informado";
  };
  const veiculo = [
    corrida.veiculo?.modelo,
    corrida.veiculo?.cor,
    corrida.veiculo?.placa,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: String(corrida.id),
    code: corrida.codigo_corrida ?? `#${corrida.id}`,
    date: dataValida ? dataSolicitacao.toLocaleDateString("pt-BR") : "—",
    time: dataValida
      ? dataSolicitacao.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    dateTime: dataValida ? dataSolicitacao.toLocaleString("pt-BR") : "—",
    type: corrida.produto?.nome ?? "Corrida",
    paymentMethod: pagamento === "dinheiro" ? "cash" : "app",
    paymentLabel: pagamentoLabel,
    paymentSummary: ausencia
      ? `Taxa de cancelamento em ${pagamentoLabel.toLowerCase()}`
      : finalizada
        ? perspectiva === "motorista"
          ? `Ganhos pagos em ${pagamentoLabel.toLowerCase()}`
          : `Pago em ${pagamentoLabel.toLowerCase()}`
        : `Pagamento em ${pagamentoLabel.toLowerCase()}`,
    origin: ponto("origem"),
    destination: ponto("destino"),
    value: formatarValorHistorico(
      perspectiva === "motorista" ? valorMotorista : valorPassageiro,
    ),
    valueLabel: ausencia
      ? "Taxa por ausência"
      : finalizada
        ? perspectiva === "motorista"
          ? "Você ganhou"
          : "Valor pago"
        : "Valor estimado",
    passengerPaid: formatarValorHistorico(valorPassageiro),
    driverEarned: formatarValorHistorico(valorMotorista),
    baseFare: formatarValorHistorico(financeiro?.tarifa_base),
    platformFee: formatarValorHistorico(financeiro?.taxa_plataforma_valor),
    platformPercentage:
      numero(financeiro?.taxa_plataforma_percentual) === null
        ? "—"
        : `${numero(financeiro?.taxa_plataforma_percentual)?.toFixed(2).replace(".", ",")}%`,
    status: ROTULOS_STATUS[corrida.status_corrida] ?? corrida.status_corrida,
    statusCode: corrida.status_corrida,
    counterpartName: contraparte?.name ?? "Não definido",
    counterpartPhoto: perfilContraparte?.foto ?? null,
    vehicle: veiculo || "Não definido",
    distance: formatarDistancia(corrida.distancia_total),
    duration: formatarDuracao(corrida.tempo_inicio, corrida.tempo_final),
    cancelledBy: corrida.cancelado_por
      ? (ROTULOS_CANCELAMENTO[corrida.cancelado_por] ?? corrida.cancelado_por)
      : null,
    cancellationReason: corrida.motivo_cancelamento
      ? corrida.motivo_cancelamento.charAt(0).toUpperCase() +
        corrida.motivo_cancelamento.slice(1)
      : null,
    isCancelled: cancelada,
    isNoShow: ausencia,
    isFinalized: finalizada,
  };
}
