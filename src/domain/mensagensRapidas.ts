import AsyncStorage from "@react-native-async-storage/async-storage";

// Balões de um toque fora do chat, quando o motorista chega ao embarque
export const MENSAGENS_DA_CHEGADA = [
  "Cheguei! Estou no local de embarque.",
  "Pode vir, estou te aguardando.",
  "Não te encontrei. Onde você está?",
];

// respostas fixas dentro do chat; as do motorista vêm depois delas
export const MENSAGENS_RAPIDAS_PADRAO = [
  "Estou a caminho",
  "Cheguei ao embarque",
  "Estou preso no trânsito",
];

export const LIMITE_MENSAGENS_PERSONALIZADAS = 8;
export const TAMANHO_MAXIMO_MENSAGEM_RAPIDA = 80;

// ficam no aparelho, por conta: sair da conta não apaga
const chave = (userId: number) => `@mensagens_rapidas:${userId}`;

export async function carregarMensagensRapidas(
  userId: number,
): Promise<string[]> {
  try {
    const salvo = JSON.parse(
      (await AsyncStorage.getItem(chave(userId))) ?? "[]",
    );
    return Array.isArray(salvo)
      ? salvo.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function salvarMensagensRapidas(
  userId: number,
  mensagens: string[],
): Promise<void> {
  await AsyncStorage.setItem(chave(userId), JSON.stringify(mensagens));
}

const normalizar = (texto: string) =>
  texto.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

// devolve o motivo quando não dá para adicionar, ou null quando pode
export function motivoParaNaoAdicionar(
  texto: string,
  personalizadas: string[],
): string | null {
  const limpo = texto.trim();
  if (limpo === "") return "Escreva a mensagem.";
  if (limpo.length > TAMANHO_MAXIMO_MENSAGEM_RAPIDA) {
    return `Use até ${TAMANHO_MAXIMO_MENSAGEM_RAPIDA} caracteres.`;
  }
  if (
    [...MENSAGENS_RAPIDAS_PADRAO, ...personalizadas].some(
      (item) => normalizar(item) === normalizar(limpo),
    )
  ) {
    return "Essa mensagem já está na lista.";
  }
  if (personalizadas.length >= LIMITE_MENSAGENS_PERSONALIZADAS) {
    return `Você pode ter até ${LIMITE_MENSAGENS_PERSONALIZADAS} mensagens suas. Remova uma para adicionar outra.`;
  }
  return null;
}
