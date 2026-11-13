// Tela Taxa de Finalização: tipos da API, geometria do medidor e rótulos.

// restrição de corridas por taxa de finalização baixa (ciclo mensal)
export interface SituacaoTaxa {
  estado: "em_dia" | "alerta" | "restrito";
  prazo_ate: string | null;
  restricao_ate: string | null;
  faltam_corridas: number | null;
}

export interface DiaDaTaxa {
  data: string; // AAAA-MM-DD
  finalizadas: number;
  canceladas: number;
  taxa: number | null; // null: sem corridas no dia
}

export interface JanelaDaTaxa {
  de: string;
  ate: string;
  taxa: number;
  finalizadas: number;
  canceladas: number;
}

export interface DetalheFinalizacao {
  periodo: { de: string; ate: string };
  taxa: number;
  minima: number;
  finalizadas: number;
  canceladas: number;
  diario: DiaDaTaxa[]; // do mais antigo para hoje
  historico: JanelaDaTaxa[]; // da janela que termina hoje para trás
  situacao_taxa: SituacaoTaxa;
  regras: { prazo_dia: number; duracoes_dias: number[] };
}

export const COR_ABAIXO = "#FF4444";
export const COR_TRANSICAO = "#FFA000";
export const COR_ACIMA = "#18C27A";

export const corDaTaxa = (taxa: number, minima: number) =>
  taxa < minima ? COR_ABAIXO : COR_ACIMA;

// ---- datas (a API manda AAAA-MM-DD ou ISO com o fuso da operação) ----

const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const partes = (iso: string) => ({
  mes: Number(iso.slice(5, 7)),
  dia: iso.slice(8, 10),
});

/** "2026-10-06" -> "06 de out" */
export const rotuloDia = (iso: string) => {
  const { mes, dia } = partes(iso);
  return `${dia} de ${MESES[mes - 1] ?? ""}`;
};

/** "2026-11-12" -> "11/12", como no eixo do gráfico */
export const rotuloDiaCurto = (iso: string) => {
  const { mes, dia } = partes(iso);
  return `${String(mes).padStart(2, "0")}/${dia}`;
};

/** "14 de out – 12 de nov" (separador "-" no histórico) */
export const rotuloPeriodo = (de: string, ate: string, separador = " – ") =>
  `${rotuloDia(de)}${separador}${rotuloDia(ate)}`;

/** "14/11" a partir de um ISO completo, no fuso que a API mandou */
export const diaEMes = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** [5, 10, 15] -> "5, 10 ou 15 dias" */
export const textoDuracoes = (dias: number[]) => {
  if (dias.length === 0) return "alguns dias";
  if (dias.length === 1) return `${dias[0]} dias`;

  return `${dias.slice(0, -1).join(", ")} ou ${dias[dias.length - 1]} dias`;
};

/** Aviso mostrado no menu e na tela; sem alerta nem restrição não há o que dizer. */
export function avisoDaSituacaoTaxa(situacao?: SituacaoTaxa): string | null {
  if (situacao?.estado === "restrito" && situacao.restricao_ate) {
    return `Sua conta está com restrição de corridas até ${diaEMes(situacao.restricao_ate)}.`;
  }

  if (situacao?.estado === "alerta" && situacao.prazo_ate) {
    const faltam = situacao.faltam_corridas;
    const quanto =
      faltam && faltam > 0
        ? ` Faltam ${faltam} ${faltam === 1 ? "corrida finalizada" : "corridas finalizadas"}.`
        : "";

    return `Taxa de finalização abaixo do mínimo. Recupere até ${diaEMes(situacao.prazo_ate)} para evitar a restrição de corridas.${quanto}`;
  }

  return null;
}

// ---- medidor: arco de 240° aberto embaixo, de 0% (esquerda) a 100% (direita) ----

// ângulos em graus, no sentido horário, com 0° às 3 horas (eixo y do SVG para baixo)
export const ANGULO_INICIAL = 150;
export const ANGULO_TOTAL = 240;

export const anguloDoValor = (valor: number) =>
  ANGULO_INICIAL + (ANGULO_TOTAL * Math.min(100, Math.max(0, valor))) / 100;

const arredondar = (n: number) => Math.round(n * 100) / 100;

export const polar = (cx: number, cy: number, raio: number, angulo: number) => {
  const rad = (angulo * Math.PI) / 180;

  return {
    x: arredondar(cx + raio * Math.cos(rad)),
    y: arredondar(cy + raio * Math.sin(rad)),
  };
};
