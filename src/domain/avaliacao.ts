// Avaliação ao fim da corrida: selos (elogios) gerenciados na gestão e bloqueio
// entre motorista e passageiro.

/** Selo que dá para escolher ao avaliar. O ícone é um emoji definido na gestão. */
export interface SeloDeAvaliacao {
  chave: string;
  titulo: string;
  descricao: string | null;
  icone: string;
  // arquivo enviado na gestão, senão a URL cadastrada; nula = usar o emoji
  imagem: string | null;
}

/** Alguém que o usuário bloqueou, com o contexto da avaliação que deu na corrida. */
export interface UsuarioBloqueado {
  id: number;
  nome: string;
  corrida: string | null;
  bloqueado_em: string | null;
  nota: number | null;
  comentario: string | null;
  selos: { titulo: string; icone: string; imagem: string | null }[];
}

/** Selos só são oferecidos para notas boas: elogiar uma corrida ruim não faz sentido. */
export const NOTA_MINIMA_PARA_SELOS = 4;

export const podeEscolherSelos = (nota: number) =>
  nota >= NOTA_MINIMA_PARA_SELOS;

/** Liga ou desliga um selo na seleção, mantendo a ordem em que foram escolhidos. */
export const alternarSelo = (escolhidos: string[], chave: string): string[] =>
  escolhidos.includes(chave)
    ? escolhidos.filter((item) => item !== chave)
    : [...escolhidos, chave];

/** "Bloqueado em 14/11/2026", ou vazio quando a data não veio. */
export const textoDoBloqueio = (iso: string | null): string => {
  if (!iso) return "";

  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";

  return `Bloqueado em ${data.toLocaleDateString("pt-BR")}`;
};
