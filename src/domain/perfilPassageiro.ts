// Perfil público do passageiro, como o motorista da corrida o enxerga (vem de
// GET /corridas/{id}/passageiro/perfil).

export interface ElogioRecebido {
  chave: string;
  titulo: string;
  descricao: string | null;
  icone: string;
  // imagem do selo (arquivo enviado ou URL); nula = só o emoji
  imagem: string | null;
  quantidade: number;
}

/** Conquista do passageiro (corridas feitas, tempo no app). */
export interface Conquista {
  chave: string;
  titulo: string;
  subtitulo: string;
  // nome de um ícone do Ionicons
  icone: string;
}

export interface Verificacao {
  chave: string;
  titulo: string;
  descricao: string;
  icone: string;
  ok: boolean;
}

export interface PerfilPublicoPassageiro {
  nome: string | null;
  foto: string | null;
  foto_e_avatar: boolean;
  nota: number;
  avaliacoes: number;
  nota_base: boolean;
  corridas: number;
  novo: boolean;
  desde_em?: string | null;
  meses_na_plataforma: number;
  elogios: ElogioRecebido[];
  selos: Conquista[];
  // só as confirmadas
  verificacoes: Verificacao[];
}

/** "4,50", ou "-" quando ainda não há nota. */
export const textoDaNotaPublica = (nota: number | null | undefined) =>
  typeof nota === "number" ? nota.toFixed(2).replace(".", ",") : "-";

/**
 * "7" + "Meses", "2" + "Anos": o tempo do passageiro no app. No primeiro mês
 * mostra dias ("12" + "Dias") e, no primeiro dia, horas ("5" + "Horas").
 */
export const tempoNoApp = (
  meses: number,
  desdeEm: string | null = null,
  agora: Date = new Date(),
) => {
  if (meses < 1 && desdeEm) {
    const inicio = new Date(desdeEm).getTime();

    if (!Number.isNaN(inicio)) {
      const horas = Math.max(
        0,
        Math.floor((agora.getTime() - inicio) / 3_600_000),
      );
      const dias = Math.floor(horas / 24);

      if (dias >= 1) {
        return { valor: String(dias), rotulo: dias === 1 ? "Dia" : "Dias" };
      }

      return { valor: String(horas), rotulo: horas === 1 ? "Hora" : "Horas" };
    }
  }

  if (meses < 12) {
    return { valor: String(meses), rotulo: meses === 1 ? "Mês" : "Meses" };
  }

  const anos = Math.floor(meses / 12);

  return { valor: String(anos), rotulo: anos === 1 ? "Ano" : "Anos" };
};
