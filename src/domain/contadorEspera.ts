export interface ResumoEspera {
  inicio_em: string;
  calculado_em: string;
  segundos_decorridos: number;
  tolerancia_segundos: number;
  limite_cobranca_segundos: number;
  segundos_cobrados: number;
  segundos_tolerancia_restantes: number;
  limite_atingido: boolean;
  valor_por_minuto: number;
  taxa_plataforma_percentual: number;
  valor_taxa_motorista: number;
  valor_taxa_passageiro: number;
}

export interface ContadorEspera {
  fase: "tolerancia" | "cobrando" | "limite";
  tempo: string;
  apoio: string;
  valor: number;
  segundosCobrados: number;
  segundosDecorridos: number;
  // quanto do anel do relógio fica preenchido (0 a 1): na tolerância é o que
  // resta da contagem regressiva; na cobrança, o que já foi cobrado do limite
  progresso: number;
}

export type PerspectivaEspera = "motorista" | "passageiro";

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.min(Math.max(valor, minimo), maximo);

export const formatarTempoEspera = (segundos: number) => {
  const total = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(total / 60);
  const restante = total % 60;

  // sem zero à esquerda no minuto — mesmo formato do 99 real ("0:29")
  return `${minutos}:${String(restante).padStart(2, "0")}`;
};

export function calcularContadorEspera(
  resumo: ResumoEspera,
  segundosDesdeResumo: number,
  perspectiva: PerspectivaEspera,
): ContadorEspera {
  const decorridos = Math.max(
    0,
    Math.floor(resumo.segundos_decorridos + segundosDesdeResumo),
  );
  const cobrados = limitar(
    decorridos - resumo.tolerancia_segundos,
    0,
    resumo.limite_cobranca_segundos,
  );
  const toleranciaRestante = Math.max(
    resumo.tolerancia_segundos - decorridos,
    0,
  );
  const motoristaCentavos = Math.round(
    resumo.valor_por_minuto * (cobrados / 60) * 100,
  );
  const percentual = limitar(resumo.taxa_plataforma_percentual, 0, 95) / 100;
  const passageiroCentavos = Math.round(motoristaCentavos / (1 - percentual));
  const valor =
    (perspectiva === "motorista" ? motoristaCentavos : passageiroCentavos) /
    100;

  if (toleranciaRestante > 0) {
    return {
      fase: "tolerancia",
      tempo: formatarTempoEspera(toleranciaRestante),
      apoio: "Por favor, aguarde. Taxa paga após a contagem.",
      valor: 0,
      segundosCobrados: 0,
      segundosDecorridos: decorridos,
      progresso:
        resumo.tolerancia_segundos > 0
          ? toleranciaRestante / resumo.tolerancia_segundos
          : 0,
    };
  }

  if (cobrados >= resumo.limite_cobranca_segundos) {
    return {
      fase: "limite",
      tempo: formatarTempoEspera(resumo.limite_cobranca_segundos),
      apoio: "Limite de 12 minutos atingido. A taxa não aumenta mais.",
      valor,
      segundosCobrados: cobrados,
      segundosDecorridos: decorridos,
      progresso: 1,
    };
  }

  return {
    fase: "cobrando",
    tempo: formatarTempoEspera(cobrados),
    apoio: "Tempo de espera sendo cobrado, limitado a 12 minutos.",
    valor,
    segundosCobrados: cobrados,
    segundosDecorridos: decorridos,
    progresso:
      resumo.limite_cobranca_segundos > 0
        ? cobrados / resumo.limite_cobranca_segundos
        : 1,
  };
}
