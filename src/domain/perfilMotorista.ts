// Perfil do motorista: tipos da API e textos. A nota começa em 5,0 (base) e
// passa a ser a média das avaliações reais assim que chega a primeira.

export interface Elogio {
  chave: string;
  titulo: string;
  descricao: string;
  quantidade: number;
}

export interface NotaDeAgradecimento {
  id: number;
  autor: string;
  nota: number;
  comentario: string;
  elogios: string[];
  quando: string | null;
}

export interface Selo {
  chave: string;
  titulo: string;
  subtitulo: string;
  icone: string;
}

export interface Verificacao {
  chave: string;
  titulo: string;
  descricao: string;
  icone: string;
  ok: boolean;
}

/** Classificação da nota; os limites são definidos na gestão. */
export interface FaixaDaNota {
  chave: "excelente" | "atencao" | "alto_risco";
  titulo: string;
}

export interface LimitesDasFaixas {
  excelente_acima: number;
  alto_risco_abaixo: number;
}

export interface PerfilMotorista {
  nome: string | null;
  foto: string | null;
  nota: number;
  avaliacoes: number;
  nota_base: boolean;
  corridas: number;
  novo: boolean;
  corridas_para_deixar_de_ser_novo: number;
  janela_da_media: number;
  faixa: FaixaDaNota;
  faixas: LimitesDasFaixas;
  desde: string | null;
  meses_na_plataforma: number;
  distribuicao: Record<string, number>;
  elogios: Elogio[];
  notas_agradecimento: NotaDeAgradecimento[];
  total_notas_agradecimento: number;
  selos: Selo[];
  verificacoes: Verificacao[];
}

/** Cores do selo da faixa: verde, âmbar e vermelho. */
export const coresDaFaixa = (chave: FaixaDaNota["chave"]) =>
  chave === "excelente"
    ? { fundo: "#E3F6EC", texto: "#18794E" }
    : chave === "atencao"
      ? { fundo: "#FFF3D6", texto: "#9A6700" }
      : { fundo: "#FDECEA", texto: "#B3261E" };

const notaComVirgula = (nota: number) => nota.toFixed(2).replace(".", ",");

/** "Excelente: acima de 4,85 · Atenção: de 4,51 a 4,85 · Alto risco: abaixo de 4,51" */
export const textoDasFaixas = (limites: LimitesDasFaixas) =>
  `Excelente: acima de ${notaComVirgula(limites.excelente_acima)} · ` +
  `Atenção: de ${notaComVirgula(limites.alto_risco_abaixo)} a ${notaComVirgula(limites.excelente_acima)} · ` +
  `Alto risco: abaixo de ${notaComVirgula(limites.alto_risco_abaixo)}`;

/** Largura (%) da barra de uma nota no gráfico de estrelas. */
export const larguraDaBarra = (quantidade: number, total: number) =>
  total <= 0 ? 0 : Math.round((quantidade / total) * 100);

/** Soma das avaliações do gráfico de estrelas. */
export const totalDaDistribuicao = (distribuicao: Record<string, number>) =>
  Object.values(distribuicao).reduce((soma, n) => soma + n, 0);

/** "7" + "Meses", "2" + "Anos": o que o motorista vê em "tempo na plataforma". */
export const tempoNaPlataforma = (meses: number) => {
  if (meses < 12) {
    return { valor: String(meses), rotulo: meses === 1 ? "Mês" : "Meses" };
  }

  const anos = Math.floor(meses / 12);

  return { valor: String(anos), rotulo: anos === 1 ? "Ano" : "Anos" };
};

/** "1 mês atrás", "5 meses atrás": quando a nota de agradecimento chegou. */
export const textoDeQuando = (
  iso: string | null,
  agora: Date = new Date(),
): string => {
  if (!iso) return "";

  const minutos = Math.max(
    0,
    Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000),
  );

  if (minutos < 60) return "agora há pouco";

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} ${horas === 1 ? "hora" : "horas"} atrás`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"} atrás`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"} atrás`;

  const anos = Math.floor(meses / 12);

  return `${anos} ${anos === 1 ? "ano" : "anos"} atrás`;
};

/** Linha de apoio abaixo da nota: de onde ela vem. */
export const textoDaMedia = (
  perfil: Pick<PerfilMotorista, "nota_base" | "avaliacoes" | "janela_da_media">,
) => {
  if (perfil.nota_base) {
    return "Nota inicial: você ainda não recebeu avaliações dos passageiros";
  }

  if (perfil.avaliacoes >= perfil.janela_da_media) {
    return `Média das ${perfil.janela_da_media} últimas avaliações de corridas`;
  }

  return `Média de ${perfil.avaliacoes} ${
    perfil.avaliacoes === 1 ? "avaliação" : "avaliações"
  } de corridas`;
};

/** Primeira letra do nome, para o avatar de quem avaliou (a foto do passageiro não é exposta). */
export const inicialDoNome = (nome: string) =>
  nome.trim().charAt(0).toUpperCase() || "?";

/** "(69) 99999-0001" (celular) ou "(69) 9999-0001" (fixo); serve de máscara enquanto digita. */
export const formatarTelefone = (texto: string) => {
  const numeros = texto.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros;

  const ddd = numeros.slice(0, 2);
  const resto = numeros.slice(2);
  const corte = numeros.length === 11 ? 5 : 4;

  return resto.length <= corte
    ? `(${ddd}) ${resto}`
    : `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
};

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Busca da lista de estados e cidades: "sao joao" acha "São João"; vazio acha tudo. */
export const combinaComBusca = (busca: string, ...textos: string[]) => {
  const termo = semAcento(busca);
  return termo === "" || textos.some((texto) => semAcento(texto).includes(termo));
};
