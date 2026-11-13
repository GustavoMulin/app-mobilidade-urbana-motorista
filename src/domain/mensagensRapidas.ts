import AsyncStorage from "@react-native-async-storage/async-storage";

export type EtapaDaMensagem = "aceita" | "motorista_chegou";

export type MensagensPorEtapa = Record<EtapaDaMensagem, string[]>;

export const ETAPAS_DAS_MENSAGENS: {
  etapa: EtapaDaMensagem;
  rotulo: string;
  apoio: string;
}[] = [
  {
    etapa: "aceita",
    rotulo: "No aceite",
    apoio:
      "Depois de aceitar, enquanto você vai ao embarque. As primeiras aparecem no painel da tela.",
  },
  {
    etapa: "motorista_chegou",
    rotulo: "No embarque",
    apoio:
      "Quando você chega e espera o passageiro. As primeiras aparecem no painel da tela.",
  },
];

// as duas padrão do embarque: o motorista pode editar, apagar ou reordenar
export const MENSAGENS_DA_CHEGADA = [
  "Cheguei! Estou no local de embarque.",
  "Pode vir, estou te aguardando.",
];

export const MENSAGENS_PADRAO_POR_ETAPA: MensagensPorEtapa = {
  aceita: ["Estou a caminho!"],
  motorista_chegou: MENSAGENS_DA_CHEGADA,
};

// quantas mensagens rápidas aparecem de uma vez, sem rolar para o lado
export const MENSAGENS_RAPIDAS_VISIVEIS = 2;

export const LIMITE_MENSAGENS_POR_ETAPA = 5;

export const TAMANHO_MAXIMO_MENSAGEM_RAPIDA = 80;

// ficam no aparelho, por conta: sair da conta não apaga
const chave = (userId: number) => `@mensagens_por_etapa:${userId}`;

const copiarPadrao = (): MensagensPorEtapa => ({
  aceita: [...MENSAGENS_PADRAO_POR_ETAPA.aceita],
  motorista_chegou: [...MENSAGENS_PADRAO_POR_ETAPA.motorista_chegou],
});

const listaValida = (valor: unknown, padrao: string[]): string[] =>
  Array.isArray(valor)
    ? valor
        .filter((item): item is string => typeof item === "string")
        .slice(0, LIMITE_MENSAGENS_POR_ETAPA)
    : padrao;

export async function carregarMensagensPorEtapa(
  userId: number,
): Promise<MensagensPorEtapa> {
  const padrao = copiarPadrao();
  try {
    const salvo = JSON.parse(
      (await AsyncStorage.getItem(chave(userId))) ?? "{}",
    );
    return {
      aceita: listaValida(salvo?.aceita, padrao.aceita),
      motorista_chegou: listaValida(
        salvo?.motorista_chegou,
        padrao.motorista_chegou,
      ),
    };
  } catch {
    return padrao;
  }
}

export async function salvarMensagensPorEtapa(
  userId: number,
  mensagens: MensagensPorEtapa,
): Promise<void> {
  await AsyncStorage.setItem(chave(userId), JSON.stringify(mensagens));
}

export const mensagensPadrao = copiarPadrao;

export const limparMensagem = (texto: string) =>
  texto.trim().replace(/\s+/g, " ");

const normalizar = (texto: string) =>
  limparMensagem(texto).toLocaleLowerCase("pt-BR");

// devolve o motivo quando não dá para salvar, ou null quando pode; ao editar,
// `indiceEditado` tira a própria mensagem da checagem de repetida e de limite
export function motivoParaNaoSalvar(
  texto: string,
  lista: string[],
  indiceEditado?: number,
): string | null {
  const limpo = limparMensagem(texto);
  if (limpo === "") return "Escreva a mensagem.";
  if (limpo.length > TAMANHO_MAXIMO_MENSAGEM_RAPIDA) {
    return `Use até ${TAMANHO_MAXIMO_MENSAGEM_RAPIDA} caracteres.`;
  }
  const outras = lista.filter((_, indice) => indice !== indiceEditado);
  if (outras.some((item) => normalizar(item) === normalizar(limpo))) {
    return "Essa mensagem já está na lista.";
  }
  if (
    indiceEditado === undefined &&
    lista.length >= LIMITE_MENSAGENS_POR_ETAPA
  ) {
    return `Cada etapa aceita até ${LIMITE_MENSAGENS_POR_ETAPA} mensagens. Apague uma para criar outra.`;
  }
  return null;
}
