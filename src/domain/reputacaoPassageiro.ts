// "4,94★ · 421 corridas" como no 99. Passageiro sem avaliação aparecia como
// "0,00★", o que parece nota ruim. O servidor só manda a média depois de 20
// corridas; antes disso aparece só quantas corridas a pessoa já fez.
export function reputacaoPassageiro(
  nota: number | null | undefined,
  corridas: number | null | undefined,
) {
  const total = corridas ?? 0;
  const textoCorridas = `${total} ${total === 1 ? "corrida" : "corridas"}`;

  if (typeof nota === "number") {
    return `${nota.toFixed(2).replace(".", ",")}★ · ${textoCorridas}`;
  }

  return total === 0 ? "Primeira corrida no app" : `Novo · ${textoCorridas}`;
}
