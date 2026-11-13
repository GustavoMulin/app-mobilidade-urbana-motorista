// Toda conta nova começa com nota 5,0 e aparece com o selo "Novo usuário" até
// ter corridas suficientes (o limite vem do servidor, no campo `novo`). A nota
// passa a ser a média das avaliações reais quando chega a primeira.

/** "4,94" ou "5,00"; sem nota (servidor antigo) devolve null. */
export function textoDaNota(nota: number | null | undefined) {
  return typeof nota === "number" ? nota.toFixed(2).replace(".", ",") : null;
}

/** "Novo usuário" para quem tem poucas corridas; senão "421 corridas". */
export function textoDeCorridasDoPassageiro(
  corridas: number | null | undefined,
  novo?: boolean,
) {
  const total = corridas ?? 0;

  // `novo` vem do servidor; sem ele (servidor antigo) vale quem nunca viajou
  if (novo ?? total === 0) return "Novo usuário";

  return `${total} ${total === 1 ? "corrida" : "corridas"}`;
}

// "4,94★ · 421 corridas" como no 99, ou "5,00★ · Novo usuário"
export function reputacaoPassageiro(
  nota: number | null | undefined,
  corridas: number | null | undefined,
  novo?: boolean,
) {
  const total = corridas ?? 0;
  const notaTexto = textoDaNota(nota);

  if (novo) return `${notaTexto ?? "5,00"}★ · Novo usuário`;

  if (notaTexto !== null) {
    return `${notaTexto}★ · ${textoDeCorridasDoPassageiro(total, novo)}`;
  }

  // servidor antigo: sem nota, só o que dá para afirmar
  return total === 0
    ? "Primeira corrida no app"
    : `Sem avaliações · ${total} ${total === 1 ? "corrida" : "corridas"}`;
}
